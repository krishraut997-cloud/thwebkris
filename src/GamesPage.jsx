import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Award,
  ArrowLeft,
  ArrowUpRight,
  Asterisk,
  Brain,
  Check,
  Circle,
  Clock3,
  Gamepad2,
  Hash,
  Leaf,
  LogIn,
  LogOut,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Star,
  Sun,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import {
  createPlayerProfile,
  getGuestVisitorId,
  isFirebaseConfigured,
  listenToAuth,
  listenToGameDashboard,
  listenToPlayerRecords,
  signInWithGoogle,
  signOutPlayer,
  startVerifiedGame,
  submitVerifiedGameAction,
} from "./firebase";
import {
  CONTEXT_UNLISTED_RANK,
  CONTEXT_VOCABULARY_SIZE,
  getContextPuzzle,
} from "./contextModel.js";
import AdSenseSlot from "./AdSenseSlot.jsx";
import { gamePages } from "./gameMeta.js";

const HOME_PATH = import.meta.env.BASE_URL;
const GameScoreContext = createContext(null);
const gameIcons = {
  memory: Brain,
  "tic-tac-toe": Circle,
  "number-guess": Hash,
  "context-guess": MessageCircle,
};
const gameDetails = {
  memory: { description: "Find the matching pairs.", meta: "1 player · Quick" },
  "tic-tac-toe": { description: "Play the AI or challenge a friend.", meta: "AI · 2 players" },
  "number-guess": { description: "Use the clues to find the number.", meta: "Python · 4 difficulty levels" },
  "context-guess": { description: "Explore meaning to find the hidden word.", meta: "Word puzzle · Semantic ranks" },
};
const gameOptions = gamePages.map((game) => ({
  ...game,
  ...gameDetails[game.id],
  icon: gameIcons[game.id],
}));

function getGameUrl(game) {
  return `${HOME_PATH}games/${game.slug}`;
}

function getRankedPlayerIds(players) {
  return Object.entries(players)
    .sort(([, first], [, second]) =>
      second.points - first.points ||
      second.wins - first.wins ||
      second.gamesPlayed - first.gamesPlayed ||
      first.name.localeCompare(second.name),
    )
    .map(([id]) => id);
}

function getSignInErrorMessage(error) {
  if (error?.code === "auth/unauthorized-domain") {
    const hostname = window.location.hostname;
    return `Firebase sign-in is not enabled for ${hostname}. A Firebase project owner must add this domain to the project's Authorized domains.`;
  }
  return error?.message || "Google sign-in failed. Please try again.";
}

