import json
import random
import re
import unicodedata
from array import array
from functools import lru_cache
from pathlib import Path

NUMBER_LEVELS = {
    "Easy": {"maximum": 20, "attempts": 10},
    "Medium": {"maximum": 100, "attempts": 8},
    "Hard": {"maximum": 500, "attempts": 8},
    "Advanced": {"maximum": 1000, "attempts": 7},
}
WIN_LINES = (
    (0, 1, 2), (3, 4, 5), (6, 7, 8),
    (0, 3, 6), (1, 4, 7), (2, 5, 8),
    (0, 4, 8), (2, 4, 6),
)
DATA_DIRECTORY = Path(__file__).parent / "data"


class GameError(ValueError):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


def score_delta(outcome: str) -> int:
    if outcome == "win":
        return 10
    if outcome == "loss":
        return -10
    if outcome == "draw":
        return 0
    raise GameError(400, "Invalid game outcome.")


@lru_cache(maxsize=1)
def get_vocabulary() -> tuple[list[str], dict[str, int], array]:
    vocabulary_path = DATA_DIRECTORY / "context-vocabulary-10000-v2.json"
    vectors_path = DATA_DIRECTORY / "context-vectors-10000-v2.bin"
    try:
        vocabulary_data = json.loads(vocabulary_path.read_text(encoding="utf-8"))
        raw_vectors = vectors_path.read_bytes()
    except OSError as error:
        raise RuntimeError("Context Guess server data is not installed.") from error

    vocabulary = vocabulary_data.get("words")
    dimension = vocabulary_data.get("dimension")
    if (
        vocabulary_data.get("schemaVersion") != 2
        or dimension != 384
        or not isinstance(vocabulary, list)
        or len(vocabulary) != 10_000
        or any(not isinstance(word, str) for word in vocabulary)
        or len(raw_vectors) != len(vocabulary) * dimension
    ):
        raise RuntimeError("Context Guess server data is invalid.")

    vectors = array("b")
    vectors.frombytes(raw_vectors)
    if vectors.itemsize != 1:
        raise RuntimeError("The server does not support byte-sized model vectors.")
    return vocabulary, {word: index for index, word in enumerate(vocabulary)}, vectors


def get_ranked_words(answer: str) -> list[str]:
    vocabulary, word_indices, vectors = get_vocabulary()
    answer_index = word_indices[answer]
    answer_vector = memoryview(vectors)[answer_index * 384 : (answer_index + 1) * 384]
    similarities = []
    for index in range(len(vocabulary)):
        if index == answer_index:
            similarity = float("inf")
        else:
            offset = index * 384
            vector = memoryview(vectors)[offset : offset + 384]
            similarity = sum(first * second for first, second in zip(answer_vector, vector))
        similarities.append((-similarity, vocabulary[index]))
    similarities.sort()
    return [word for _, word in similarities]


def create_game_state(game: object, options: object = None) -> dict:
    if options is None:
        options = {}
    if (
        not isinstance(options, dict)
        or any(key != "difficulty" for key in options)
    ):
        raise GameError(400, "Invalid game options.")

    if game == "memory":
        deck = [pair for pair in range(6) for _ in range(2)]
        random.SystemRandom().shuffle(deck)
        return {"game": game, "deck": deck, "matched": [], "moves": 0}
    if game == "number-guess":
        difficulty = options.get("difficulty", "Easy")
        level = NUMBER_LEVELS.get(difficulty)
        if level is None:
            raise GameError(400, "Invalid number game difficulty.")
        return {
            "game": game,
            "secret": random.SystemRandom().randint(1, level["maximum"]),
            "maximum": level["maximum"],
            "maximumAttempts": level["attempts"],
            "attempts": 0,
        }
    if game == "tic-tac-toe":
        difficulty = options.get("difficulty", "Normal")
        if difficulty not in {"Normal", "Medium", "Hard"}:
            raise GameError(400, "Invalid AI difficulty.")
        return {"game": game, "difficulty": difficulty, "board": [None] * 9}
    if game == "context-guess":
        vocabulary, _, _ = get_vocabulary()
        answer = random.SystemRandom().choice(vocabulary)
        return {
            "game": game,
            "answer": answer,
            "rankedWords": "\n".join(get_ranked_words(answer)),
            "guesses": [],
            "maximumAttempts": 500,
        }
    raise GameError(400, "Unknown game.")


def winner_for(board: list[str | None]) -> str | None:
    for first, second, third in WIN_LINES:
        if board[first] and board[first] == board[second] == board[third]:
            return board[first]
    return None


def best_ai_move(board: list[str | None]) -> int:
    def minimax(next_board: list[str | None], player: str, depth: int) -> int:
        winner = winner_for(next_board)
        if winner == "O":
            return 10 - depth
        if winner == "X":
            return depth - 10
        if all(next_board):
            return 0

        scores = []
        for index, square in enumerate(next_board):
            if square is not None:
                continue
            candidate = next_board.copy()
            candidate[index] = player
            scores.append(minimax(candidate, "X" if player == "O" else "O", depth + 1))
        return max(scores) if player == "O" else min(scores)

    best_move = -1
    best_score = float("-inf")
    for index, square in enumerate(board):
        if square is not None:
            continue
        candidate = board.copy()
        candidate[index] = "O"
        score = minimax(candidate, "X", 1)
        if score > best_score:
            best_score = score
            best_move = index
    return best_move


