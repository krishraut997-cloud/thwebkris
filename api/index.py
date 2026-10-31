import json
import os
import re
import sqlite3
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import psycopg

from score_backend.game_logic import GameError
from score_backend.store import GameStore, NameTakenError, ProfileExistsError

app = FastAPI()
_store: GameStore | None = None
DATABASE_ERRORS = (sqlite3.Error, psycopg.Error)
COURSE_ADMIN_EMAIL = "emeye1911@gmail.com"
COURSE_PROGRESS_FIELDS = {
    "completedLessons",
    "passedExercises",
    "attempts",
    "hintsUsed",
    "firstTryPasses",
    "earned",
    "xp",
    "level",
    "runs",
    "activeDays",
    "visitedLevels",
    "currentLesson",
}
allowed_origins = [
    "https://krishraut997-cloud.github.io",
    *[
        origin.strip()
        for origin in os.environ.get("SCORE_API_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ],
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def get_store() -> GameStore:
    global _store
    if _store is not None:
        return _store

    database_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if os.environ.get("VERCEL") and not database_url:
        raise HTTPException(
            status_code=503,
            detail=(
                "The Python score tracker needs a persistent Postgres database. "
                "Connect the production database to this deployment."
            ),
        )

    database_path = database_url or os.environ.get("GAME_DATABASE_PATH")
    if not database_path:
        database_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data",
            "game-tracker.sqlite3",
        )

    try:
        _store = GameStore(database_path)
    except (OSError, *DATABASE_ERRORS) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the Python game database.",
        ) from error
    return _store


def require_identity(request: Request) -> dict[str, Any]:
    authorization = request.headers.get("authorization", "")
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Sign in to save leaderboard scores.")

    api_key = os.environ.get("FIREBASE_API_KEY") or os.environ.get("VITE_FIREBASE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Firebase sign-in verification is not configured. Scores were not changed.",
        )

    verification_request = UrlRequest(
        f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}",
        data=json.dumps({"idToken": token.strip()}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(verification_request, timeout=10) as response:
            identity = json.loads(response.read())
    except HTTPError as error:
        try:
            error_body = json.loads(error.read())
        except (json.JSONDecodeError, UnicodeDecodeError):
            error_body = {}
        error_code = (
            error_body.get("error", {}).get("message")
            if isinstance(error_body, dict)
            and isinstance(error_body.get("error"), dict)
            else None
        )
        if error_code in {
            "INVALID_ID_TOKEN",
            "TOKEN_EXPIRED",
            "USER_DISABLED",
            "USER_NOT_FOUND",
        }:
            raise HTTPException(status_code=401, detail="Your sign-in expired. Sign in again.") from error
        raise HTTPException(
            status_code=503,
            detail="Firebase could not verify your sign-in. Please try again.",
        ) from error
    except (URLError, TimeoutError) as error:
        raise HTTPException(
            status_code=503,
            detail="Firebase sign-in verification is temporarily unavailable.",
        ) from error
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise HTTPException(
            status_code=503,
            detail="Firebase returned an invalid sign-in response.",
        ) from error

    users = identity.get("users")
    if (
        not isinstance(users, list)
        or not users
        or not isinstance(users[0], dict)
        or not isinstance(users[0].get("localId"), str)
    ):
        raise HTTPException(status_code=401, detail="Your sign-in could not be verified.")
    return users[0]


def require_uid(request: Request) -> str:
    return require_identity(request)["localId"]


def require_course_admin(request: Request) -> dict[str, Any]:
    identity = require_identity(request)
    if (
        identity.get("emailVerified") is not True
        or not isinstance(identity.get("email"), str)
        or identity["email"].lower() != COURSE_ADMIN_EMAIL
    ):
        raise HTTPException(status_code=403, detail="Only the course owner can view learner progress.")
    return identity


def validate_course_progress(progress: object) -> dict[str, Any]:
    if not isinstance(progress, dict) or set(progress) != COURSE_PROGRESS_FIELDS:
        raise HTTPException(status_code=400, detail="Course progress has an invalid shape.")

    list_limits = {
        "completedLessons": 36,
        "firstTryPasses": 72,
        "earned": 30,
        "activeDays": 14,
        "visitedLevels": 4,
    }
    for field, limit in list_limits.items():
        values = progress[field]
        if (
            not isinstance(values, list)
            or len(values) > limit
            or any(not isinstance(value, str) or not value or len(value) > 120 for value in values)
        ):
            raise HTTPException(status_code=400, detail=f"Course progress field '{field}' is invalid.")
    if any(not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day) for day in progress["activeDays"]):
        raise HTTPException(status_code=400, detail="Course progress field 'activeDays' is invalid.")

    for field in ("passedExercises", "hintsUsed"):
        values = progress[field]
        if (
            not isinstance(values, dict)
            or len(values) > 72
            or any(
                not isinstance(key, str)
                or not key
                or len(key) > 120
                or value is not True
                for key, value in values.items()
            )
        ):
            raise HTTPException(status_code=400, detail=f"Course progress field '{field}' is invalid.")

    attempts = progress["attempts"]
    if (
        not isinstance(attempts, dict)
        or len(attempts) > 72
        or any(
            not isinstance(key, str)
            or not key
            or len(key) > 120
            or isinstance(value, bool)
            or not isinstance(value, int)
            or value < 0
            or value > 1_000_000
            for key, value in attempts.items()
        )
    ):
        raise HTTPException(status_code=400, detail="Course progress field 'attempts' is invalid.")

    for field, minimum in (("xp", 0), ("level", 1), ("runs", 0)):
        value = progress[field]
        if isinstance(value, bool) or not isinstance(value, int) or value < minimum or value > 1_000_000_000:
            raise HTTPException(status_code=400, detail=f"Course progress field '{field}' is invalid.")

    if (
        not isinstance(progress["currentLesson"], str)
        or not progress["currentLesson"]
        or len(progress["currentLesson"]) > 120
    ):
        raise HTTPException(status_code=400, detail="Course progress field 'currentLesson' is invalid.")
    return progress


def require_visitor_id(visitor_id: object) -> str:
    if not isinstance(visitor_id, str) or not re.fullmatch(r"[a-f0-9]{32}", visitor_id):
        raise HTTPException(status_code=400, detail="Invalid guest tracker ID.")
    return visitor_id


@app.get("/")
@app.get("/api")
def health_check(request: Request):
    view = request.query_params.get("view")
    if view == "dashboard":
        return dashboard()
    if view == "my-records":
        return player_records(request)
    if view == "my-course-progress":
        return my_course_progress(request)
    if view == "admin-course-progress":
        return all_course_progress(request)
    if view == "activity":
        raise HTTPException(status_code=404, detail="Recent activity is no longer available.")

    try:
        get_store()
    except HTTPException as error:
        return {"ready": False, "detail": error.detail}
    return {
        "ready": True,
        "storage": "postgres" if get_store().is_postgres else "sqlite",
    }


@app.get("/api/dashboard")
@app.get("/dashboard")
def dashboard():
    try:
        return get_store().get_dashboard()
    except (OSError, *DATABASE_ERRORS) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not read the Python game database.",
        ) from error


