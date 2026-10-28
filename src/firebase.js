import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

let auth;
let db;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
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

export function listenToPlayers(onPlayers, onError) {
  if (!db) throw new Error("Firebase is not configured.");
  return onSnapshot(
    collection(db, "players"),
    (snapshot) => {
      onPlayers(snapshot.docs.map((playerDoc) => ({
        id: playerDoc.id,
        ...playerDoc.data(),
      })));
    },
    onError,
  );
}

export async function createPlayerProfile(user, displayName) {
  if (!db) throw new Error("Firebase is not configured.");
  const normalizedName = displayName.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  if (!/^[a-z0-9]+(?: [a-z0-9]+)*$/.test(normalizedName) || normalizedName.length < 2 || normalizedName.length > 24) {
    throw new Error("Use 2–24 lowercase letters or numbers, separated by single spaces.");
  }

  const nameKey = `name-${normalizedName}`;
  const legacyNameKey = `name-${encodeURIComponent(normalizedName)}`;
  const playerRef = doc(db, "players", user.uid);
  const nameRef = doc(db, "playerNames", nameKey);
  const nameKeys = [...new Set([nameKey, legacyNameKey])];
  const nameRefs = nameKeys.map((key) => doc(db, "playerNames", key));

  await runTransaction(db, async (transaction) => {
    const [playerSnapshot, ...nameSnapshots] = await Promise.all([
      transaction.get(playerRef),
      ...nameRefs.map((nameRef) => transaction.get(nameRef)),
    ]);

    if (playerSnapshot.exists()) {
      throw new Error("This Google account already has a player profile.");
    }
    if (nameSnapshots.some((snapshot) => snapshot.exists())) {
      throw new Error("That name is already in use. Choose another player name.");
    }

    transaction.set(playerRef, {
      name: normalizedName,
      nameKey,
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(nameRef, { uid: user.uid });
  });
}
