import unittest

from score_backend.game_logic import GameError, apply_action, create_game_state, score_delta


class ScoreRuleTests(unittest.TestCase):
    def test_win_adds_ten_points(self):
        self.assertEqual(score_delta("win"), 10)

    def test_loss_subtracts_ten_points_below_zero(self):
        self.assertEqual(score_delta("loss"), -10)
        self.assertEqual(-5 + score_delta("loss"), -15)

    def test_draw_changes_no_points(self):
        self.assertEqual(score_delta("draw"), 0)

    def test_unknown_outcome_is_rejected(self):
        with self.assertRaises(GameError):
            score_delta("unverified")


class VerifiedGameTests(unittest.TestCase):
    def test_memory_win_is_derived_from_server_deck(self):
        session = create_game_state("memory")
        for pair in range(6):
            first, second = [
                index for index, value in enumerate(session["deck"])
                if value == pair
            ]
            session, outcome, _ = apply_action(
                session,
                {"type": "memoryTurn", "first": first, "second": second},
            )
        self.assertEqual(outcome, "win")
        self.assertEqual(len(session["matched"]), 12)
        self.assertEqual(score_delta(outcome), 10)

    def test_number_guess_win_uses_server_secret(self):
        session = create_game_state("number-guess", {"difficulty": "Easy"})
        updated, outcome, result = apply_action(
            session,
            {"type": "numberGuess", "guess": session["secret"]},
        )
        self.assertEqual(outcome, "win")
        self.assertEqual(result["answer"], session["secret"])
        self.assertEqual(updated["attempts"], 1)

    def test_number_guess_loss_occurs_at_server_attempt_limit(self):
        session = create_game_state("number-guess", {"difficulty": "Easy"})
        wrong_guess = 1 if session["secret"] != 1 else 2
        outcome = None
        for _ in range(session["maximumAttempts"]):
            session, outcome, _ = apply_action(
                session,
                {"type": "numberGuess", "guess": wrong_guess},
            )
        self.assertEqual(outcome, "loss")
        self.assertEqual(score_delta(outcome), -10)
        with self.assertRaises(GameError):
            apply_action(session, {"type": "numberGuess", "guess": wrong_guess})

    def test_invalid_moves_are_rejected(self):
        session = create_game_state("tic-tac-toe")
        with self.assertRaises(GameError):
            apply_action(session, {"type": "ticTacToeMove", "index": True})

    def test_context_guess_answer_is_ranked_and_verified_by_server(self):
        session = create_game_state("context-guess")
        updated, outcome, result = apply_action(
            session,
            {"type": "contextGuess", "guess": session["answer"]},
        )
        self.assertEqual(outcome, "win")
        self.assertEqual(result["rank"], 1)
        self.assertEqual(result["answer"], session["answer"])
        self.assertEqual(len(updated["guesses"]), 1)


if __name__ == "__main__":
    unittest.main()
