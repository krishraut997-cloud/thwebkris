import { useSyncExternalStore } from "react";
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

const authSubscribers = new Set();
const emptyAuthSnapshot = { user: null, loading: false, error: null };
let authSnapshot = {
  user: null,
  loading: isFirebaseConfigured,
  error: null,
};
let authListenerStarted = false;

function getConfiguredAuth() {
  if (!auth) throw new Error("Firebase is not configured.");
  return auth;
}

function publishAuthSnapshot(nextSnapshot) {
  authSnapshot = nextSnapshot;
  authSubscribers.forEach((subscriber) => subscriber());
}

function subscribeToSharedAuth(subscriber) {
  authSubscribers.add(subscriber);
  if (!authListenerStarted && isFirebaseConfigured) {
    authListenerStarted = true;
    try {
      listenToAuth(
        (user) => publishAuthSnapshot({ user, loading: false, error: null }),
        (error) => publishAuthSnapshot({ user: null, loading: false, error }),
      );
    } catch (error) {
      publishAuthSnapshot({ user: null, loading: false, error });
    }
  }
  return () => authSubscribers.delete(subscriber);
}

export function useFirebaseAuth() {
  return useSyncExternalStore(
    subscribeToSharedAuth,
    () => authSnapshot,
    () => emptyAuthSnapshot,
  );
}

export function listenToAuth(callback, onError) {
  return onAuthStateChanged(getConfiguredAuth(), callback, onError);
}

export function signInWithGoogle() {
  return signInWithPopup(getConfiguredAuth(), new GoogleAuthProvider());
}

export function signOutPlayer() {
  return signOut(getConfiguredAuth());
}

export function getCurrentFirebaseUser() {
  return auth?.currentUser ?? null;
}
