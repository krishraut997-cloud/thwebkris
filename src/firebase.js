import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

let auth;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
}

const scoreApiBase = (import.meta.env.VITE_SCORE_API_URL || "").replace(/\/+$/, "");
const trackerUnavailableMessage =
  "Cannot reach the Python game tracker. Start it with `npm run dev:score-api` and try again.";

async function fetchPythonApi(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(trackerUnavailableMessage, { cause: error });
    }
    throw error;
  }
}

export function listenToAuth(callback) {
  if (!auth) throw new Error("Firebase is not configured.");
  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle() {
  if (!auth) throw new Error("Firebase is not configured.");
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutPlayer() {
  if (!auth) throw new Error("Firebase is not configured.");
  return signOut(auth);
}

async function requestPythonApi(path, payload, user) {
  const headers = { "Content-Type": "application/json" };
  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  } else if (payload) {
    throw new Error("Sign in with Google to save leaderboard scores.");
  }

  const response = await fetchPythonApi(`${scoreApiBase}/api${path}`, {
    method: payload ? "POST" : "GET",
    headers,
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The Python game tracker returned an invalid response.");
  }
  if (!response.ok) {
    throw new Error(result.detail || "The Python game tracker could not complete the request.");
  }
  return result;
}

export function listenToGameDashboard(onDashboard, onError) {
  let active = true;
  let pending = false;
  const refresh = async () => {
    if (!active || pending) return;
    pending = true;
    try {
      const dashboard = await requestPythonApi("/dashboard");
      if (active) onDashboard(dashboard);
    } catch (error) {
      if (active) onError(error);
    } finally {
      pending = false;
    }
  };

  void refresh();
  const timer = window.setInterval(refresh, 5000);
  return () => {
    active = false;
    window.clearInterval(timer);
  };
}

export async function startVerifiedGame(game, options = {}) {
  const result = await requestPythonApi(
    "",
    { operation: "start", game, options },
    auth?.currentUser,
  );
  return result.sessionId;
}

export function submitVerifiedGameAction(sessionId, action) {
  return requestPythonApi(
    "",
    { operation: "action", sessionId, action },
    auth?.currentUser,
  );
}

export function createPlayerProfile(user, displayName) {
  return requestPythonApi(
    "",
    { operation: "profile", name: displayName },
    user,
  );
}
