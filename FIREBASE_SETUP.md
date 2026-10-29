# Python game tracker setup

The games page uses Firebase Google Authentication only to identify players.
The Python FastAPI service verifies each Firebase sign-in with Google's public
Identity Toolkit API, then stores profiles, verified game sessions, scores, and
game records in SQLite locally and persistent Postgres in production. A
Firebase Admin service account and Firestore score writes are not used.

## Local development

1. Keep the Firebase web app settings in the ignored `.env.local` file:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`.
2. Enable Google sign-in in Firebase Authentication and allow `localhost` and
   the website's domain under **Authentication → Settings → Authorized
   domains**.
3. Install Python dependencies in the virtual environment:
   `.\.venv\Scripts\Activate.ps1` followed by
   `python -m pip install -r requirements-dev.txt`.
4. Run `npm run dev:score-api` and `npm run dev` in separate terminals.
   Vite forwards `/api` requests to FastAPI on port 8000.

SQLite data is saved at `data/game-tracker.sqlite3` by default and is excluded
from Git. To store it elsewhere, set `GAME_DATABASE_PATH` to an absolute path
before starting the Python server. The public dashboard reads all-time player
totals and weekly scores, refreshing every five seconds. Individual game
records are stored for scorekeeping and are not displayed in a recent-activity
feed.

## Production hosting

Vercel's Python functions do not provide a persistent local disk. Connect a
Prisma Postgres database to the Vercel project using the free plan, and make
sure `DATABASE_URL` is available to the Production function. The API detects
that variable and creates its tables in Postgres. Do not deploy production
without a persistent `DATABASE_URL`; health checks report not-ready and score
writes are rejected instead of losing records.

The GitHub Pages workflow points its API requests to the production Vercel
origin. The API allows requests from `https://krishraut997-cloud.github.io`.
For Google sign-in, also add `krishraut997-cloud.github.io` (without the
`/thwebkris` path) under **Firebase Console → Authentication → Settings →
Authorized domains** for the Firebase project used by the GitHub Pages build.
For another static-site domain, add the exact origin to
`SCORE_API_ALLOWED_ORIGINS` in Vercel.

The API uses the Firebase web API key (`VITE_FIREBASE_API_KEY`) only to ask
Google to verify Firebase ID tokens. This is the same public key used by the
browser; it is not a service-account credential. Do not expose private
credentials in `VITE_` variables.

## Score and data behavior

- The Python server decides game outcomes; browser-reported scores are never
  accepted. Wins add 10 points, losses subtract 10, and draws add 0.
- Player totals and each completed game record are committed together in one
  database transaction. Sessions expire after 24 hours and cannot be replayed.
- The dashboard sorts by points, then wins, games played, and player name.
- The weekly leaderboard sums verified score changes over the last seven days;
  the dashboard automatically refreshes every five seconds.
- Local two-player Tic-tac-toe remains playable but is not ranked.
- New profiles are stored in the Python game database. Existing Firestore
  profiles and scores are not automatically copied; this tracker starts with a
  new leaderboard.
