import json
import re
import secrets
import sqlite3
import string
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Generator

import psycopg
from psycopg.rows import dict_row

from score_backend.game_logic import GameError, apply_action, create_game_state, score_delta

SESSION_LIFETIME = timedelta(hours=24)
SESSION_ID_CHARACTERS = string.ascii_letters + string.digits
MAX_SAFE_INTEGER = 9_007_199_254_740_991


class ProfileExistsError(ValueError):
    def __init__(self):
        super().__init__("This Google account already has a player profile.")


class NameTakenError(ValueError):
    def __init__(self):
        super().__init__("That name is already in use. Choose another player name.")


class GameStore:
    def __init__(self, database_path: str):
        self.is_postgres = database_path.startswith(("postgres://", "postgresql://"))
        if self.is_postgres:
            self.database_path = database_path
        else:
            self.database_path = str(Path(database_path).resolve())
            Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        with self._connection() as connection:
            schema = """
                CREATE TABLE IF NOT EXISTS players (
                    uid TEXT PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    points INTEGER NOT NULL DEFAULT 0,
                    games_played INTEGER NOT NULL DEFAULT 0,
                    wins INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS game_sessions (
                    id TEXT PRIMARY KEY,
                    uid TEXT NOT NULL REFERENCES players(uid),
                    game TEXT NOT NULL,
                    state_json TEXT NOT NULL,
                    finished INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS game_records (
                    id TEXT PRIMARY KEY,
                    player_id TEXT NOT NULL REFERENCES players(uid),
                    player_name TEXT NOT NULL,
                    game TEXT NOT NULL,
                    outcome TEXT NOT NULL,
                    points_delta INTEGER NOT NULL,
                    points_after INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS game_records_created_at
                    ON game_records(created_at DESC);
                CREATE TABLE IF NOT EXISTS guest_game_sessions (
                    id TEXT PRIMARY KEY,
                    visitor_id TEXT NOT NULL,
                    game TEXT NOT NULL,
                    state_json TEXT NOT NULL,
                    finished INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS guest_game_records (
                    id TEXT PRIMARY KEY,
                    visitor_id TEXT NOT NULL,
                    game TEXT NOT NULL,
                    outcome TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS guest_game_records_created_at
                    ON guest_game_records(created_at DESC);
                CREATE TABLE IF NOT EXISTS course_progress (
                    uid TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    progress_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_active_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS course_progress_last_active
                    ON course_progress(last_active_at DESC);
                """
            if self.is_postgres:
                for statement in schema.split(";"):
                    if statement.strip():
                        connection.execute(statement)
            else:
                connection.executescript(schema)

    def _connect(self):
        if self.is_postgres:
            return psycopg.connect(self.database_path, row_factory=dict_row)
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    @contextmanager
    def _connection(self) -> Generator[Any, None, None]:
        connection = self._connect()
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def _execute(self, connection, query: str, parameters: tuple = ()):
        if self.is_postgres:
            query = query.replace("?", "%s")
        return connection.execute(query, parameters)

    def _begin_write(self, connection) -> None:
        if not self.is_postgres:
            self._execute(connection, "BEGIN IMMEDIATE")

    def save_course_progress(
        self,
        uid: str,
        email: str,
        display_name: str,
        progress: dict[str, Any],
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        with self._connection() as connection:
            self._execute(
                connection,
                """
                INSERT INTO course_progress
                    (uid, email, display_name, progress_json, created_at,
                     updated_at, last_active_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(uid) DO UPDATE SET
                    email = excluded.email,
                    display_name = excluded.display_name,
                    progress_json = excluded.progress_json,
                    updated_at = excluded.updated_at,
                    last_active_at = excluded.last_active_at
                """,
                (uid, email, display_name, json.dumps(progress), now, now, now),
            )
        return self.get_course_progress(uid)

    def get_course_progress(self, uid: str) -> dict[str, Any] | None:
        with self._connection() as connection:
            row = self._execute(
                connection,
                """
                SELECT uid, email, display_name, progress_json, created_at,
                       updated_at, last_active_at
                FROM course_progress
                WHERE uid = ?
                """,
                (uid,),
            ).fetchone()
        return self._course_progress_record(row) if row else None

    def get_all_course_progress(self) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = self._execute(
                connection,
                """
                SELECT uid, email, display_name, progress_json, created_at,
                       updated_at, last_active_at
                FROM course_progress
                ORDER BY last_active_at DESC
                """,
            )
            return [self._course_progress_record(row) for row in rows]

    @staticmethod
    def _course_progress_record(row) -> dict[str, Any]:
        return {
            "uid": row["uid"],
            "email": row["email"],
            "displayName": row["display_name"],
            "progress": json.loads(row["progress_json"]),
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
            "lastActiveAt": row["last_active_at"],
        }

    def create_player(self, uid: str, raw_name: object) -> dict[str, Any]:
        if not isinstance(raw_name, str):
            raise GameError(400, "Invalid player name.")
        name = " ".join(raw_name.strip().lower().split())
        if len(name) < 2 or len(name) > 24 or not re.fullmatch(r"[a-z0-9]+(?: [a-z0-9]+)*", name):
            raise GameError(
                400,
                "Use 2–24 lowercase letters or numbers, separated by single spaces.",
            )

        try:
            with self._connection() as connection:
                self._execute(
                    connection,
                    """
                    INSERT INTO players (uid, name, created_at)
                    VALUES (?, ?, ?)
                    """,
                    (uid, name, datetime.now(timezone.utc).isoformat()),
                )
        except (sqlite3.IntegrityError, psycopg.IntegrityError) as error:
            with self._connection() as connection:
                if self._execute(
                    connection, "SELECT 1 FROM players WHERE uid = ?", (uid,),
                ).fetchone():
                    raise ProfileExistsError() from error
                raise NameTakenError() from error

        return {"id": uid, "name": name, "points": 0, "gamesPlayed": 0, "wins": 0}

    def get_dashboard(self) -> dict[str, Any]:
        with self._connection() as connection:
            players = [
                {
                    "id": row["uid"],
                    "name": row["name"],
                    "points": row["points"],
                    "gamesPlayed": row["games_played"],
                    "wins": row["wins"],
                }
                for row in self._execute(
                    connection,
                    """
                    SELECT uid, name, points, games_played, wins
                    FROM players
                    ORDER BY points DESC, wins DESC, games_played DESC, name ASC
                    """
                )
            ]
            weekly_players = [
                {
                    "id": row["player_id"],
                    "name": row["player_name"],
                    "points": row["weekly_points"],
                    "gamesPlayed": row["games_played"],
                    "wins": row["wins"],
                    "lastActive": row["last_active"],
                }
                for row in self._execute(
                    connection,
                    """
                    SELECT player_id, player_name,
                           SUM(points_delta) AS weekly_points,
                           COUNT(*) AS games_played,
                           SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) AS wins,
                           MAX(created_at) AS last_active
                    FROM game_records
                    WHERE created_at >= ?
                    GROUP BY player_id, player_name
                    ORDER BY weekly_points DESC, wins DESC,
                             games_played DESC, player_name ASC
                    LIMIT 10
                    """,
                    ((datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),),
                )
            ]
            activity = self._execute(
                connection,
                """
                SELECT COUNT(*) AS total_games,
                       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS weekly_games
                FROM (
                    SELECT created_at FROM game_records
                    UNION ALL
                    SELECT created_at FROM guest_game_records
                ) AS completed_games
                """,
                ((datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),),
            ).fetchone()
        return {
            "players": players,
            "weeklyPlayers": weekly_players,
            "activity": {
                "totalGames": activity["total_games"],
                "gamesThisWeek": activity["weekly_games"] or 0,
            },
        }

    def get_player_records(self, uid: str) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = self._execute(
                connection,
                """
                SELECT game, outcome, points_delta, points_after, created_at
                FROM game_records
                WHERE player_id = ?
                ORDER BY created_at DESC
                LIMIT 10
                """,
                (uid,),
            )
            return [
                {
                    "game": row["game"],
                    "outcome": row["outcome"],
                    "pointsDelta": row["points_delta"],
                    "pointsAfter": row["points_after"],
                    "createdAt": row["created_at"],
                }
                for row in rows
            ]

    def get_guest_records(self, visitor_id: str) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = self._execute(
                connection,
                """
                SELECT game, outcome, created_at
                FROM guest_game_records
                WHERE visitor_id = ?
                ORDER BY created_at DESC
                LIMIT 10
                """,
                (visitor_id,),
            )
            return [
                {
                    "game": row["game"],
                    "outcome": row["outcome"],
                    "pointsDelta": None,
                    "pointsAfter": None,
                    "createdAt": row["created_at"],
                }
                for row in rows
            ]

    def start_game(self, uid: str, game: object, options: object = None) -> str:
        state = create_game_state(game, options)
        now = datetime.now(timezone.utc)
        session_id = "".join(secrets.choice(SESSION_ID_CHARACTERS) for _ in range(20))
        with self._connection() as connection:
            self._begin_write(connection)
            if not self._execute(
                connection, "SELECT 1 FROM players WHERE uid = ?", (uid,),
            ).fetchone():
                raise GameError(409, "Create a player profile before saving scores.")
            self._execute(
                connection,
                """
                INSERT INTO game_sessions
                    (id, uid, game, state_json, finished, created_at, expires_at)
                VALUES (?, ?, ?, ?, 0, ?, ?)
                """,
                (
                    session_id,
                    uid,
                    state["game"],
                    json.dumps(state),
                    now.isoformat(),
                    (now + SESSION_LIFETIME).isoformat(),
                ),
            )
        return session_id

    def start_guest_game(self, visitor_id: str, game: object, options: object = None) -> str:
        state = create_game_state(game, options)
        now = datetime.now(timezone.utc)
        session_id = "".join(secrets.choice(SESSION_ID_CHARACTERS) for _ in range(20))
        with self._connection() as connection:
            self._begin_write(connection)
            self._execute(
                connection,
                """
                INSERT INTO guest_game_sessions
                    (id, visitor_id, game, state_json, finished, created_at, expires_at)
                VALUES (?, ?, ?, ?, 0, ?, ?)
                """,
                (
                    session_id,
                    visitor_id,
                    state["game"],
                    json.dumps(state),
                    now.isoformat(),
                    (now + SESSION_LIFETIME).isoformat(),
                ),
            )
        return session_id

    def apply_game_action(
        self,
        uid: str,
        session_id: object,
        action: object,
    ) -> dict[str, Any]:
        if not isinstance(session_id, str) or not re.fullmatch(r"[A-Za-z0-9]{20}", session_id):
            raise GameError(400, "Invalid game session.")

        with self._connection() as connection:
            self._begin_write(connection)
            row = self._execute(
                connection,
                "SELECT * FROM game_sessions WHERE id = ?"
                + (" FOR UPDATE" if self.is_postgres else ""),
                (session_id,),
            ).fetchone()
            if row is None:
                raise GameError(404, "Game session not found.")
            if row["uid"] != uid:
                raise GameError(403, "This is not your game session.")
            if row["finished"]:
                raise GameError(409, "This game has already ended.")
            expires_at = datetime.fromisoformat(row["expires_at"])
            if expires_at <= datetime.now(timezone.utc):
                raise GameError(410, "This game session expired. Start a new game.")

            session = json.loads(row["state_json"])
            updated_session, outcome, result = apply_action(session, action)
            score_change = score_delta(outcome) if outcome else 0

            if outcome:
                player = self._execute(
                    connection,
                    "SELECT * FROM players WHERE uid = ?"
                    + (" FOR UPDATE" if self.is_postgres else ""),
                    (uid,),
                ).fetchone()
                if player is None:
                    raise GameError(409, "The player profile no longer exists.")
                points = player["points"] + score_change
                games_played = player["games_played"] + 1
                wins = player["wins"] + (1 if outcome == "win" else 0)
                if any(
                    abs(value) > MAX_SAFE_INTEGER
                    for value in (points, games_played, wins)
                ):
                    raise GameError(409, "The player score limit has been reached.")

                created_at = datetime.now(timezone.utc).isoformat()
                self._execute(
                    connection,
                    """
                    UPDATE players
                    SET points = ?, games_played = ?, wins = ?
                    WHERE uid = ?
                    """,
                    (points, games_played, wins, uid),
                )
                self._execute(
                    connection,
                    """
                    INSERT INTO game_records
                        (id, player_id, player_name, game, outcome,
                         points_delta, points_after, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        session_id,
                        uid,
                        player["name"],
                        row["game"],
                        outcome,
                        score_change,
                        points,
                        created_at,
                    ),
                )

            self._execute(
                connection,
                """
                UPDATE game_sessions
                SET state_json = ?, finished = ?
                WHERE id = ?
                """,
                (json.dumps(updated_session), int(outcome is not None), session_id),
            )

        return {
            **result,
            "outcome": outcome,
            "scoreDelta": score_change,
        }

    def apply_guest_game_action(
        self,
        visitor_id: str,
        session_id: object,
        action: object,
    ) -> dict[str, Any]:
        if not isinstance(session_id, str) or not re.fullmatch(r"[A-Za-z0-9]{20}", session_id):
            raise GameError(400, "Invalid game session.")

        with self._connection() as connection:
            self._begin_write(connection)
            row = self._execute(
                connection,
                "SELECT * FROM guest_game_sessions WHERE id = ?"
                + (" FOR UPDATE" if self.is_postgres else ""),
                (session_id,),
            ).fetchone()
            if row is None:
                raise GameError(404, "Game session not found.")
            if row["visitor_id"] != visitor_id:
                raise GameError(403, "This is not your game session.")
            if row["finished"]:
                raise GameError(409, "This game has already ended.")
            expires_at = datetime.fromisoformat(row["expires_at"])
            if expires_at <= datetime.now(timezone.utc):
                raise GameError(410, "This game session expired. Start a new game.")

            updated_session, outcome, result = apply_action(
                json.loads(row["state_json"]), action,
            )
            if outcome:
                self._execute(
                    connection,
                    """
                    INSERT INTO guest_game_records
                        (id, visitor_id, game, outcome, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        session_id,
                        visitor_id,
                        row["game"],
                        outcome,
                        datetime.now(timezone.utc).isoformat(),
                    ),
                )

            self._execute(
                connection,
                """
                UPDATE guest_game_sessions
                SET state_json = ?, finished = ?
                WHERE id = ?
                """,
                (json.dumps(updated_session), int(outcome is not None), session_id),
            )

        return {
            **result,
            "outcome": outcome,
            "scoreDelta": 0,
        }
