import io
import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from starlette.requests import Request

from api import index
from score_backend.game_logic import NUMBER_LEVELS


class GameApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database_path = os.path.join(self.temporary_directory.name, "scores.sqlite3")
        self.environment = patch.dict(
            os.environ,
            {"GAME_DATABASE_PATH": self.database_path},
            clear=False,
        )
        self.environment.start()
        index._store = None
        self.client = TestClient(index.app)

    def tearDown(self):
        self.client.close()
        index._store = None
        self.environment.stop()
        self.temporary_directory.cleanup()

    def post_as(self, uid, payload):
        with patch.object(index, "require_uid", return_value=uid):
            return self.client.post("/api", json=payload)

    def get_as(self, uid, path="/api/dashboard"):
        with patch.object(index, "require_uid", return_value=uid):
            return self.client.get(path)

    def create_player(self, uid, name):
        response = self.post_as(uid, {"operation": "profile", "name": name})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def load_game_state(self, session_id):
        connection = sqlite3.connect(self.database_path)
        try:
            row = connection.execute(
                "SELECT state_json FROM game_sessions WHERE id = ?",
                (session_id,),
            ).fetchone()
        finally:
            connection.close()
        return json.loads(row[0])

    def test_api_verifies_firebase_token_without_service_account(self):
        request = Request({
            "type": "http",
            "method": "POST",
            "path": "/api",
            "headers": [(b"authorization", b"Bearer signed-token")],
            "query_string": b"",
        })
        with (
            patch.dict(os.environ, {"FIREBASE_API_KEY": "public-api-key"}),
            patch.object(index, "urlopen", return_value=io.BytesIO(
                b'{"users":[{"localId":"verified-player"}]}',
            )) as urlopen,
        ):
            uid = index.require_uid(request)

        self.assertEqual(uid, "verified-player")
        self.assertIn("identitytoolkit.googleapis.com", urlopen.call_args.args[0].full_url)

    def test_health_endpoint_uses_python_sqlite_tracker(self):
        response = self.client.get("/api")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ready": True, "storage": "sqlite"})

    def test_profile_names_are_unique_and_dashboard_reads_only_own_profile(self):
        first = self.create_player("player-1", "first player")
        self.assertEqual(first["points"], 0)
        self.assertEqual(self.post_as(
            "player-2",
            {"operation": "profile", "name": "first player"},
        ).status_code, 409)

        dashboard = self.get_as("player-1")
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.json()["players"], [{
            "id": "player-1",
            "name": "first player",
            "points": 0,
            "gamesPlayed": 0,
            "wins": 0,
        }])

    def test_dashboard_query_route_is_available_through_api_root(self):
        self.create_player("player-1", "first player")
        response = self.get_as("player-1", "/api?view=dashboard")

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["players"][0]["id"], "player-1")

    def test_dashboard_requires_authentication_and_hides_other_players(self):
        self.create_player("player-1", "first player")
        self.create_player("player-2", "second player")

        self.assertEqual(self.client.get("/api/dashboard").status_code, 401)

        dashboard = self.get_as("player-1").json()
        self.assertEqual([player["id"] for player in dashboard["players"]], ["player-1"])
        self.assertEqual(dashboard["recentRecords"], [])

    def test_verified_win_and_loss_update_sqlite_dashboard_and_records(self):
        self.create_player("player-1", "player one")
        self.create_player("player-2", "player two")

        memory_start = self.post_as(
            "player-1",
            {"operation": "start", "game": "memory"},
        ).json()
        memory = self.load_game_state(memory_start["sessionId"])

        for pair in range(6):
            first, second = [
                index for index, card in enumerate(memory["deck"])
                if card == pair
            ]
            result = self.post_as("player-1", {
                "operation": "action",
                "sessionId": memory_start["sessionId"],
                "action": {"type": "memoryTurn", "first": first, "second": second},
            }).json()

        self.assertEqual(result["scoreDelta"], 10)
        self.assertEqual(result["outcome"], "win")
        self.assertEqual(self.post_as("player-1", {
            "operation": "action",
            "sessionId": memory_start["sessionId"],
            "action": {"type": "memoryTurn", "first": 0, "second": 1},
        }).status_code, 409)

        other_player_start = self.post_as(
            "player-2",
            {"operation": "start", "game": "number-guess"},
        ).json()
        other_player_game = self.load_game_state(other_player_start["sessionId"])
        self.assertEqual(self.post_as("player-2", {
            "operation": "action",
            "sessionId": other_player_start["sessionId"],
            "action": {"type": "numberGuess", "guess": other_player_game["secret"]},
        }).json()["scoreDelta"], 10)

        number_start = self.post_as("player-1", {
            "operation": "start",
            "game": "number-guess",
            "options": {"difficulty": "Easy"},
        }).json()
        number = self.load_game_state(number_start["sessionId"])
        wrong_guess = 1 if number["secret"] != 1 else 2
        for _ in range(NUMBER_LEVELS["Easy"]["attempts"]):
            response = self.post_as("player-1", {
                "operation": "action",
                "sessionId": number_start["sessionId"],
                "action": {"type": "numberGuess", "guess": wrong_guess},
            })

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["scoreDelta"], -10)
        self.assertEqual(response.json()["outcome"], "loss")
        dashboard = self.get_as("player-1").json()
        self.assertEqual([player["id"] for player in dashboard["players"]], ["player-1"])
        player = dashboard["players"][0]
        self.assertEqual(player["points"], 0)
        self.assertEqual(player["gamesPlayed"], 2)
        self.assertEqual(player["wins"], 1)
        player_records = [
            record for record in dashboard["recentRecords"]
            if record["playerId"] == "player-1"
        ]
        self.assertEqual([record["pointsDelta"] for record in player_records], [-10, 10])
        self.assertEqual([record["pointsAfter"] for record in player_records], [0, 10])
        other_player_dashboard = self.get_as("player-2").json()
        self.assertEqual([player["id"] for player in other_player_dashboard["players"]], ["player-2"])
        self.assertTrue(all(
            record["playerId"] == "player-2"
            for record in other_player_dashboard["recentRecords"]
        ))

    def test_start_requires_a_player_profile(self):
        response = self.post_as("player-1", {
            "operation": "start",
            "game": "memory",
        })
        self.assertEqual(response.status_code, 409)
        self.assertIn("Create a player profile", response.json()["detail"])

    def test_draw_adds_a_record_without_changing_points(self):
        self.create_player("player-1", "player one")
        session_id = self.post_as(
            "player-1",
            {"operation": "start", "game": "tic-tac-toe"},
        ).json()["sessionId"]
        with patch(
            "score_backend.store.apply_action",
            return_value=({"board": ["X"] * 9}, "draw", {"draw": True}),
        ):
            response = self.post_as("player-1", {
                "operation": "action",
                "sessionId": session_id,
                "action": {"type": "ticTacToeMove", "index": 0},
            })

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["scoreDelta"], 0)
        dashboard = self.get_as("player-1").json()
        self.assertEqual(dashboard["players"][0]["points"], 0)
        self.assertEqual(dashboard["players"][0]["gamesPlayed"], 1)
        self.assertEqual(dashboard["recentRecords"][0]["outcome"], "draw")
        self.assertEqual(dashboard["recentRecords"][0]["pointsDelta"], 0)

    def test_missing_authentication_api_key_is_reported(self):
        request = Request({
            "type": "http",
            "method": "POST",
            "path": "/api",
            "headers": [(b"authorization", b"Bearer signed-token")],
            "query_string": b"",
        })
        with patch.dict(
            os.environ,
            {"FIREBASE_API_KEY": "", "VITE_FIREBASE_API_KEY": ""},
        ):
            with self.assertRaises(index.HTTPException) as error:
                index.require_uid(request)
        self.assertEqual(error.exception.status_code, 503)
        self.assertIn("Scores were not changed", error.exception.detail)

    def test_serverless_runtime_requires_persistent_database(self):
        index._store = None
        with patch.dict(os.environ, {"VERCEL": "1"}, clear=False):
            with patch.object(index, "require_uid", return_value="player-1"):
                response = self.client.get("/api/dashboard")
        self.assertEqual(response.status_code, 503)
        self.assertIn("persistent Postgres database", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
