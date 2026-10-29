# Krish Raut — Portfolio & Browser Games

![Preview of the portfolio, browser games, and live player dashboard](public/game-cards/game-platform.png)

**Live site:** [krishraut997-cloud.github.io/thwebkris](https://krishraut997-cloud.github.io/thwebkris/)

A personal portfolio and small collection of playable browser games. The score API is built in Python and verifies completed game sessions before saving leaderboard results.

## Tech stack

- React, Vite, and Tailwind CSS
- Python and FastAPI
- SQLite for local development; PostgreSQL for production
- Firebase Authentication for optional player profiles

## Run locally

1. Install Node.js and Python, then install the project dependencies:

   ```powershell
   npm install
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements-dev.txt
   ```

2. Copy `.env.example` to `.env.local`. Set the four `VITE_FIREBASE_*` values for Google sign-in and enable Google Authentication for `localhost` in Firebase. Games can still be played without signing in.

3. Start the Python score API and the Vite app in separate terminals:

   ```powershell
   npm run dev:score-api
   ```

   ```powershell
   npm run dev
   ```

   The local score database is created at `data/game-tracker.sqlite3`.

4. Create a production build:

   ```powershell
   npm run build
   ```

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for authentication and production database configuration.
