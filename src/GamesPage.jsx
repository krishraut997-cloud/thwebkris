import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Asterisk,
  Brain,
  Check,
  Circle,
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
  isFirebaseConfigured,
  listenToAuth,
  listenToGameDashboard,
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

const HOME_PATH = import.meta.env.BASE_URL;
const GameScoreContext = createContext(null);

function getSignInErrorMessage(error) {
  if (error?.code === "auth/unauthorized-domain") {
    const hostname = window.location.hostname;
    return `Firebase sign-in is not enabled for ${hostname}. Open this page at http://localhost:5173 for local development, or add ${hostname} under Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  return error?.message || "Google sign-in failed. Please try again.";
}

function GameDashboard({
  gameData,
  authUser,
  profile,
  authLoading,
  profileSaving,
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

  const player = authUser ? gameData.players[authUser.uid] : null;
  return (
    <section className="mt-8 rounded-xl border border-ink/10 bg-white/80 p-4 shadow-sm sm:p-6" aria-label="Personal game dashboard">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            <Trophy size={15} className="text-[#829f35]" /> Game dashboard
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.06em]">Your game stats</h2>
          <p className="mt-1 text-[11px] text-muted">Your score and game history are private to your account.</p>
        </div>
        <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-[10px] font-medium text-muted">
          Private dashboard
        </span>
      </div>

      {!isFirebaseConfigured && (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Google sign-in is not configured yet. Add your Firebase web app settings to <code>.env.local</code> and enable Google sign-in.
        </p>
      )}

      {profile && (
        <p role="status" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Verified solo wins add 10 points, losses subtract 10, and draws add 0. Local two-player Tic-tac-toe is not ranked.
        </p>
      )}

      <div className="mt-5">
        {authLoading ? (
          <p className="text-xs text-muted">Checking sign-in…</p>
        ) : !authUser ? (
          <button
            type="button"
            disabled={!isFirebaseConfigured}
            onClick={() => onSignIn().catch((error) => setError(getSignInErrorMessage(error)))}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={14} /> Continue with Google
          </button>
        ) : profile ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f3f6eb] px-4 py-3">
            <p className="text-xs font-medium">
              Playing as <span className="font-semibold">{profile.name}</span>
              <span className="ml-2 text-[10px] text-muted">({authUser.email})</span>
            </p>
            <button type="button" onClick={() => onSignOut().catch((error) => setError(error.message))} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted hover:text-ink">
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
            <button type="submit" disabled={profileSaving} className="rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-wait disabled:opacity-60">
              {profileSaving ? "Creating profile…" : "Create player"}
            </button>
          </form>
        )}
      </div>

      {!profile && nameError && <p role="alert" className="mt-2 text-[11px] text-red-700">{nameError}</p>}
      {gameData.error && <p role="alert" className="mt-2 text-[11px] text-red-700">{gameData.error}</p>}
      {gameData.loading && authUser && <p className="mt-3 text-[11px] text-muted">Loading your game stats…</p>}
      <p className="mt-2 text-[10px] leading-5 text-muted">
        Player names are unique. Only you can see your score and verified game records.
      </p>

      {!authUser ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink/15 px-4 py-6 text-center">
          <UserRound size={20} className="mx-auto text-[#829f35]" />
          <p className="mt-2 text-xs font-medium">Sign in to see your personal game stats.</p>
          <p className="mt-1 text-[10px] text-muted">Other players’ scores and game records are never shown here.</p>
        </div>
      ) : !player ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink/15 px-4 py-6 text-center">
          <UserRound size={20} className="mx-auto text-[#829f35]" />
          <p className="mt-2 text-xs font-medium">Create your player profile to start tracking your scores.</p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-ink/10">
          <div className="grid grid-cols-[1fr_75px_65px] gap-2 bg-[#f8f8f5] px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[1fr_100px_90px] sm:px-4">
            <span>Player</span><span className="text-right">Points</span><span className="text-right">Games</span>
          </div>
          <ol>
            <li className="grid grid-cols-[1fr_75px_65px] items-center gap-2 border-t border-ink/5 bg-[#f3f6eb] px-3 py-3 text-xs sm:grid-cols-[1fr_100px_90px] sm:px-4">
              <span className="truncate font-medium">{player.name}</span>
              <span className="text-right font-semibold">{player.points}</span>
              <span className="text-right text-muted">{player.gamesPlayed}</span>
            </li>
          </ol>
        </div>
      )}
      <section className="mt-5 overflow-hidden rounded-lg border border-ink/10 bg-white" aria-label="Recent game records">
        <div className="flex items-center justify-between bg-[#f8f8f5] px-3 py-2.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted">Your recent games</h3>
          {authUser && <span className="text-[9px] text-muted">Updates as your games finish</span>}
        </div>
        {!authUser ? (
          <p className="px-3 py-4 text-[11px] text-muted">Sign in to view your private game history.</p>
        ) : gameData.recordsLoading ? (
          <p className="px-3 py-4 text-[11px] text-muted">Loading your verified game records…</p>
        ) : gameData.recentRecords.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-muted">Your verified wins, losses, and draws will appear here.</p>
        ) : (
          <ol className="divide-y divide-ink/5">
            {gameData.recentRecords.map((record) => {
              const happenedAt = record.createdAt ? new Date(record.createdAt) : null;
              const pointChange = record.pointsDelta > 0
                ? `+${record.pointsDelta}`
                : `${record.pointsDelta}`;
              return (
                <li key={record.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2.5 text-[11px] sm:grid-cols-[1fr_auto_auto]">
                  <span className="min-w-0 truncate">
                    <strong className="font-semibold">{record.game}</strong>
                    <span className="ml-1 capitalize text-muted">· {record.outcome}</span>
                  </span>
                  <span className={`font-semibold ${record.pointsDelta > 0 ? "text-[#5d7326]" : record.pointsDelta < 0 ? "text-red-700" : "text-muted"}`}>
                    {pointChange} points
                  </span>
                  <time className="col-span-2 text-[9px] text-muted sm:col-span-1" dateTime={happenedAt?.toISOString()}>
                    {happenedAt ? happenedAt.toLocaleString() : "Just now"}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <details className="mt-3 rounded-lg border border-ink/10 bg-[#f8f8f5]">
        <summary className="cursor-pointer px-3 py-2.5 text-[10px] font-semibold">How points work</summary>
        <ul className="space-y-1.5 border-t border-ink/10 px-3 py-2.5 text-[10px] leading-5 text-muted">
          <li>Every verified win adds 10 points; every verified loss subtracts 10; draws change points by 0.</li>
          <li>Only signed-in solo games and Tic-tac-toe vs AI update your personal score.</li>
          <li>Your dashboard only shows your own score and game records.</li>
        </ul>
      </details>
      <p className="mt-2 text-[10px] text-muted">Your score and recent game records update live. Score totals never reset.</p>
    </section>
  );
}

function useGameScore() {
  const context = useContext(GameScoreContext);
  if (!context) throw new Error("Game components must be rendered inside the game dashboard.");
  return context;
}

function useVerifiedGame(game, enabled) {
  const { startGame, submitAction, setScoreError, clearScoreError } = useGameScore();
  const [sessionId, setSessionId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = useCallback(async (options = {}) => {
    if (!enabled) return null;
    setStarting(true);
    setSessionId(null);
    try {
      const nextSessionId = await startGame(game, options);
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
  }, [clearScoreError, enabled, game, setScoreError, startGame]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      setSessionId(null);
      setFailed(false);
      setStarting(false);
    }
  }, [enabled, start]);

  const action = useCallback(async (payload) => {
    if (!sessionId) throw new Error("The verified game is not ready.");
    try {
      const result = await submitAction(sessionId, payload);
      clearScoreError();
      return result;
    } catch (error) {
      setScoreError(error.message || "The game result could not be verified.");
      throw error;
    }
  }, [clearScoreError, sessionId, setScoreError, submitAction]);

  return { sessionId, starting, failed, start, action };
}

const gameOptions = [
  { id: "memory", title: "Memory match", description: "Find the matching pairs.", icon: Brain, meta: "1 player · Quick" },
  { id: "tic-tac-toe", title: "Tic-tac-toe", description: "Play against the AI or challenge a friend.", icon: Circle, meta: "AI · 2 players" },
  { id: "number-guess", title: "Number guess", description: "Can you find the secret number?", icon: Hash, meta: "Python · 4 difficulty levels" },
  { id: "context-guess", title: "Context Guess", description: "Explore meaning to find the hidden word.", icon: MessageCircle, meta: "Word puzzle · Semantic ranks" },
];

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
  const { enabled } = useGameScore();
  const verified = useVerifiedGame("memory", enabled);
  const [cards, setCards] = useState(createDeck);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameError, setGameError] = useState("");
  const verifiedPending = enabled && !verified.sessionId && !verified.failed;

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
          <button type="button" onClick={reset} disabled={flipped.length === 2 || verifiedPending} aria-label="Restart memory game" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white hover:bg-[#eaeae2] disabled:opacity-50"><RotateCcw size={15} /></button>
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
          <Check size={17} /> All pairs found in {moves} moves. Nice work!{verified.sessionId ? " +10 points." : ""}
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
  const { enabled } = useGameScore();
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("Normal");
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [nextPlayer, setNextPlayer] = useState("X");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [movePending, setMovePending] = useState(false);
  const [moveError, setMoveError] = useState("");
  const verified = useVerifiedGame("tic-tac-toe", enabled && mode === "ai");
  const winningLine = getWinningLine(squares);
  const winner = getWinner(squares);
  const draw = !winner && squares.every(Boolean);
  const startVerified = verified.start;
  const verifiedPending = enabled && mode === "ai" && !verified.sessionId && !verified.failed;

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
      if (enabled && mode === "ai") startVerified({ difficulty });
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [difficulty, draw, enabled, mode, startVerified]);

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
    if (enabled && mode === "ai") verified.start({ difficulty });
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
    if (nextMode === mode && enabled && nextMode === "ai") {
      startVerified({ difficulty });
    }
  }

  function changeDifficulty(nextDifficulty) {
    setDifficulty(nextDifficulty);
    setSquares(Array(9).fill(null));
    setNextPlayer("X");
    if (enabled && mode === "ai") startVerified({ difficulty: nextDifficulty });
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
          <button type="button" aria-pressed={mode === "ai"} onClick={() => changeMode("ai")} className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${mode === "ai" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>Play vs AI</button>
          <button type="button" aria-pressed={mode === "two-player"} onClick={() => changeMode("two-player")} className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${mode === "two-player" ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>2 players</button>
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
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
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
            ? `${mode === "ai" ? winner === "X" ? "You win" : "AI wins" : `Player ${winner} wins`} this round!${mode === "ai" && verified.sessionId ? winner === "X" ? " +10 points." : " -10 points." : ""}`
            : draw
              ? `It’s a draw — starting a new game…${mode === "ai" && verified.sessionId ? " 0 points." : ""}`
              : mode === "ai" && nextPlayer === "O"
                ? "AI is thinking…"
                : mode === "ai"
                  ? "Your turn — you are X"
                  : `Player ${nextPlayer}’s turn`}
        </p>
        <details className="mt-4 max-w-[360px] rounded-lg border border-ink/10 bg-white text-left">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold marker:hidden">
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
          <button type="button" onClick={resetRound} className="rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#4a4b41]">New round</button>
          <button type="button" onClick={resetMatch} className="rounded-full border border-ink/15 px-4 py-2.5 text-xs font-semibold hover:bg-[#eaeae2]">Reset scores</button>
        </div>
      </div>
    </div>
  );
}

function ContextGuessGame() {
  const { enabled } = useGameScore();
  const verified = useVerifiedGame("context-guess", enabled);
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
    if (enabled && !verified.failed) return undefined;
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
  }, [enabled, verified.failed]);

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
          setMessage(`You found it — “${result.answer}” is rank #1! +10 points.`);
        } else if (result.status === "lost") {
          setPuzzle(result.answer);
          setComplete(true);
          setMessage(`No guesses left. The word was “${result.answer}”. -10 points.`);
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
      if (enabled && await verified.start()) {
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
          <button type="submit" disabled={complete || loading || guessPending || Boolean(modelError)} className="rounded-full bg-ink px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-50">
            Guess word
          </button>
        </form>

        {(loading || modelError || message) && (
          <p role="status" aria-live="polite" className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${won ? "bg-[#eef4db] text-[#5d7326]" : "bg-[#f8f8f5] text-ink"}`}>
            {modelError || message || "Loading the semantic vocabulary…"}
          </p>
        )}

        {complete && (
          <button type="button" onClick={startNewPuzzle} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#829f35] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#71862f] disabled:cursor-wait disabled:opacity-60">
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
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold">How ranking works</summary>
        <p className="border-t border-ink/10 px-4 py-3 text-[11px] leading-5 text-muted">
          Guesses are ranked by cosine similarity to the mystery word using a pretrained MiniLM semantic model and this game's {CONTEXT_VOCABULARY_SIZE.toLocaleString()}-word English vocabulary. Words outside the vocabulary show #{CONTEXT_UNLISTED_RANK.toLocaleString()}+. This is an original implementation and does not use Contexto's proprietary word list or model.
        </p>
      </details>
    </div>
  );
}

function NumberGuessGame() {
  const { enabled } = useGameScore();
  const verified = useVerifiedGame("number-guess", enabled);
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
    if (enabled && !verified.failed) {
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
  }, [enabled, retry, verified.failed, verified.sessionId]);

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
          ? `You got it! The number was ${result.answer}. +10 points.`
          : result.status === "lost"
            ? `No guesses left. The number was ${result.answer}. -10 points.`
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
      if (enabled) await verified.start({ difficulty });
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
      if (enabled) await verified.start({ difficulty: nextDifficulty });
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
            <button type="button" onClick={() => setRetry((current) => current + 1)} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-[#4a4b41]">Retry</button>
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
                    className={`rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-60 ${
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
              <button type="submit" disabled={complete || submitting || verified.starting} className="rounded-full bg-ink px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "Checking…" : "Make a guess"}
              </button>
            </form>

            {message && (
              <p role="status" aria-live="polite" className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${message.startsWith("No guesses left") ? "bg-red-50 text-red-700" : complete ? "bg-[#eef4db] text-[#5d7326]" : "bg-[#f8f8f5] text-ink"}`}>
                {message}
              </p>
            )}

            {complete && (
              <button type="button" onClick={startNewGame} disabled={submitting || verified.starting} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#829f35] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#71862f] disabled:opacity-50">
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
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold">See the Python code</summary>
        <pre className="overflow-x-auto border-t border-ink/10 px-4 py-4 text-[11px] leading-5 text-muted"><code>{pythonGuessingGame.trim()}</code></pre>
      </details>
      <p className="mt-3 text-center text-[10px] leading-5 text-muted">
        Runs with Python in your browser. Internet is needed to load the Python runtime the first time.
      </p>
    </div>
  );
}

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState("memory");
  const [gameData, setGameData] = useState({
    players: {},
    recentRecords: [],
    loading: true,
    recordsLoading: true,
    error: "",
  });
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

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
    if (authLoading) return undefined;
    setGameData((current) => ({
      ...current,
      players: {},
      recentRecords: [],
      loading: Boolean(authUser),
      recordsLoading: Boolean(authUser),
      error: "",
    }));
    return listenToGameDashboard(
      authUser,
      ({ players, recentRecords }) => {
        setGameData((current) => ({
          ...current,
          players: Object.fromEntries(players.map(({ id, ...player }) => [id, player])),
          recentRecords,
          loading: false,
          recordsLoading: false,
          error: "",
        }));
      },
      (error) => {
        setGameData((current) => ({
          ...current,
          loading: false,
          recordsLoading: false,
          error: `Could not load the Python game tracker: ${error.message}`,
        }));
      },
    );
  }, [authLoading, authUser]);

  const profile = authUser ? gameData.players[authUser.uid] : null;

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
    (game, options) => startVerifiedGame(game, options),
    [],
  );
  const submitAction = useCallback(
    (sessionId, action) => submitVerifiedGameAction(sessionId, action),
    [],
  );
  const setScoreError = useCallback((message) => {
    setGameData((current) => ({
      ...current,
      error: `Could not verify score: ${message}`,
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
    startGame,
    submitAction,
    setScoreError,
    clearScoreError,
  }), [clearScoreError, profile, setScoreError, startGame, submitAction]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <nav className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-5 sm:px-8">
          <a href={HOME_PATH} className="font-display text-sm font-extrabold tracking-[-0.06em]">
            KR<span className="text-[#829f35]">.</span>
          </a>
          <a href={HOME_PATH} className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink">
            <ArrowLeft size={14} /> Back to portfolio
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        <GameScoreContext.Provider value={scoreContext}>
          <section className="games-enter">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              <Gamepad2 size={15} className="text-[#829f35]" /> A little break
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="font-display text-5xl font-medium leading-[0.96] tracking-[-0.08em] sm:text-7xl">
                  Play a little.
                  <br />
                  <span className="text-[#829f35]">Think a lot.</span>
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-6 text-muted">
                  A small collection of browser games you can play without an account. Sign in to privately track your own scores.
                </p>
              </div>
              <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Built with React</span>
            </div>
          </section>

          <GameDashboard
            gameData={gameData}
            authUser={authUser}
            profile={profile}
            authLoading={authLoading}
            profileSaving={profileSaving}
            setError={(error) => setGameData((current) => ({ ...current, error }))}
            onSignIn={signInWithGoogle}
            onSignOut={signOutPlayer}
            onCreateProfile={createProfile}
          />

          <section className="mt-10 grid gap-3 sm:grid-cols-2" aria-label="Choose a game">
            {gameOptions.map(({ id, title, description, icon: Icon, meta }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveGame(id)}
                aria-pressed={activeGame === id}
                className={`flex items-center gap-4 rounded-lg border p-4 text-left transition sm:p-5 ${
                  activeGame === id
                    ? "border-ink bg-ink text-paper shadow-lg"
                    : "border-ink/10 bg-white/70 hover:border-ink/30"
                }`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${activeGame === id ? "bg-[#b5d943] text-ink" : "bg-[#eaeae2] text-ink"}`}><Icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-display text-base font-semibold tracking-[-0.03em]">{title}{activeGame === id && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-medium">Playing</span>}</span>
                  <span className={`mt-1 block text-xs ${activeGame === id ? "text-paper/65" : "text-muted"}`}>{description}</span>
                  <span className={`mt-2 block text-[9px] uppercase tracking-[0.12em] ${activeGame === id ? "text-paper/45" : "text-muted"}`}>{meta}</span>
                </span>
                <ArrowUpRight size={16} className={activeGame === id ? "text-[#b5d943]" : "text-muted"} />
              </button>
            ))}
          </section>

          <section className="games-enter mt-6 rounded-xl border border-ink/10 bg-white/80 p-4 shadow-sm sm:p-7" aria-label="Game board">
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
          <nav aria-label="Site information" className="flex flex-wrap gap-x-4 gap-y-2">
            <a href={`${HOME_PATH}about.html`} className="transition hover:text-ink">About</a>
            <a href={`${HOME_PATH}contact.html`} className="transition hover:text-ink">Contact</a>
            <a href={`${HOME_PATH}privacy-policy.html`} className="transition hover:text-ink">Privacy</a>
            <a href={`${HOME_PATH}terms.html`} className="transition hover:text-ink">Terms</a>
          </nav>
          <a href={HOME_PATH} className="font-semibold transition hover:text-ink">Back to portfolio ↗</a>
        </footer>
      </main>
    </div>
  );
}