def choose_ai_move(board: list[str | None], difficulty: str) -> int:
    available = [index for index, square in enumerate(board) if square is None]
    if difficulty == "Hard":
        return best_ai_move(board)
    if difficulty == "Medium":
        for player in ("O", "X"):
            for index in available:
                candidate = board.copy()
                candidate[index] = player
                if winner_for(candidate) == player:
                    return index
        if 4 in available:
            return 4
        corners = [index for index in available if index in {0, 2, 6, 8}]
        return random.SystemRandom().choice(corners or available)
    return random.SystemRandom().choice(available)


def require_integer(value: object, minimum: int, maximum: int, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise GameError(400, f"Invalid {field}.")
    return value


def apply_action(session: dict, action: object) -> tuple[dict, str | None, dict]:
    if not isinstance(action, dict) or not isinstance(action.get("type"), str):
        raise GameError(400, "Invalid game action.")

    game = session.get("game")
    action_type = action["type"]
    if game == "memory" and action_type == "memoryTurn":
        first = require_integer(action.get("first"), 0, 11, "first card")
        second = require_integer(action.get("second"), 0, 11, "second card")
        matched_cards = session["matched"]
        if first == second or first in matched_cards or second in matched_cards:
            raise GameError(409, "Choose two different unmatched cards.")
        first_pair = session["deck"][first]
        second_pair = session["deck"][second]
        matched = matched_cards + [first, second] if first_pair == second_pair else matched_cards
        updated = {**session, "matched": matched, "moves": session["moves"] + 1}
        outcome = "win" if len(matched) == 12 else None
        return updated, outcome, {
            "pairs": [first_pair, second_pair],
            "matched": matched,
            "moves": updated["moves"],
        }

    if game == "number-guess" and action_type == "numberGuess":
        if session["attempts"] >= session["maximumAttempts"]:
            raise GameError(409, "This number game has ended.")
        guess = require_integer(action.get("guess"), 1, session["maximum"], "guess")
        attempts = session["attempts"] + 1
        outcome = (
            "win" if guess == session["secret"]
            else "loss" if attempts >= session["maximumAttempts"]
            else None
        )
        status = (
            "correct" if outcome == "win"
            else "lost" if outcome == "loss"
            else "low" if guess < session["secret"]
            else "high"
        )
        result = {
            "status": status,
            "attempts": attempts,
            "maximumAttempts": session["maximumAttempts"],
        }
        if outcome:
            result["answer"] = session["secret"]
        return {**session, "attempts": attempts}, outcome, result

    if game == "tic-tac-toe" and action_type == "ticTacToeMove":
        index = require_integer(action.get("index"), 0, 8, "square")
        board = session["board"].copy()
        if board[index] is not None:
            raise GameError(409, "That square is already occupied.")
        board[index] = "X"
        winner = winner_for(board)
        outcome = "win" if winner == "X" else "draw" if all(board) else None
        if outcome is None:
            ai_index = choose_ai_move(board, session["difficulty"])
            if ai_index < 0:
                raise GameError(500, "The AI could not make a move.")
            board[ai_index] = "O"
            winner = winner_for(board)
            outcome = "loss" if winner == "O" else "draw" if all(board) else None
        return {**session, "board": board}, outcome, {
            "board": board,
            "winner": winner,
            "draw": outcome == "draw",
            "nextPlayer": None if outcome else "X",
        }

    if game == "context-guess" and action_type == "contextGuess":
        raw_guess = action.get("guess")
        if not isinstance(raw_guess, str):
            raise GameError(400, "Enter one English word using letters only.")
        guess = unicodedata.normalize("NFKC", raw_guess).strip().lower()
        if re.fullmatch(r"[a-z]{1,40}", guess) is None:
            raise GameError(400, "Enter one English word using letters only.")
        guesses = session["guesses"]
        if guess in guesses:
            raise GameError(409, "You already guessed that word.")
        next_guesses = guesses + [guess]
        outcome = (
            "win" if guess == session["answer"]
            else "loss" if len(next_guesses) >= session["maximumAttempts"]
            else None
        )
        ranked_words = session["rankedWords"].split("\n")
        try:
            rank = ranked_words.index(guess) + 1
        except ValueError:
            rank = len(ranked_words) + 1
        result = {
            "status": "correct" if outcome == "win" else "lost" if outcome == "loss" else "incorrect",
            "rank": rank,
            "guesses": len(next_guesses),
            "maximumAttempts": session["maximumAttempts"],
        }
        if outcome:
            result["answer"] = session["answer"]
        return {**session, "guesses": next_guesses}, outcome, result

    raise GameError(400, "That action is not valid for this game.")
