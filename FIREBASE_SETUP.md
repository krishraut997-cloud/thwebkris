# Firebase setup for the game leaderboard

The games page is connected to the `krish-portfolio-games` Firebase project.
It uses Google Authentication for player identity and Cloud Firestore for player
names and scores. The same Google account restores its profile across devices. A
player name can only be claimed once.

## Firebase project status

- Firebase project: `krish-portfolio-games`
- Web app: `Krish Portfolio Web`
- Google sign-in: enabled
- Cloud Firestore: created in `asia-south1` (Mumbai)
- Firestore security rules: the hardened local rules in [`firestore.rules`](./firestore.rules)
  still need deployment to replace the currently published rules
- Local web configuration: stored in ignored `.env.local`

Use `http://localhost` for local development. Firebase Authentication checks
authorized domains; the production domain
`portfolio-seven-green-mocmyyk3ff.vercel.app` is authorized under
**Authentication → Settings → Authorized domains**. Add any new production
domain there before using Google sign-in on it.

Vercel builds also need `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and
`VITE_FIREBASE_APP_ID` set for the Production environment. After changing
these settings, redeploy so Vite includes them in the client build. Firebase
web app configuration is public client configuration; never put a Firebase
Admin SDK private key in a `VITE_` variable or frontend bundle.

## Notes

- Score and profile data is stored in Firestore, not only in the current browser.
- New player names are lowercase letters/numbers separated by single spaces;
  the Firestore rules require the unique-name document key to match that name.
  The profile creation transaction also checks the previous encoded key format
  so names claimed before this rule change remain reserved.
- Client score writes are disabled in both the app and Firestore rules. The
  browser previously chose each score, so per-write limits could not prevent
  repeated fabricated results. The leaderboard remains readable, but new
  scores will not be recorded until a trusted server validates completed games.
- To apply the security changes to the live project, publish the updated
  `firestore.rules` with `npx firebase-tools login` followed by
  `npx firebase-tools deploy --only firestore:rules --project krish-portfolio-games`.
  Until deployment succeeds, the currently published rules still permit the
  old score-update flow.
- Google sign-in is used only for authentication; the app does not request
  Google API scopes or save Google access tokens. The signed-in user's email is
  shown only in their own signed-in session and is not included in leaderboard
  documents.
- Existing browser-only scores are not automatically imported into Firebase.