function GameDashboard({
  gameData,
  privateRecords,
  authUser,
  profile,
  authLoading,
  profileSaving,
  trackerStatus,
  setError,
  onSignIn,
  onSignOut,
  onCreateProfile,
}) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  async function choosePlayer(event) {
    event.preventDefault();
    const playerName = name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
    if (!/^[a-z0-9]+(?: [a-z0-9]+)*$/.test(playerName) || playerName.length < 2 || playerName.length > 24) {
      setNameError("Use 2–24 letters or numbers, separated by single spaces. Names are saved in lowercase.");
      return;
    }

    setNameError("");
    try {
      await onCreateProfile(playerName);
      setName("");
    } catch (error) {
      setNameError(error.message || "Could not create your player profile. Please try again.");
    }
  }

  const players = gameData.players;
  const rankedIds = getRankedPlayerIds(players);
  const recentPlayers = gameData.weeklyPlayers.slice(0, 5);
  return (
    <section className="mt-6 rounded-xl border border-ink/10 bg-white p-3 shadow-sm sm:mt-8 sm:p-6" aria-label="Game leaderboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            <Trophy size={15} className="text-[#829f35]" /> Game dashboard
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.06em]">Players & rankings</h2>
          <p className="mt-1 max-w-prose text-xs leading-5 text-muted sm:text-[11px]">Sign in with Google to save your profile and scores in the Python game tracker.</p>
        </div>
        <span
          className={`inline-flex min-h-9 w-fit items-center gap-2 rounded-full px-3 py-2 text-[10px] font-medium ${
            trackerStatus.connected ? "bg-[#eef4db] text-[#5d7326]" : "bg-[#eaeae2] text-muted"
          }`}
          aria-live="polite"
          title={trackerStatus.updatedAt ? `Last refreshed ${new Date(trackerStatus.updatedAt).toLocaleTimeString()}` : undefined}
        >
          <span className="relative flex h-2 w-2">
            {trackerStatus.connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#829f35] opacity-40" />}
            <span className={`relative h-2 w-2 rounded-full ${trackerStatus.connected ? "bg-[#829f35]" : "bg-[#99998f]"}`} />
          </span>
          {trackerStatus.connected
            ? `Python tracker live · updated ${trackerStatus.updatedAt ? new Date(trackerStatus.updatedAt).toLocaleTimeString() : "now"}`
            : trackerStatus.error
              ? "Python tracker offline · retrying"
              : "Connecting to Python tracker…"}
        </span>
      </div>

      {!isFirebaseConfigured && (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Google sign-in is not configured yet. Add your Firebase web app settings to <code>.env.local</code> and enable Google sign-in.
        </p>
      )}

      {!profile && (
        <p role="status" className="mt-4 rounded-lg bg-[#f3f6eb] px-4 py-3 text-xs leading-5 text-[#5d7326]">
          Guest games are verified and tracked by the Python game service on this browser. Sign in and create a player profile to earn leaderboard points.
        </p>
      )}

      {profile && (
        <p role="status" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Verified solo wins add 10 points, losses subtract 10, and draws add 0. Local two-player Tic-tac-toe is not ranked.
        </p>
      )}

      <section className="mt-5 rounded-lg border border-ink/10 bg-[#f8f8f5] p-3 sm:p-4" aria-labelledby="private-game-history-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="private-game-history-title" className="text-sm font-semibold">Your recent games</h3>
              <p className="mt-1 text-[10px] text-muted">{profile ? "Private to your signed-in account" : "Private to this browser"}</p>
            </div>
            <Clock3 size={17} className="text-[#829f35]" />
          </div>
          {privateRecords.loading ? (
            <p className="mt-3 text-[11px] text-muted">Loading your game history…</p>
          ) : privateRecords.error ? (
            <p role="alert" className="mt-3 text-[11px] leading-5 text-red-700">{privateRecords.error}</p>
          ) : privateRecords.records.length ? (
            <ol className="mt-3 divide-y divide-ink/5">
              {privateRecords.records.map((record) => {
                const title = gameOptions.find(({ id }) => id === record.game)?.title || record.game;
                return (
                  <li key={`${record.game}-${record.createdAt}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-[11px]">
                    <span className="font-medium">{title} · {record.outcome}</span>
                    <span className="text-muted">
                      {record.pointsDelta === null
                        ? "Guest · not ranked"
                        : `${record.pointsDelta > 0 ? "+" : ""}${record.pointsDelta} pts`}
                      {" · "}
                      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.createdAt))}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-3 text-[11px] text-muted">Completed games will appear here. The tracker checks for updates every two seconds.</p>
          )}
      </section>

      <div className="mt-5">
        {authLoading ? (
          <p className="text-xs text-muted">Checking sign-in…</p>
        ) : !authUser ? (
          <button
            type="button"
            disabled={!isFirebaseConfigured}
            onClick={() => onSignIn().catch((error) => setError(getSignInErrorMessage(error)))}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={14} /> Continue with Google
          </button>
        ) : profile ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f3f6eb] px-4 py-3">
            <p className="text-xs font-medium">
              Playing as <span className="font-semibold">{profile.name}</span>
              <span className="ml-2 text-[10px] text-muted">({authUser.email})</span>
            </p>
            <button type="button" onClick={() => onSignOut().catch((error) => setError(error.message))} className="inline-flex min-h-11 items-center gap-1.5 text-[10px] font-semibold text-muted hover:text-ink">
              <LogOut size={13} /> Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={choosePlayer} className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="game-player-name">Choose your player name</label>
            <input
              id="game-player-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              placeholder="Choose a lowercase player name"
              className="min-w-0 flex-1 rounded-full border border-ink/15 px-4 py-2.5 text-xs outline-none transition focus:border-[#829f35]"
            />
            <button type="submit" disabled={profileSaving} className="min-h-11 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-wait disabled:opacity-60">
              {profileSaving ? "Creating profile…" : "Create player"}
            </button>
          </form>
        )}
      </div>

      {!profile && nameError && <p role="alert" className="mt-2 text-[11px] text-red-700">{nameError}</p>}
      {gameData.error && (
        <p role="alert" className="mt-2 text-[11px] leading-5 text-red-700">
          {gameData.error}
          {gameData.error.includes("Firebase sign-in is not enabled for ") && (
            <>
              {" "}
              <a
                href={`https://console.firebase.google.com/project/${encodeURIComponent(import.meta.env.VITE_FIREBASE_PROJECT_ID)}/authentication/settings`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Open Firebase Authorized domains
              </a>
              {" "}and add <code>krishraut997-cloud.github.io</code> (the hostname only, without <code>/thwebkris</code>).
            </>
          )}
        </p>
      )}
      {gameData.loading && <p className="mt-3 text-[11px] text-muted">Loading the leaderboard…</p>}
      <p className="mt-2 text-[10px] leading-5 text-muted">
        Guest game history is private to this browser. Google sign-in saves points to the shared leaderboard.
      </p>

      <div className="mt-5">
        <p className="mb-3 text-[10px] text-muted">
          {gameData.activity.totalGames.toLocaleString()} completed games tracked · {gameData.activity.gamesThisWeek.toLocaleString()} in the last 7 days · syncs every 2 seconds
        </p>
        <section className="rounded-lg border border-ink/10 bg-[#f8f8f5] p-3 sm:p-4" aria-labelledby="weekly-leaderboard-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="weekly-leaderboard-title" className="text-sm font-semibold">Top players this week</h3>
              <p className="mt-1 text-[10px] text-muted">Points earned in the last 7 days</p>
            </div>
            <Trophy size={17} className="text-[#829f35]" />
          </div>
          {recentPlayers.length ? (
            <ol className="mt-3 divide-y divide-ink/5">
              {recentPlayers.map((player, index) => (
                <li key={player.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 py-3 text-[11px] sm:grid-cols-[32px_1fr_auto] sm:text-xs">
                  <span className="font-display font-bold text-[#71862f]">{index === 0 ? <Award size={16} /> : `#${index + 1}`}</span>
                  <span className="truncate font-medium">{player.name}{player.id === authUser?.uid && <span className="ml-2 text-[9px] text-[#71862f]">YOU</span>}</span>
                  <span className="text-right font-semibold tabular-nums">{player.points} pts · {player.gamesPlayed} {player.gamesPlayed === 1 ? "game" : "games"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-md border border-dashed border-ink/15 px-3 py-4 text-center text-[11px] leading-5 text-muted">
              {gameData.loading ? "Loading this week’s scores…" : "No scored games this week yet. Play a round to get on the board."}
            </p>
          )}
        </section>
      </div>

      <details className="mt-4 rounded-lg border border-ink/10 bg-[#f8f8f5] sm:mt-5">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-[11px] font-semibold">All-time leaderboard</summary>
      {rankedIds.length === 0 ? (
        <div className="m-3 rounded-lg border border-dashed border-ink/15 px-4 py-6 text-center">
          <UserRound size={20} className="mx-auto text-[#829f35]" />
          <p className="mt-2 text-xs font-medium">Sign in and create a player profile to join the leaderboard.</p>
          <p className="mt-1 text-[10px] text-muted">Play games to earn points and climb the ranks.</p>
        </div>
      ) : (
        <div className="m-2 overflow-hidden rounded-lg border border-ink/10 sm:m-3">
          <div className="grid grid-cols-[34px_minmax(0,1fr)_48px_44px] gap-1.5 bg-[#f8f8f5] px-2 py-3 text-[8px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[60px_1fr_100px_90px] sm:gap-2 sm:px-4 sm:text-[9px]">
            <span>Rank</span><span>Player</span><span className="text-right">Points</span><span className="text-right">Games</span>
          </div>
          <ol>
            {rankedIds.map((id) => {
              const player = gameData.players[id];
              const rank = rankedIds.indexOf(id);
              return (
                <li key={id} className={`grid grid-cols-[34px_minmax(0,1fr)_48px_44px] items-center gap-1.5 border-t border-ink/5 px-2 py-3 text-[11px] sm:grid-cols-[60px_1fr_100px_90px] sm:gap-2 sm:px-4 sm:text-xs ${id === authUser?.uid ? "bg-[#f3f6eb]" : "bg-white"}`}>
                  <span className={`font-display font-bold ${rank === 0 ? "text-[#829f35]" : "text-muted"}`}>
                    {rank < 0 ? "—" : rank === 0 ? <Award size={16} /> : `#${rank + 1}`}
                  </span>
                  <span className="truncate font-medium">{player.name}{id === authUser?.uid && <span className="ml-2 text-[9px] text-[#71862f]">YOU</span>}</span>
                  <span className="text-right font-semibold">{player.points}</span>
                  <span className="text-right text-muted">{player.gamesPlayed}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      </details>
      <details className="mt-3 rounded-lg border border-ink/10 bg-[#f8f8f5]">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-[10px] font-semibold">How points work</summary>
        <ul className="space-y-1.5 border-t border-ink/10 px-3 py-2.5 text-[10px] leading-5 text-muted">
          <li>Every verified win adds 10 points; every verified loss subtracts 10; draws change points by 0.</li>
          <li>Only signed-in solo games and Tic-tac-toe vs AI update the leaderboard.</li>
          <li>Players are ranked from highest points to lowest. Equal scores use wins, games played, then player name.</li>
        </ul>
      </details>
      <p className="mt-2 text-[10px] leading-5 text-muted">Weekly and all-time scores refresh every two seconds. Weekly points cover the last seven days; all-time totals never reset.</p>
    </section>
  );
}

function useGameScore() {
  const context = useContext(GameScoreContext);
  if (!context) throw new Error("Game components must be rendered inside the game dashboard.");
  return context;
}

function useVerifiedGame(game, trackingEnabled) {
  const { enabled, visitorId, startGame, submitAction, setScoreError, clearScoreError } = useGameScore();
  const [sessionId, setSessionId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = useCallback(async (options = {}) => {
    if (!trackingEnabled) return null;
    setStarting(true);
    setSessionId(null);
    try {
      const nextSessionId = await startGame(game, options, visitorId, enabled);
      setSessionId(nextSessionId);
      setFailed(false);
      clearScoreError();
      return nextSessionId;
    } catch (error) {
      setFailed(true);
      setScoreError(error.message || "Could not start a verified game. Please try again.");
      return null;
    } finally {
      setStarting(false);
    }
  }, [clearScoreError, enabled, game, setScoreError, startGame, trackingEnabled, visitorId]);

  useEffect(() => {
    if (trackingEnabled) {
      start();
    } else {
      setSessionId(null);
      setFailed(false);
      setStarting(false);
    }
  }, [start, trackingEnabled]);

  const action = useCallback(async (payload) => {
    if (!sessionId) throw new Error("The verified game is not ready.");
    try {
      const result = await submitAction(sessionId, payload, visitorId, enabled);
      clearScoreError();
      return result;
    } catch (error) {
      setScoreError(error.message || "The game result could not be verified.");
      throw error;
    }
  }, [clearScoreError, enabled, sessionId, setScoreError, submitAction, visitorId]);

  return { sessionId, starting, failed, start, action };
}

const memoryIcons = [Zap, Star, Leaf, Sun, Sparkles, Gamepad2];
const PYODIDE_SCRIPT_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
let pythonRuntimePromise;

const guessLevels = [
  { name: "Easy", maximum: 20, attempts: 10, description: "A small range and plenty of guesses." },
  { name: "Medium", maximum: 100, attempts: 8, description: "A balanced challenge." },
  { name: "Hard", maximum: 500, attempts: 8, description: "A wider range with fewer chances." },
  { name: "Advanced", maximum: 1000, attempts: 7, description: "The biggest range and the fewest guesses." },
];

const pythonGuessingGame = `
import json
import random

range_max = 100
max_attempts = 8
secret_number = random.randint(1, range_max)
attempts = 0

def submit_guess(value):
    global attempts
    if attempts >= max_attempts:
        return json.dumps({"result": "lost", "message": f"No guesses left. The number was {secret_number}.", "attempts": attempts})
    attempts += 1
    if value < secret_number:
        message = "Too low — try a higher number."
        result = "low"
    elif value > secret_number:
        message = "Too high — try a lower number."
        result = "high"
    else:
        message = f"You got it! The number was {secret_number}."
        result = "correct"
    if result != "correct" and attempts >= max_attempts:
        message = f"No guesses left. The number was {secret_number}."
        result = "lost"
    return json.dumps({"result": result, "message": message, "attempts": attempts})

def set_level(new_range_max, new_max_attempts):
    global range_max, max_attempts
    range_max = new_range_max
    max_attempts = new_max_attempts
    reset_game()

def reset_game():
    global secret_number, attempts
    secret_number = random.randint(1, range_max)
    attempts = 0
`;

function loadPythonRuntime() {
  if (!pythonRuntimePromise) {
    const loadScript = window.loadPyodide
      ? Promise.resolve(window.loadPyodide)
      : new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = PYODIDE_SCRIPT_URL;
          script.async = true;
          script.onload = () => {
            if (window.loadPyodide) resolve(window.loadPyodide);
            else reject(new Error("Python runtime did not initialize."));
          };
          script.onerror = () => {
            script.remove();
            reject(new Error("Could not load the Python runtime."));
          };
          document.head.appendChild(script);
        });

    pythonRuntimePromise = loadScript
      .then((loadPyodide) => loadPyodide({ indexURL: PYODIDE_INDEX_URL }))
      .catch((error) => {
        pythonRuntimePromise = undefined;
        throw error;
      });
  }

  return pythonRuntimePromise;
}

function createDeck() {
  return memoryIcons
    .flatMap((Icon, index) => [
      { id: `${index}-a`, pair: index, Icon },
      { id: `${index}-b`, pair: index, Icon },
    ])
    .sort(() => Math.random() - 0.5);
}

function MemoryGame() {
  const { enabled, trackingEnabled } = useGameScore();
  const verified = useVerifiedGame("memory", trackingEnabled);
  const [cards, setCards] = useState(createDeck);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameError, setGameError] = useState("");
  const verifiedPending = trackingEnabled && !verified.sessionId && !verified.failed;

  useEffect(() => {
    if (flipped.length !== 2 || verified.sessionId) return undefined;
    const [first, second] = flipped;
    if (cards[first].pair === cards[second].pair) {
      setMatched((current) => [...current, first, second]);
      setFlipped([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setFlipped([]), 750);
    return () => window.clearTimeout(timeoutId);
  }, [cards, flipped, verified.sessionId]);

  async function flipCard(index) {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index) || verifiedPending) return;
    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);
    if (nextFlipped.length !== 2) return;

    setMoves((current) => current + 1);
    if (!verified.sessionId) return;

    try {
      const result = await verified.action({
        type: "memoryTurn",
        first: nextFlipped[0],
        second: nextFlipped[1],
      });
      setCards((current) => current.map((card, cardIndex) => {
        const pairIndex = cardIndex === nextFlipped[0]
          ? result.pairs[0]
          : cardIndex === nextFlipped[1]
            ? result.pairs[1]
            : card.pair;
        const Icon = memoryIcons[pairIndex];
        return { ...card, pair: pairIndex, Icon };
      }));
      setMatched(result.matched);
      setGameError("");
      if (result.pairs[0] === result.pairs[1]) {
        setFlipped([]);
      } else {
        window.setTimeout(() => setFlipped([]), 750);
      }
    } catch {
      setCards(createDeck());
      setFlipped([]);
      setMatched([]);
      setMoves(0);
      setGameError("The server could not verify that turn. A new round has started.");
      verified.start();
    }
  }

  function reset() {
    setCards(createDeck());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameError("");
    verified.start();
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Turn over two cards at a time</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.06em]">Find the pairs</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-xs font-medium">Moves <strong>{moves}</strong></span>
          <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-xs font-medium">Pairs <strong>{matched.length / 2}/6</strong></span>
          <button type="button" onClick={reset} disabled={flipped.length === 2 || verifiedPending} aria-label="Restart memory game" className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white hover:bg-[#eaeae2] disabled:opacity-50"><RotateCcw size={15} /></button>
        </div>
      </div>
      {gameError && <p role="alert" className="mb-3 text-center text-xs text-red-700">{gameError}</p>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3" role="group" aria-label="Memory match cards">
        {cards.map(({ id, Icon }, index) => {
          const isOpen = flipped.includes(index) || matched.includes(index);
          return (
            <button
              key={id}
              type="button"
              onClick={() => flipCard(index)}
              disabled={isOpen || flipped.length === 2 || verifiedPending}
              aria-label={isOpen ? `Card ${index + 1}, revealed` : `Reveal card ${index + 1}`}
              className={`flex aspect-[1.25/1] items-center justify-center rounded-lg border transition duration-200 sm:aspect-[1.5/1] ${
                isOpen
                  ? "rotate-0 border-[#d6e4b1] bg-[#edf3de] text-[#71862f]"
                  : "border-transparent bg-ink text-paper hover:-translate-y-0.5 hover:bg-[#42443c]"
              }`}
            >
              {isOpen ? <Icon size={27} strokeWidth={1.7} /> : <Asterisk size={24} className="text-[#b5d943]" />}
            </button>
          );
        })}
      </div>
      {matched.length === 12 && (
        <p role="status" className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#71862f]">
          <Check size={17} /> All pairs found in {moves} moves. Nice work!{enabled && verified.sessionId ? " +10 points." : ""}
        </p>
      )}
    </div>
  );
}

function getWinningLine(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return [a, b, c];
    }
  }
  return null;
}

function getWinner(squares) {
  const winningLine = getWinningLine(squares);
  return winningLine ? squares[winningLine[0]] : null;
}

function getBestMove(squares) {
  function minimax(board, player, depth) {
    const winner = getWinner(board);
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    if (board.every(Boolean)) return 0;

    const scores = [];
    board.forEach((square, index) => {
      if (square) return;
      const nextBoard = [...board];
      nextBoard[index] = player;
      scores.push({
        index,
        score: minimax(nextBoard, player === "O" ? "X" : "O", depth + 1),
      });
    });

    if (player === "O") {
      return scores.reduce((best, move) => move.score > best ? move.score : best, -Infinity);
    }
    return scores.reduce((best, move) => move.score < best ? move.score : best, Infinity);
  }

  let bestMove = -1;
  let bestScore = -Infinity;
  squares.forEach((square, index) => {
    if (square) return;
    const nextBoard = [...squares];
    nextBoard[index] = "O";
    const score = minimax(nextBoard, "X", 1);
    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  });
  return bestMove;
}

function getImmediateMove(squares, player) {
  for (let index = 0; index < squares.length; index += 1) {
    if (squares[index]) continue;
    const nextBoard = [...squares];
    nextBoard[index] = player;
    if (getWinner(nextBoard) === player) return index;
  }
  return -1;
}

function getAIMove(squares, difficulty) {
  const available = squares
    .map((square, index) => (square ? -1 : index))
    .filter((index) => index >= 0);

  if (difficulty === "Hard") return getBestMove(squares);

  if (difficulty === "Medium") {
    const winningMove = getImmediateMove(squares, "O");
    if (winningMove >= 0) return winningMove;

    const blockingMove = getImmediateMove(squares, "X");
    if (blockingMove >= 0) return blockingMove;

    if (available.includes(4)) return 4;
    const corners = available.filter((index) => [0, 2, 6, 8].includes(index));
    const choices = corners.length > 0 ? corners : available;
    return choices[Math.floor(Math.random() * choices.length)] ?? -1;
  }

  return available[Math.floor(Math.random() * available.length)] ?? -1;
}

function TicTacToe() {
  const { enabled, trackingEnabled } = useGameScore();
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("Normal");
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [nextPlayer, setNextPlayer] = useState("X");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [movePending, setMovePending] = useState(false);
  const [moveError, setMoveError] = useState("");
  const verified = useVerifiedGame("tic-tac-toe", trackingEnabled && mode === "ai");
  const winningLine = getWinningLine(squares);
  const winner = getWinner(squares);
  const draw = !winner && squares.every(Boolean);
  const startVerified = verified.start;
  const verifiedPending = trackingEnabled && mode === "ai" && !verified.sessionId && !verified.failed;

  useEffect(() => {
    if (mode !== "ai" || verified.sessionId || nextPlayer !== "O" || winner || draw) return undefined;

    const timeoutId = window.setTimeout(() => {
      const index = getAIMove(squares, difficulty);
      if (index < 0) return;

      const updated = [...squares];
      updated[index] = "O";
      const roundWinner = getWinner(updated);
      setSquares(updated);
      if (roundWinner) setScores((current) => ({ ...current, O: current.O + 1 }));
      else setNextPlayer("X");
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [difficulty, draw, mode, nextPlayer, squares, verified.sessionId, winner]);

  useEffect(() => {
    if (!draw) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSquares(Array(9).fill(null));
      setNextPlayer("X");
      if (trackingEnabled && mode === "ai") startVerified({ difficulty });
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [difficulty, draw, mode, startVerified, trackingEnabled]);

  async function play(index) {
    if (squares[index] || winner || draw || (mode === "ai" && nextPlayer === "O")) return;
    if (verifiedPending) return;
    if (mode === "ai" && verified.sessionId) {
      setMovePending(true);
      try {
        const result = await verified.action({ type: "ticTacToeMove", index });
        setSquares(result.board);
        setNextPlayer(result.nextPlayer || "X");
        setMoveError("");
        if (result.winner) {
          setScores((current) => ({ ...current, [result.winner]: current[result.winner] + 1 }));
        }
      } catch {
        setMoveError("The server could not verify that move. A new round has started.");
        verified.start({ difficulty });
        setSquares(Array(9).fill(null));
        setNextPlayer("X");
      } finally {
        setMovePending(false);
      }
      return;
    }

    const updated = [...squares];
    updated[index] = nextPlayer;
    const roundWinner = getWinner(updated);
    setSquares(updated);
    if (roundWinner) setScores((current) => ({ ...current, [roundWinner]: current[roundWinner] + 1 }));
    else setNextPlayer(nextPlayer === "X" ? "O" : "X");
  }

  function resetRound() {
    setSquares(Array(9).fill(null));
    setNextPlayer("X");
    setMoveError("");
    if (trackingEnabled && mode === "ai") verified.start({ difficulty });
  }

  function resetMatch() {
    resetRound();
    setScores({ X: 0, O: 0 });
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setSquares(Array(9).fill(null));
    setNextPlayer("X");
    setScores({ X: 0, O: 0 });
    setMoveError("");
    if (nextMode === mode && trackingEnabled && nextMode === "ai") {
      startVerified({ difficulty });
    }
  }

  function changeDifficulty(nextDifficulty) {
    setDifficulty(nextDifficulty);
    setSquares(Array(9).fill(null));
    setNextPlayer("X");
    if (trackingEnabled && mode === "ai") startVerified({ difficulty: nextDifficulty });
  }

  return (
    <div className="grid items-center gap-7 md:grid-cols-[1fr_0.85fr]">
      <div>
        {moveError && <p role="alert" className="mb-3 text-center text-xs text-red-700 md:text-left">{moveError}</p>}
        <div className="grid aspect-square max-h-[390px] grid-cols-3 gap-2 sm:gap-3">
          {squares.map((square, index) => (
            <button
              key={index}
              type="button"
              onClick={() => play(index)}
              aria-label={`Square ${index + 1}${square ? `, ${square}` : ""}${winningLine?.includes(index) ? ", winning square" : ""}`}
              className={`flex items-center justify-center rounded-xl font-display text-5xl font-semibold transition disabled:cursor-default sm:text-6xl ${
                winningLine?.includes(index)
                  ? "bg-[#dce9bd] ring-2 ring-inset ring-[#829f35]"
                  : "bg-[#eaeae2] hover:bg-[#e2e5d8]"
              }`}
              disabled={Boolean(square) || Boolean(winner) || draw || movePending || (mode === "ai" && nextPlayer === "O") || verifiedPending}
            >
              {square === "X" ? <span className="text-[#71862f]">X</span> : square === "O" ? <span className="text-ink/70">O</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="text-center md:text-left">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Choose how to play</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em]">Tic-tac-toe</h2>
        <div className="mt-4 inline-flex rounded-full bg-[#eaeae2] p-1" aria-label="Game mode">
          <button type="button" aria-pressed={mode === "ai"} onClick={() => changeMode("ai")} className={`min-h-11 rounded-full px-3 py-2 text-[11px] font-semibold transition ${mode === "ai" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>Play vs AI</button>
          <button type="button" aria-pressed={mode === "two-player"} onClick={() => changeMode("two-player")} className={`min-h-11 rounded-full px-3 py-2 text-[11px] font-semibold transition ${mode === "two-player" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>2 players</button>
        </div>
        {mode === "ai" && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">AI difficulty</p>
            <div className="inline-flex rounded-full border border-ink/10 bg-white p-1" aria-label="AI difficulty">
              {["Normal", "Medium", "Hard"].map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={difficulty === level}
                  onClick={() => changeDifficulty(level)}
                  className={`min-h-11 rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
                    difficulty === level
                      ? "bg-[#eaeae2] text-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted">
              {difficulty === "Normal"
                ? "A relaxed opponent with unpredictable moves."
                : difficulty === "Medium"
                  ? "Looks for winning moves and blocks your immediate threats."
                  : "A challenging opponent that plans ahead and won’t lose."}
            </p>
          </div>
        )}
        <p className="mt-3 text-sm text-muted" role="status" aria-live="polite">
          {winner
            ? `${mode === "ai" ? winner === "X" ? "You win" : "AI wins" : `Player ${winner} wins`} this round!${mode === "ai" && enabled && verified.sessionId ? winner === "X" ? " +10 points." : " -10 points." : ""}`
            : draw
              ? `It’s a draw — starting a new game…${mode === "ai" && enabled && verified.sessionId ? " 0 points." : ""}`
              : mode === "ai" && nextPlayer === "O"
                ? "AI is thinking…"
                : mode === "ai"
                  ? "Your turn — you are X"
                  : `Player ${nextPlayer}’s turn`}
        </p>
        <details className="mt-4 max-w-[360px] rounded-lg border border-ink/10 bg-white text-left">
          <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-xs font-semibold marker:hidden">
            How to play <span className="float-right text-muted">＋</span>
          </summary>
          <ol className="space-y-2 border-t border-ink/10 px-4 py-3 text-[11px] leading-5 text-muted">
            <li><strong className="text-ink">1.</strong> X always starts. Take turns placing one mark in an empty square.</li>
            <li><strong className="text-ink">2.</strong> Get three of your marks in a row, column, or diagonal to win.</li>
            <li><strong className="text-ink">3.</strong> If all nine squares fill without a three-in-a-row, the round is a draw.</li>
            {mode === "ai" && <li><strong className="text-ink">4.</strong> You are X; the AI is O. Difficulty changes how carefully it chooses its moves.</li>}
          </ol>
        </details>
        <div className="mt-6 grid max-w-[280px] grid-cols-2 gap-3">
          {["X", "O"].map((player) => (
            <div key={player} className="rounded-lg border border-ink/10 bg-white p-4">
              <p className="text-xs text-muted">{mode === "ai" ? player === "X" ? "You (X)" : "AI (O)" : `Player ${player}`}</p>
              <p className="mt-1 font-display text-3xl font-semibold">{scores[player]}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={resetRound} className="min-h-11 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#4a4b41]">New round</button>
          <button type="button" onClick={resetMatch} className="min-h-11 rounded-full border border-ink/15 px-4 py-2.5 text-xs font-semibold hover:bg-[#eaeae2]">Reset scores</button>
        </div>
      </div>
    </div>
  );
}

function ContextGuessGame() {
  const { enabled, trackingEnabled } = useGameScore();
  const verified = useVerifiedGame("context-guess", trackingEnabled);
  const [puzzle, setPuzzle] = useState(null);
  const [rankByWord, setRankByWord] = useState(null);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelError, setModelError] = useState("");
  const [guessPending, setGuessPending] = useState(false);

  useEffect(() => {
    if (trackingEnabled && !verified.failed) return undefined;
    let active = true;

    getContextPuzzle()
      .then((nextPuzzle) => {
        if (!active) return;
        setPuzzle(nextPuzzle.answer);
        setRankByWord(nextPuzzle.rankByWord);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setModelError(error.message || "The semantic vocabulary could not be loaded.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trackingEnabled, verified.failed]);

  useEffect(() => {
    if (verified.sessionId) setLoading(false);
  }, [verified.sessionId]);

  const bestRank = guesses.reduce(
    (best, item) => item.rank < CONTEXT_UNLISTED_RANK && item.rank < best ? item.rank : best,
    Infinity,
  );
  const hasRankedGuesses = bestRank < Infinity;
  const hasUnrankedGuesses = guesses.some((item) => item.rank >= CONTEXT_UNLISTED_RANK);

  async function submitGuess(event) {
    event.preventDefault();
    if (loading || guessPending || (verified.sessionId ? complete : !puzzle || !rankByWord)) return;
    const word = guess.trim().toLowerCase();

    if (!/^[a-z]+$/.test(word)) {
      setMessage("Enter one English word using letters only.");
      return;
    }

    if (guesses.some((item) => item.word === word)) {
      setMessage("You already guessed that word. Try another one.");
      return;
    }

    if (verified.sessionId) {
      setGuessPending(true);
      try {
        const result = await verified.action({ type: "contextGuess", guess: word });
        setGuesses((current) => [...current, { word, rank: result.rank }]);
        setGuess("");
        if (result.status === "correct") {
          setPuzzle(result.answer);
          setWon(true);
          setComplete(true);
          setMessage(`You found it — “${result.answer}” is rank #1!${enabled ? " +10 points." : ""}`);
        } else if (result.status === "lost") {
          setPuzzle(result.answer);
          setComplete(true);
          setMessage(`No guesses left. The word was “${result.answer}”.${enabled ? " -10 points." : ""}`);
        } else {
          setMessage(
            result.rank >= CONTEXT_UNLISTED_RANK
              ? `“${word}” is outside this game's ${CONTEXT_VOCABULARY_SIZE.toLocaleString()}-word vocabulary and is ranked #${CONTEXT_UNLISTED_RANK.toLocaleString()}+. Try a related word.`
              : result.rank <= 10
                ? `Extremely close! “${word}” is rank #${result.rank}.`
                : result.rank <= 100
                  ? `Very close! “${word}” is rank #${result.rank}.`
                  : result.rank <= 500
                    ? `Close! “${word}” is rank #${result.rank}.`
                    : `Getting warmer — “${word}” is rank #${result.rank}.`,
          );
        }
      } catch (error) {
        setMessage(error.message || "The guess could not be verified.");
      } finally {
        setGuessPending(false);
      }
      return;
    }

    if (word === puzzle) {
      setGuesses((current) => [...current, { word, rank: 1 }]);
      setMessage(`You found it — “${puzzle}” is rank #1!`);
      setWon(true);
      setComplete(true);
      setGuess("");
      return;
    }

    const rank = rankByWord.get(word) ?? CONTEXT_UNLISTED_RANK;
    setGuesses((current) => [...current, { word, rank }]);
    setMessage(
      rank >= CONTEXT_UNLISTED_RANK
        ? `“${word}” is outside this game's ${CONTEXT_VOCABULARY_SIZE.toLocaleString()}-word vocabulary and is ranked #${CONTEXT_UNLISTED_RANK.toLocaleString()}+. Try a related word.`
        : rank <= 10
          ? `Extremely close! “${word}” is rank #${rank}.`
          : rank <= 100
            ? `Very close! “${word}” is rank #${rank}.`
            : rank <= 500
              ? `Close! “${word}” is rank #${rank}.`
              : `Getting warmer — “${word}” is rank #${rank}.`,
    );
    setGuess("");
  }

  async function startNewPuzzle() {
    setLoading(true);
    setModelError("");
    setGuess("");
    setGuesses([]);
    setMessage("");
    setWon(false);
    setComplete(false);

    try {
      if (trackingEnabled && await verified.start()) {
        setPuzzle(null);
        setRankByWord(null);
        setLoading(false);
        return;
      }
      const nextPuzzle = await getContextPuzzle(puzzle);
      setPuzzle(nextPuzzle.answer);
      setRankByWord(nextPuzzle.rankByWord);
    } catch (error) {
      setModelError(error.message || "A new semantic puzzle could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eaeae2] text-[#71862f]">
          <MessageCircle size={22} />
        </span>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Meaning, not spelling</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em]">Context Guess</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
          Find the hidden word by exploring related ideas. Each guess gets a semantic rank: the closer its meaning, the nearer it is to #1.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-ink/10 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Mystery word</p>
            <p className="mt-1 font-display text-lg font-semibold tracking-[-0.04em]">
              {complete ? puzzle : "?????"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-xs">
              Guesses <strong>{guesses.length}</strong>
            </span>
            {(hasRankedGuesses || hasUnrankedGuesses) && !won && (
              <span className="rounded-full bg-[#eef4db] px-3 py-2 text-xs font-semibold text-[#5d7326]">
                Best {hasRankedGuesses ? `#${bestRank}` : `#${CONTEXT_UNLISTED_RANK.toLocaleString()}+`}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={submitGuess} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="context-word-guess">Guess a word</label>
          <input
            id="context-word-guess"
            type="text"
            autoComplete="off"
            spellCheck="false"
            maxLength={40}
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            placeholder="Type any word..."
            disabled={complete || loading || guessPending || Boolean(modelError)}
            className="min-w-0 flex-1 rounded-full border border-ink/15 px-5 py-3 text-sm outline-none transition focus:border-[#829f35] disabled:bg-[#f8f8f5]"
          />
          <button type="submit" disabled={complete || loading || guessPending || Boolean(modelError)} className="min-h-11 rounded-full bg-ink px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-50">
            Guess word
          </button>
        </form>

        {(loading || modelError || message) && (
          <p role="status" aria-live="polite" className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${won ? "bg-[#eef4db] text-[#5d7326]" : "bg-[#f8f8f5] text-ink"}`}>
            {modelError || message || "Loading the semantic vocabulary…"}
          </p>
        )}

        {complete && (
          <button type="button" onClick={startNewPuzzle} disabled={loading} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#829f35] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#71862f] disabled:cursor-wait disabled:opacity-60">
            <RotateCcw size={14} /> Play a new word
          </button>
        )}

        {guesses.length > 0 && (
          <div className="mt-6 border-t border-ink/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">Your word trail</p>
              <span className="text-[10px] text-muted">Closer to #1 = more related</span>
            </div>
            <ol className="mt-3 space-y-2">
              {[...guesses].sort((a, b) => a.rank - b.rank).map(({ word, rank }) => (
                <li key={word} className={`flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 ${rank === 1 ? "bg-[#eef4db]" : rank <= 10 ? "bg-[#f0f3e8]" : "bg-[#f8f8f5]"}`}>
                  <span className="text-sm font-medium capitalize">{word}</span>
                  <span className={`text-xs font-semibold ${rank <= 10 ? "text-[#5d7326]" : "text-muted"}`}>
                    {rank >= CONTEXT_UNLISTED_RANK ? `#${CONTEXT_UNLISTED_RANK.toLocaleString()}+` : `#${rank}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {guesses.length === 0 && (
          <p className="mt-5 rounded-lg bg-[#f8f8f5] px-4 py-3 text-center text-xs text-muted">
            No starting clue. Try a word and use its rank to guide your next guess.
          </p>
        )}
      </div>

      <details className="mt-4 rounded-lg border border-ink/10 bg-white/70">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-semibold">How ranking works</summary>
        <p className="border-t border-ink/10 px-4 py-3 text-[11px] leading-5 text-muted">
          Guesses are ranked by cosine similarity to the mystery word using a pretrained MiniLM semantic model and this game's {CONTEXT_VOCABULARY_SIZE.toLocaleString()}-word English vocabulary. Words outside the vocabulary show #{CONTEXT_UNLISTED_RANK.toLocaleString()}+. This is an original implementation and does not use Contexto's proprietary word list or model.
        </p>
      </details>
    </div>
  );
}

function NumberGuessGame() {
  const { enabled, trackingEnabled } = useGameScore();
  const verified = useVerifiedGame("number-guess", trackingEnabled);
  const [runtime, setRuntime] = useState(null);
  const [difficulty, setDifficulty] = useState("Easy");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (trackingEnabled && !verified.failed) {
      setLoading(!verified.sessionId);
      setError("");
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");

    loadPythonRuntime()
      .then(async (pyodide) => {
        await pyodide.runPythonAsync(pythonGuessingGame);
        const level = guessLevels[0];
        await pyodide.runPythonAsync(
          `set_level(${level.maximum}, ${level.attempts})`,
        );
        if (active) {
          setRuntime(pyodide);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not start Python. Check your internet connection and try again.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [retry, trackingEnabled, verified.failed, verified.sessionId]);

  const level = guessLevels.find((item) => item.name === difficulty);

  async function handleSubmit(event) {
    event.preventDefault();
    const value = Number(guess);
    if (submitting || complete || !Number.isInteger(value) || value < 1 || value > level.maximum) {
      setMessage(`Enter a whole number from 1 to ${level.maximum}.`);
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      if (verified.sessionId) {
        const result = await verified.action({ type: "numberGuess", guess: value });
        const resultMessage = result.status === "correct"
          ? `You got it! The number was ${result.answer}.${enabled ? " +10 points." : ""}`
          : result.status === "lost"
            ? `No guesses left. The number was ${result.answer}.${enabled ? " -10 points." : ""}`
            : result.status === "low"
              ? "Too low — try a higher number."
              : "Too high — try a lower number.";
        setAttempts((current) => [...current, { value, result: result.status }]);
        setMessage(resultMessage);
        setComplete(result.status === "correct" || result.status === "lost");
        setGuess("");
        return;
      }

      if (!runtime) {
        setMessage("The game is still starting. Please try again.");
        return;
      }
      const resultJson = await runtime.runPythonAsync(`submit_guess(${value})`);
      const result = JSON.parse(resultJson);
      setAttempts((current) => [...current, { value, result: result.result }]);
      setMessage(result.message);
      setComplete(result.result === "correct" || result.result === "lost");
      setGuess("");
    } catch {
      setMessage("Something went wrong while checking that guess. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startNewGame() {
    if ((!runtime && !verified.sessionId) || submitting) return;
    setSubmitting(true);
    try {
      if (runtime) await runtime.runPythonAsync("reset_game()");
      if (trackingEnabled) await verified.start({ difficulty });
      setAttempts([]);
      setMessage("New number picked. Good luck!");
      setComplete(false);
      setGuess("");
    } catch {
      setMessage("Could not start a new round. Please reload the game.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeDifficulty(nextDifficulty) {
    if ((!runtime && !verified.sessionId) || submitting || nextDifficulty === difficulty) return;
    const nextLevel = guessLevels.find((item) => item.name === nextDifficulty);
    setSubmitting(true);
    try {
      if (runtime) {
        await runtime.runPythonAsync(
          `set_level(${nextLevel.maximum}, ${nextLevel.attempts})`,
        );
      }
      if (trackingEnabled) await verified.start({ difficulty: nextDifficulty });
      setDifficulty(nextDifficulty);
      setAttempts([]);
      setMessage(`New ${nextDifficulty.toLowerCase()} game started.`);
      setComplete(false);
      setGuess("");
    } catch {
      setMessage("Could not change difficulty. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[650px]">
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eaeae2] text-[#71862f]"><Hash size={23} /></span>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Python mini game</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em]">Guess the number</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">I&apos;m thinking of a number. Make a guess before you run out of tries.</p>
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-5 sm:p-7">
        {loading ? (
          <div className="flex min-h-[130px] flex-col items-center justify-center text-center">
            <LoaderCircle size={23} className="animate-spin text-[#829f35]" />
            <p className="mt-3 text-sm font-medium">Starting Python…</p>
            <p className="mt-1 text-[11px] text-muted">The Python runtime downloads only when you open this game.</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[130px] flex-col items-center justify-center text-center">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={() => setRetry((current) => current + 1)} className="mt-4 min-h-11 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-[#4a4b41]">Retry</button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Choose difficulty</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {guessLevels.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    aria-pressed={difficulty === item.name}
                    disabled={submitting || verified.starting}
                    onClick={() => changeDifficulty(item.name)}
                    className={`min-h-11 rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                      difficulty === item.name
                        ? "border-ink bg-ink text-white"
                        : "border-ink/10 bg-[#f8f8f5] hover:border-ink/30"
                    }`}
                  >
                    <span className="block text-xs font-semibold">{item.name}</span>
                    <span className={`mt-1 block text-[9px] ${difficulty === item.name ? "text-white/60" : "text-muted"}`}>
                      1–{item.maximum} · {item.attempts} tries
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted">{level.description}</p>
            </div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-xs">Attempts <strong>{attempts.length}/{level.attempts}</strong></span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted">Range · 1–{level.maximum}</span>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="number-guess">Your guess from 1 to {level.maximum}</label>
              <input
                id="number-guess"
                type="number"
                inputMode="numeric"
                min="1"
                max={level.maximum}
                step="1"
                value={guess}
                onChange={(event) => setGuess(event.target.value)}
                placeholder={`Enter 1–${level.maximum}`}
                disabled={complete || submitting || verified.starting}
                className="min-w-0 flex-1 rounded-full border border-ink/15 px-5 py-3 text-sm outline-none transition focus:border-[#829f35] disabled:bg-[#f8f8f5]"
              />
              <button type="submit" disabled={complete || submitting || verified.starting} className="min-h-11 rounded-full bg-ink px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "Checking…" : "Make a guess"}
              </button>
            </form>

            {message && (
              <p role="status" aria-live="polite" className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${message.startsWith("No guesses left") ? "bg-red-50 text-red-700" : complete ? "bg-[#eef4db] text-[#5d7326]" : "bg-[#f8f8f5] text-ink"}`}>
                {message}
              </p>
            )}

            {complete && (
              <button type="button" onClick={startNewGame} disabled={submitting || verified.starting} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#829f35] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#71862f] disabled:opacity-50">
                <RotateCcw size={14} /> Play again
              </button>
            )}

            {attempts.length > 0 && (
              <div className="mt-5 border-t border-ink/10 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Your guesses</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {attempts.map((attempt, index) => (
                    <span key={`${index}-${attempt.value}`} className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${attempt.result === "correct" ? "bg-[#eef4db] text-[#5d7326]" : "bg-[#f1f0eb] text-muted"}`}>
                      {attempt.value} · {attempt.result === "low" ? "too low" : attempt.result === "high" ? "too high" : "correct"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <details className="mt-4 rounded-lg border border-ink/10 bg-white/70">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-semibold">See the Python code</summary>
        <pre className="overflow-x-auto border-t border-ink/10 px-4 py-4 text-[11px] leading-5 text-muted"><code>{pythonGuessingGame.trim()}</code></pre>
      </details>
      <p className="mt-3 text-center text-[10px] leading-5 text-muted">
        Runs with Python in your browser. Internet is needed to load the Python runtime the first time.
      </p>
    </div>
  );
}

export default function GamesPage() {
  const pathSlug = window.location.pathname.replace(/\/+$/, "").split("/").pop();
  const currentGame = gamePages.find((game) => game.slug === pathSlug);
  const [activeGame] = useState(currentGame?.id || "memory");
  const [gameData, setGameData] = useState({
    players: {},
    weeklyPlayers: [],
    activity: { totalGames: 0, gamesThisWeek: 0 },
    loading: true,
    error: "",
  });
  const [privateRecords, setPrivateRecords] = useState({
    records: [],
    loading: false,
    error: "",
  });
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [visitorId] = useState(getGuestVisitorId);
  const [trackerStatus, setTrackerStatus] = useState({
    connected: false,
    updatedAt: null,
    error: "",
  });

  useEffect(() => {
    if (!currentGame) {
      document.title = "Play Games — Krish Raut";
      return;
    }

    const title = `${currentGame.title} — Play by Krish Raut`;
    const description = currentGame.metaDescription;
    const pageUrl = new URL(`${HOME_PATH}games/${currentGame.slug}/`, window.location.origin);
    const imageUrl = new URL(`${HOME_PATH}${currentGame.shareImage}`, window.location.origin);

    document.title = title;
    for (const [selector, attribute, key, content] of [
      ['meta[name="description"]', "name", "description", description],
      ['meta[property="og:title"]', "property", "og:title", title],
      ['meta[property="og:description"]', "property", "og:description", currentGame.hook],
      ['meta[property="og:url"]', "property", "og:url", pageUrl.href],
      ['meta[property="og:image"]', "property", "og:image", imageUrl.href],
      ['meta[name="twitter:title"]', "name", "twitter:title", title],
      ['meta[name="twitter:description"]', "name", "twitter:description", currentGame.hook],
      ['meta[name="twitter:image"]', "name", "twitter:image", imageUrl.href],
    ]) {
      let tag = document.head.querySelector(selector);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, key);
        document.head.append(tag);
      }
      tag.content = content;
    }

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = pageUrl.href;
  }, [currentGame]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return undefined;
    }

    return listenToAuth((user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    return listenToGameDashboard(
      ({ players, weeklyPlayers, activity }) => {
        setGameData((current) => ({
          ...current,
          players: Object.fromEntries(players.map(({ id, ...player }) => [id, player])),
          weeklyPlayers,
          activity,
          loading: false,
          error: "",
        }));
        setTrackerStatus({
          connected: true,
          updatedAt: new Date().toISOString(),
          error: "",
        });
      },
      (error) => {
        setGameData((current) => ({
          ...current,
          loading: false,
          error: `Could not load the Python game tracker: ${error.message}`,
        }));
        setTrackerStatus((current) => ({
          ...current,
          connected: false,
          error: error.message,
        }));
      },
    );
  }, [currentGame]);

  const profile = authUser ? gameData.players[authUser.uid] : null;

  useEffect(() => {
    if (currentGame) {
      setPrivateRecords({ records: [], loading: false, error: "" });
      return undefined;
    }

    setPrivateRecords((current) => ({ ...current, loading: true, error: "" }));
    return listenToPlayerRecords(
      profile ? authUser : null,
      visitorId,
      (records) => setPrivateRecords({ records, loading: false, error: "" }),
      (error) => setPrivateRecords((current) => ({
        ...current,
        loading: false,
        error: `Could not load your private game history: ${error.message}`,
      })),
    );
  }, [authUser, currentGame, profile?.name, visitorId]);

  async function createProfile(name) {
    if (!authUser) throw new Error("Sign in with Google before creating a player profile.");
    setProfileSaving(true);
    try {
      await createPlayerProfile(authUser, name);
    } finally {
      setProfileSaving(false);
    }
  }

  const startGame = useCallback(
    (game, options, guestVisitorId, usePlayerProfile) =>
      startVerifiedGame(game, options, guestVisitorId, usePlayerProfile),
    [],
  );
  const submitAction = useCallback(
    (sessionId, action, guestVisitorId, usePlayerProfile) =>
      submitVerifiedGameAction(sessionId, action, guestVisitorId, usePlayerProfile),
    [],
  );
  const setScoreError = useCallback((message) => {
    setGameData((current) => ({
      ...current,
      error: `Could not verify score: ${message}`,
    }));
    setTrackerStatus((current) => ({
      ...current,
      connected: false,
      error: message,
    }));
  }, []);
  const clearScoreError = useCallback(() => {
    setGameData((current) => ({
      ...current,
      error: current.error.startsWith("Could not verify score: ") ? "" : current.error,
    }));
  }, []);
  const scoreContext = useMemo(() => ({
    enabled: Boolean(profile),
    trackingEnabled: true,
    visitorId,
    startGame,
    submitAction,
    setScoreError,
    clearScoreError,
  }), [clearScoreError, profile, setScoreError, startGame, submitAction, visitorId]);
  const activeGameOption = gameOptions.find(({ id }) => id === activeGame);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <nav className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-5 sm:px-8">
          <a href={HOME_PATH} className="inline-flex min-h-11 min-w-11 items-center font-display text-sm font-extrabold tracking-[-0.06em]">
            KR<span className="text-[#829f35]">.</span>
          </a>
          <a href={HOME_PATH} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink">
            <ArrowLeft size={14} /> Back to portfolio
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 pb-12 pt-7 sm:px-8 sm:pb-16 sm:pt-16">
        <GameScoreContext.Provider value={scoreContext}>
          {currentGame && trackerStatus.error && (
            <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              The Python tracker could not save this round: {trackerStatus.error}
            </p>
          )}
          <section className="games-enter">
            {currentGame ? (
              <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
                <div>
                  <a href={`${HOME_PATH}games`} className="mb-7 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink">
                    <ArrowLeft size={14} /> All games
                  </a>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                    <Gamepad2 size={15} className="text-[#829f35]" /> Browser game
                  </div>
                  <h1 className="mt-4 font-display text-[clamp(2.75rem,11vw,4.5rem)] font-medium leading-[0.96] tracking-[-0.08em]">
                    {currentGame.title}
                  </h1>
                  <p className="mt-5 max-w-lg text-base leading-7 text-muted">
                    {currentGame.hook}
                  </p>
                  <div className="mt-6 max-w-lg rounded-xl border border-ink/10 bg-white/70 p-4">
                    <h2 className="text-xs font-semibold">How to play</h2>
                    <p className="mt-2 text-xs leading-6 text-muted">{currentGame.howToPlay}</p>
                  </div>
                  <p className="mt-3 max-w-lg text-[11px] leading-5 text-muted">
                    {profile
                      ? "The Python tracker saves your verified result to your player profile."
                      : "The Python tracker saves completed rounds privately in this browser; guest games do not earn leaderboard points."}
                  </p>
                </div>
                <img
                  src={`${HOME_PATH}${currentGame.previewImage}`}
                  alt={`${currentGame.title} game preview`}
                  width="1200"
                  height="630"
                  decoding="async"
                  className="w-full rounded-xl border border-ink/10 bg-white shadow-sm"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                  <Gamepad2 size={15} className="text-[#829f35]" /> A little break
                </div>
                <div className="mt-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-5">
                  <div>
                    <h1 className="font-display text-[clamp(2.75rem,11vw,4.5rem)] font-medium leading-[0.96] tracking-[-0.08em]">
                      Play a little.
                      <br />
                      <span className="text-[#829f35]">Think a lot.</span>
                    </h1>
                    <p className="mt-4 max-w-lg text-sm leading-6 text-muted sm:mt-5">
                      Play without an account: supported solo rounds are verified and tracked privately in this browser. Sign in to save points to the shared leaderboard.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Built with React</span>
                </div>
              </>
            )}
          </section>

          {!currentGame && (
            <GameDashboard
              gameData={gameData}
              privateRecords={privateRecords}
              trackerStatus={trackerStatus}
              authUser={authUser}
              profile={profile}
              authLoading={authLoading}
              profileSaving={profileSaving}
              setError={(error) => setGameData((current) => ({ ...current, error }))}
              onSignIn={signInWithGoogle}
              onSignOut={signOutPlayer}
              onCreateProfile={createProfile}
            />
          )}

          <section className="mt-10" aria-label={currentGame ? "More games" : "Choose a game"}>
            {currentGame && <h2 className="mb-4 font-display text-xl font-semibold tracking-[-0.05em]">More games</h2>}
            <div className="grid gap-3 sm:grid-cols-2">
            {gameOptions.filter((game) => !currentGame || game.id !== currentGame.id).map(({ id, slug, title, description, icon: Icon, meta }, index) => (
              <a
                key={id}
                href={getGameUrl({ slug })}
                style={{ "--card-delay": `${index * 90}ms` }}
                onPointerMove={handleGameCardPointerMove}
                onPointerLeave={handleGameCardPointerLeave}
                className="motion-card game-choice-card game-card-enter flex min-h-[92px] items-center gap-4 rounded-lg border border-ink/10 bg-white/70 p-4 text-left sm:p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eaeae2] text-ink"><Icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="font-display text-base font-semibold tracking-[-0.03em]">{title}</span>
                  <span className="mt-1 block text-xs text-muted">{description}</span>
                  <span className="mt-2 block text-[9px] uppercase tracking-[0.12em] text-muted">{meta}</span>
                </span>
                <ArrowUpRight size={16} className="text-muted" />
              </a>
            ))}
            </div>
          </section>

          <section className="games-enter mt-6 rounded-xl border border-ink/10 bg-white p-3 shadow-sm sm:p-7" aria-label={`${activeGameOption.title} game board`}>
            {activeGame === "memory"
              ? <MemoryGame key={`memory-${profile ? authUser.uid : "guest"}`} />
              : activeGame === "tic-tac-toe"
                ? <TicTacToe key={`tic-tac-toe-${profile ? authUser.uid : "guest"}`} />
                : activeGame === "number-guess"
                  ? <NumberGuessGame key={`number-guess-${profile ? authUser.uid : "guest"}`} />
                  : <ContextGuessGame key={`context-guess-${profile ? authUser.uid : "guest"}`} />}
          </section>
        </GameScoreContext.Provider>

        <AdSenseSlot slotId={import.meta.env.VITE_ADSENSE_GAMES_SLOT} className="mt-10" />

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5 text-[10px] text-muted">
          <span>Made for fun by Krish Raut.</span>
          <nav aria-label="Site information" className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={`${HOME_PATH}about.html`} className="inline-flex min-h-11 min-w-11 items-center transition hover:text-ink">About</a>
            <a href={`${HOME_PATH}contact.html`} className="inline-flex min-h-11 min-w-11 items-center transition hover:text-ink">Contact</a>
            <a href={`${HOME_PATH}privacy-policy.html`} className="inline-flex min-h-11 min-w-11 items-center transition hover:text-ink">Privacy</a>
            <a href={`${HOME_PATH}terms.html`} className="inline-flex min-h-11 min-w-11 items-center transition hover:text-ink">Terms</a>
          </nav>
          <a href={HOME_PATH} className="inline-flex min-h-11 min-w-11 items-center font-semibold transition hover:text-ink">Back to portfolio ↗</a>
        </footer>
      </main>
    </div>
  );
}

function handleGameCardPointerMove(event) {
  if (
    event.pointerType === "touch" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  card.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-4px)`;
}

function handleGameCardPointerLeave(event) {
  event.currentTarget.style.transform = "";
}
