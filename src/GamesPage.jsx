import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
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
  listenToPlayers,
  signInWithGoogle,
  signOutPlayer,
} from "./firebase";
import {
  CONTEXT_UNLISTED_RANK,
  CONTEXT_VOCABULARY_SIZE,
  getContextPuzzle,
} from "./contextModel.js";
import AdSenseSlot from "./AdSenseSlot.jsx";

const RANK_REFRESH_INTERVAL = 2 * 60 * 60 * 1000;
const HOME_PATH = import.meta.env.BASE_URL;
const GameScoreContext = createContext(null);

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

function GameDashboard({
  gameData,
  authUser,
  profile,
  authLoading,
  profileSaving,
  setError,
  setRankRefresh,
  onSignIn,
  onSignOut,
  onCreateProfile,
}) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const updateClockAndRanks = () => {
      const now = Date.now();
      setClock(now);
      setRankRefresh((current) => {
        if (now - current.rankedAt < RANK_REFRESH_INTERVAL) return current;
        return {
          rankedIds: getRankedPlayerIds(gameData.players),
          rankedAt: now,
        };
      });
    };

    const timerId = window.setInterval(updateClockAndRanks, 60_000);
    window.addEventListener("focus", updateClockAndRanks);
    return () => {
      window.clearInterval(timerId);
      window.removeEventListener("focus", updateClockAndRanks);
    };
  }, [gameData.players, setRankRefresh]);

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
  const rankedIds = [
    ...gameData.rankRefresh.rankedIds.filter((id) => players[id]),
    ...Object.keys(players).filter((id) => !gameData.rankRefresh.rankedIds.includes(id)),
  ];
  const remaining = Math.max(0, gameData.rankRefresh.rankedAt + RANK_REFRESH_INTERVAL - clock);
  const remainingHours = Math.floor(remaining / 3_600_000);
  const remainingMinutes = Math.floor((remaining % 3_600_000) / 60_000);

  return (
    <section className="mt-8 rounded-xl border border-ink/10 bg-white/80 p-4 shadow-sm sm:p-6" aria-label="Game leaderboard">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            <Trophy size={15} className="text-[#829f35]" /> Game dashboard
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.06em]">Players & rankings</h2>
          <p className="mt-1 text-[11px] text-muted">Sign in with the same Google account on each device to keep your profile and score.</p>
        </div>
        <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-[10px] font-medium text-muted">
          Next update in {remainingHours}h {remainingMinutes}m
        </span>
      </div>

      {!isFirebaseConfigured && (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Firebase is not configured yet. Add your Firebase web app settings to <code>.env.local</code>, enable Google sign-in, and publish the included Firestore rules.
        </p>
      )}

      {isFirebaseConfigured && (
        <p role="status" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Online score updates are temporarily paused until game results can be verified by a trusted server. Existing leaderboard data remains available.
        </p>
      )}

      <div className="mt-5">
        {authLoading ? (
          <p className="text-xs text-muted">Checking sign-in…</p>
        ) : !authUser ? (
          <button
            type="button"
            disabled={!isFirebaseConfigured}
            onClick={() => onSignIn().catch((error) => setError(error.message))}
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

      {nameError && <p role="alert" className="mt-2 text-[11px] text-red-700">{nameError}</p>}
      {gameData.error && <p role="alert" className="mt-2 text-[11px] text-red-700">{gameData.error}</p>}
      {gameData.loading && <p className="mt-3 text-[11px] text-muted">Loading the shared leaderboard…</p>}
      <p className="mt-2 text-[10px] leading-5 text-muted">
        Player names are unique. Google sign-in securely reconnects your profile on another device.
      </p>

      {rankedIds.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink/15 px-4 py-6 text-center">
          <UserRound size={20} className="mx-auto text-[#829f35]" />
          <p className="mt-2 text-xs font-medium">Sign in and create a player profile to join the leaderboard.</p>
          <p className="mt-1 text-[10px] text-muted">Play games to earn points and climb the ranks.</p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-ink/10">
          <div className="grid grid-cols-[48px_1fr_75px_65px] gap-2 bg-[#f8f8f5] px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wide text-muted sm:grid-cols-[60px_1fr_100px_90px] sm:px-4">
            <span>Rank</span><span>Player</span><span className="text-right">Points</span><span className="text-right">Games</span>
          </div>
          <ol>
            {rankedIds.map((id) => {
              const player = gameData.players[id];
              const rank = gameData.rankRefresh.rankedIds.indexOf(id);
              return (
                <li key={id} className={`grid grid-cols-[48px_1fr_75px_65px] items-center gap-2 border-t border-ink/5 px-3 py-3 text-xs sm:grid-cols-[60px_1fr_100px_90px] sm:px-4 ${id === authUser?.uid ? "bg-[#f3f6eb]" : "bg-white"}`}>
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
      <details className="mt-3 rounded-lg border border-ink/10 bg-[#f8f8f5]">
        <summary className="cursor-pointer px-3 py-2.5 text-[10px] font-semibold">How points work</summary>
        <ul className="space-y-1.5 border-t border-ink/10 px-3 py-2.5 text-[10px] leading-5 text-muted">
          <li>Memory Match: max(10, 120 − 3 × moves).</li>
          <li>Tic-tac-toe vs AI: win 30, draw 10, loss 2. Two-player: X win 15, draw 5, otherwise 1.</li>
          <li>Number Guess: max(10, level tries × 10 − 2 × guesses) for a win; 1 for a loss.</li>
          <li>Context Guess: max(10, 100 − 2 × guesses) when you find the word.</li>
        </ul>
      </details>
      <p className="mt-2 text-[10px] text-muted">The signed-in player receives points. Score totals never reset.</p>
    </section>
  );
}

function useGameScore() {
  const context = useContext(GameScoreContext);
  if (!context) throw new Error("Game components must be rendered inside the game dashboard.");
  return context;
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
  const { recordGame } = useGameScore();
  const [cards, setCards] = useState(createDeck);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const scoredGame = useRef(false);

  useEffect(() => {
    if (matched.length === 6 && !scoredGame.current) {
      scoredGame.current = true;
      recordGame("Memory Match", Math.max(10, 120 - moves * 3), true);
    }
  }, [matched.length, moves, recordGame]);

  useEffect(() => {
    if (flipped.length !== 2) return undefined;
    const [first, second] = flipped;
    if (cards[first].pair === cards[second].pair) {
      setMatched((current) => [...current, cards[first].pair]);
      setFlipped([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setFlipped([]), 750);
    return () => window.clearTimeout(timeoutId);
  }, [cards, flipped]);

  function flipCard(index) {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(cards[index].pair)) return;
    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);
    if (nextFlipped.length === 2) setMoves((current) => current + 1);
  }

  function reset() {
    setCards(createDeck());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    scoredGame.current = false;
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
          <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-xs font-medium">Pairs <strong>{matched.length}/6</strong></span>
          <button type="button" onClick={reset} aria-label="Restart memory game" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white hover:bg-[#eaeae2]"><RotateCcw size={15} /></button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3" role="group" aria-label="Memory match cards">
        {cards.map(({ id, Icon }, index) => {
          const isOpen = flipped.includes(index) || matched.includes(cards[index].pair);
          return (
            <button
              key={id}
              type="button"
              onClick={() => flipCard(index)}
              disabled={isOpen || flipped.length === 2}
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
      {matched.length === 6 && (
        <p role="status" className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-[#71862f]">
          <Check size={17} /> All pairs found in {moves} moves. Nice work!
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
  const { recordGame } = useGameScore();
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("Normal");
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [nextPlayer, setNextPlayer] = useState("X");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const scoredRound = useRef(false);
  const winningLine = getWinningLine(squares);
  const winner = getWinner(squares);
  const draw = !winner && squares.every(Boolean);

  useEffect(() => {
    if ((!winner && !draw) || scoredRound.current) return;
    scoredRound.current = true;
    const points = mode === "ai"
      ? winner === "X" ? 30 : draw ? 10 : 2
      : winner === "X" ? 15 : draw ? 5 : 1;
    recordGame("Tic-tac-toe", points, winner === "X");
  }, [draw, mode, recordGame, winner]);

  useEffect(() => {
    if (mode !== "ai" || nextPlayer !== "O" || winner || draw) return undefined;

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
  }, [difficulty, draw, mode, nextPlayer, squares, winner]);

  useEffect(() => {
    if (!draw) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSquares(Array(9).fill(null));
      setNextPlayer("X");
      scoredRound.current = false;
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [draw]);

  function play(index) {
    if (squares[index] || winner || draw || (mode === "ai" && nextPlayer === "O")) return;
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
    scoredRound.current = false;
  }

  function resetMatch() {
    resetRound();
    setScores({ X: 0, O: 0 });
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    resetMatch();
  }

  function changeDifficulty(nextDifficulty) {
    setDifficulty(nextDifficulty);
    resetRound();
  }

  return (
    <div className="grid items-center gap-7 md:grid-cols-[1fr_0.85fr]">
      <div>
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
              disabled={Boolean(square) || Boolean(winner) || draw || (mode === "ai" && nextPlayer === "O")}
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
            ? `${mode === "ai" ? winner === "X" ? "You win" : "AI wins" : `Player ${winner} wins`} this round!`
            : draw
              ? "It’s a draw — starting a new game…"
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
  const { recordGame } = useGameScore();
  const [puzzle, setPuzzle] = useState(null);
  const [rankByWord, setRankByWord] = useState(null);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modelError, setModelError] = useState("");

  useEffect(() => {
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
  }, []);

  const bestRank = guesses.reduce(
    (best, item) => item.rank < CONTEXT_UNLISTED_RANK && item.rank < best ? item.rank : best,
    Infinity,
  );
  const hasRankedGuesses = bestRank < Infinity;
  const hasUnrankedGuesses = guesses.some((item) => item.rank >= CONTEXT_UNLISTED_RANK);

  function submitGuess(event) {
    event.preventDefault();
    if (!puzzle || !rankByWord || loading) return;
    const word = guess.trim().toLowerCase();

    if (!/^[a-z]+$/.test(word)) {
      setMessage("Enter one English word using letters only.");
      return;
    }

    if (guesses.some((item) => item.word === word)) {
      setMessage("You already guessed that word. Try another one.");
      return;
    }

    if (word === puzzle) {
      setGuesses((current) => [...current, { word, rank: 1 }]);
      setMessage(`You found it — “${puzzle}” is rank #1!`);
      setWon(true);
      recordGame("Context Guess", Math.max(10, 100 - guesses.length * 2), true);
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

    try {
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
              {won ? puzzle : "?????"}
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
            disabled={won || loading || Boolean(modelError)}
            className="min-w-0 flex-1 rounded-full border border-ink/15 px-5 py-3 text-sm outline-none transition focus:border-[#829f35] disabled:bg-[#f8f8f5]"
          />
          <button type="submit" disabled={won || loading || Boolean(modelError)} className="rounded-full bg-ink px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-50">
            Guess word
          </button>
        </form>

        {(loading || modelError || message) && (
          <p role="status" aria-live="polite" className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${won ? "bg-[#eef4db] text-[#5d7326]" : "bg-[#f8f8f5] text-ink"}`}>
            {modelError || message || "Loading the semantic vocabulary…"}
          </p>
        )}

        {won && (
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
  const { recordGame } = useGameScore();
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
  }, [retry]);

  const level = guessLevels.find((item) => item.name === difficulty);

  async function handleSubmit(event) {
    event.preventDefault();
    const value = Number(guess);
    if (!runtime || submitting || complete || !Number.isInteger(value) || value < 1 || value > level.maximum) {
      setMessage(`Enter a whole number from 1 to ${level.maximum}.`);
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const resultJson = await runtime.runPythonAsync(`submit_guess(${value})`);
      const result = JSON.parse(resultJson);
      setAttempts((current) => [...current, { value, result: result.result }]);
      setMessage(result.message);
      setComplete(result.result === "correct" || result.result === "lost");
      if (result.result === "correct" || result.result === "lost") {
        const points = result.result === "correct"
          ? Math.max(10, level.attempts * 10 - result.attempts * 2)
          : 1;
        recordGame("Number Guess", points, result.result === "correct");
      }
      setGuess("");
    } catch {
      setMessage("Something went wrong while checking that guess. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startNewGame() {
    if (!runtime || submitting) return;
    setSubmitting(true);
    try {
      await runtime.runPythonAsync("reset_game()");
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
    if (!runtime || submitting || nextDifficulty === difficulty) return;
    const nextLevel = guessLevels.find((item) => item.name === nextDifficulty);
    setSubmitting(true);
    try {
      await runtime.runPythonAsync(
        `set_level(${nextLevel.maximum}, ${nextLevel.attempts})`,
      );
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
                    disabled={submitting}
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
                disabled={complete || submitting}
                className="min-w-0 flex-1 rounded-full border border-ink/15 px-5 py-3 text-sm outline-none transition focus:border-[#829f35] disabled:bg-[#f8f8f5]"
              />
              <button type="submit" disabled={complete || submitting} className="rounded-full bg-ink px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "Checking…" : "Make a guess"}
              </button>
            </form>

            {message && (
              <p role="status" aria-live="polite" className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${message.startsWith("No guesses left") ? "bg-red-50 text-red-700" : complete ? "bg-[#eef4db] text-[#5d7326]" : "bg-[#f8f8f5] text-ink"}`}>
                {message}
              </p>
            )}

            {complete && (
              <button type="button" onClick={startNewGame} disabled={submitting} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#829f35] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#71862f] disabled:opacity-50">
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
    loading: true,
    error: "",
  });
  const [rankRefresh, setRankRefresh] = useState({
    rankedIds: [],
    rankedAt: Date.now(),
  });
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      setGameData((current) => ({ ...current, loading: false }));
      return undefined;
    }

    return listenToAuth((user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    let firstSnapshot = true;
    return listenToPlayers(
      (playerList) => {
        const players = Object.fromEntries(playerList.map(({ id, ...player }) => [id, player]));
        setGameData((current) => ({ ...current, players, loading: false, error: "" }));
        setRankRefresh((current) => {
          const now = Date.now();
          if (firstSnapshot || now - current.rankedAt >= RANK_REFRESH_INTERVAL) {
            firstSnapshot = false;
            return { rankedIds: getRankedPlayerIds(players), rankedAt: now };
          }
          firstSnapshot = false;
          return {
            ...current,
            rankedIds: [
              ...current.rankedIds.filter((id) => players[id]),
              ...Object.keys(players).filter((id) => !current.rankedIds.includes(id)),
            ],
          };
        });
      },
      (error) => {
        setGameData((current) => ({
          ...current,
          loading: false,
          error: `Could not load the Firebase leaderboard: ${error.message}`,
        }));
      },
    );
  }, []);

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

  const recordGame = useCallback((game) => {
    setGameData((current) => ({
      ...current,
      error: `Online score updates are paused; your ${game} result was not saved.`,
    }));
  }, []);

  const scoreContext = useMemo(() => ({ recordGame }), [recordGame]);

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
                  A small collection of browser games you can play without an account. Sign in only if you want a leaderboard profile.
                </p>
              </div>
              <span className="rounded-full bg-[#eaeae2] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Built with React</span>
            </div>
          </section>

          <GameDashboard
            gameData={{ ...gameData, rankRefresh }}
            authUser={authUser}
            profile={profile}
            authLoading={authLoading}
            profileSaving={profileSaving}
            setError={(error) => setGameData((current) => ({ ...current, error }))}
            setRankRefresh={setRankRefresh}
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
              ? <MemoryGame key="memory" />
              : activeGame === "tic-tac-toe"
                ? <TicTacToe key="tic-tac-toe" />
                : activeGame === "number-guess"
                  ? <NumberGuessGame key="number-guess" />
                  : <ContextGuessGame key="context-guess" />}
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
