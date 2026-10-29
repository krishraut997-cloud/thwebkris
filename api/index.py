import json
import os
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


def require_uid(request: Request) -> str:
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
    return users[0]["localId"]


@app.get("/")
@app.get("/api")
def health_check(request: Request):
    if request.query_params.get("view") == "dashboard":
        return dashboard()

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


@app.post("/")
@app.post("/{path:path}")
def game_endpoint(request: Request, payload: dict[str, Any]):
    uid = require_uid(request)
    store = get_store()
    operation = payload.get("operation")

    if operation == "profile":
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

    if operation == "start":
        try:
            return {"sessionId": store.start_game(uid, payload.get("game"), payload.get("options"))}
        except GameError as error:
            raise HTTPException(status_code=error.status_code, detail=str(error)) from error
        except DATABASE_ERRORS as error:
            raise HTTPException(
                status_code=503,
                detail="Could not start a game in the Python game database.",
            ) from error

    if operation != "action":
        raise HTTPException(status_code=400, detail="Unknown score operation.")

    try:
        return store.apply_game_action(uid, payload.get("sessionId"), payload.get("action"))
    except GameError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    except (OSError, *DATABASE_ERRORS, ValueError) as error:
        raise HTTPException(
            status_code=503,
            detail="Could not save the verified score to the Python game database.",
        ) from error