@app.get("/api/me/records")
def player_records(request: Request):
    if request.headers.get("authorization"):
        uid = require_uid(request)
        visitor_id = None
    else:
        uid = None
        visitor_id = require_visitor_id(request.query_params.get("visitorId"))
    try:
        store = get_store()
        records = (
            store.get_player_records(uid)
            if uid is not None
            else store.get_guest_records(visitor_id)
        )
        return {"records": records}
    except (OSError, *DATABASE_ERRORS) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not read your private game history.",
        ) from error


@app.get("/api/course-progress/me")
def my_course_progress(request: Request):
    uid = require_uid(request)
    try:
        return {"record": get_store().get_course_progress(uid)}
    except (OSError, *DATABASE_ERRORS) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not read your course progress from the Python tracker.",
        ) from error


@app.post("/api/course-progress")
def save_my_course_progress(request: Request, payload: dict[str, Any]):
    identity = require_identity(request)
    uid = identity["localId"]
    email = identity.get("email")
    if not isinstance(email, str) or not email:
        raise HTTPException(status_code=401, detail="Your Google account must have an email address.")
    progress = validate_course_progress(payload.get("progress"))
    display_name = identity.get("displayName")
    if not isinstance(display_name, str):
        display_name = ""
    try:
        record = get_store().save_course_progress(uid, email, display_name[:100], progress)
        return {"record": record}
    except (OSError, *DATABASE_ERRORS) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not save your course progress to the Python tracker.",
        ) from error


@app.get("/api/admin/course-progress")
def all_course_progress(request: Request):
    require_course_admin(request)
    try:
        return {"records": get_store().get_all_course_progress()}
    except (OSError, *DATABASE_ERRORS) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not read learner progress from the Python tracker.",
        ) from error


@app.post("/")
@app.post("/{path:path}")
def game_endpoint(request: Request, payload: dict[str, Any]):
    if request.query_params.get("view") == "course-progress":
        return save_my_course_progress(request, payload)

    operation = payload.get("operation")

    if operation == "profile":
        uid = require_uid(request)
        store = get_store()
        name = payload.get("name")
        try:
            return store.create_player(uid, name)
        except ProfileExistsError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except NameTakenError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except GameError as error:
            raise HTTPException(status_code=error.status_code, detail=str(error)) from error
        except DATABASE_ERRORS as error:
            raise HTTPException(
                status_code=503,
                detail="Could not save your profile to the Python game database.",
            ) from error

    if operation not in {"start", "action"}:
        raise HTTPException(status_code=400, detail="Unknown score operation.")

    if request.headers.get("authorization"):
        uid = require_uid(request)
        visitor_id = None
    else:
        uid = None
        visitor_id = require_visitor_id(payload.get("visitorId"))
    store = get_store()

    if operation == "start":
        try:
            session_id = (
                store.start_game(uid, payload.get("game"), payload.get("options"))
                if uid is not None
                else store.start_guest_game(visitor_id, payload.get("game"), payload.get("options"))
            )
            return {"sessionId": session_id}
        except GameError as error:
            raise HTTPException(status_code=error.status_code, detail=str(error)) from error
        except DATABASE_ERRORS as error:
            raise HTTPException(
                status_code=503,
                detail="Could not start a game in the Python game database.",
            ) from error

    try:
        if uid is not None:
            return store.apply_game_action(uid, payload.get("sessionId"), payload.get("action"))
        return store.apply_guest_game_action(
            visitor_id,
            payload.get("sessionId"),
            payload.get("action"),
        )
    except GameError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    except (OSError, *DATABASE_ERRORS, ValueError) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not save the verified score to the Python game database.",
        ) from error
