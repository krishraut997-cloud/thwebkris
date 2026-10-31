# Python game tracker setup

The games page and Python course use Firebase Google Authentication to identify
users. The Python FastAPI service verifies each sign-in with Google's public
Identity Toolkit API, then stores player profiles, verified game sessions,
scores, game records, and signed-in course progress in SQLite locally and
persistent Postgres in production. The service does not use a Firebase Admin
service account.

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
totals and weekly scores, refreshing every 15 seconds while the tab is visible.
Individual game records are stored for scorekeeping and are not displayed in a
recent-activity feed.

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
The Python course at `/python-course/` uses the same Google sign-in and Firebase
web app settings as the games. Signed-in learners sync their lesson, exercise,
achievement, XP, and activity-date progress to a private record keyed by their
Firebase user ID in the Python tracker database.
The portfolio, games dashboard, and course share the same Firebase sign-in
session on a given browser and site origin: sign in once in any of them, and
signing out in any of them signs out across the site. Different hostnames and
browsers have separate sessions.
Learners can read and update only their own record through the API. The API
checks the verified Google account `emeye1911@gmail.com` before returning any
learner records to the private course dashboard. Guest progress stays in that
browser and is only migrated to the first Google account that signs in on that
browser. Separate Google accounts use separate local progress. Existing
Firestore records are no longer read by the course; learners retain their
current device-local progress and new course activity syncs to the Python
tracker.
For another static-site domain, add the exact origin to
`SCORE_API_ALLOWED_ORIGINS` in Vercel.

For GitHub Pages deployment, set the four `VITE_FIREBASE_*` repository
variables under **GitHub → Settings → Secrets and variables → Actions →
Variables**. The workflow checks these required values without printing them
and stops before deployment if one is missing. Add the GitHub Pages hostname
to Firebase's authorized domains as described above.

In Vercel, set `DATABASE_URL` (or `POSTGRES_URL`) for the production API and
`FIREBASE_API_KEY` for sign-in verification. If the site uses additional
frontend origins, set `SCORE_API_ALLOWED_ORIGINS` to a comma-separated list of
exact origins, including scheme and hostname but no path (for example,
`https://www.example.com`). AdSense repository variables are optional; ads
remain disabled unless the client ID and consent setting are configured.

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
  the dashboard automatically refreshes every 15 seconds while visible and
  refreshes when a hidden tab becomes visible again.
- Local two-player Tic-tac-toe remains playable but is not ranked.
- New profiles and course progress are stored in the Python tracker database.
- Existing Firestore game profiles and scores are not automatically copied;
  this tracker starts with a new leaderboard.
