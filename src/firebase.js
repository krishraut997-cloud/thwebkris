import { getCurrentFirebaseUser } from "./auth.js";

const scoreApiBase = (import.meta.env.VITE_SCORE_API_URL || "").replace(/\/+$/, "");
const trackerUnavailableMessage =
  "Cannot reach the Python game tracker. Start it with `npm run dev:score-api` and try again.";
const gameDataRefreshIntervalMs = 15_000;
const gameUpdateChannel =
  typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel("python-game-tracker");

function subscribeToGameUpdates(refresh) {
  const refreshWhenVisible = () => {
    if (document.visibilityState === "visible") void refresh();
  };
  window.addEventListener("game-recorded", refresh);
  gameUpdateChannel?.addEventListener("message", refresh);
  document.addEventListener("visibilitychange", refreshWhenVisible);
  window.addEventListener("online", refresh);
  return () => {
    window.removeEventListener("game-recorded", refresh);
    gameUpdateChannel?.removeEventListener("message", refresh);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
    window.removeEventListener("online", refresh);
  };
}

function notifyGameRecorded() {
  window.dispatchEvent(new Event("game-recorded"));
  gameUpdateChannel?.postMessage({ type: "game-recorded" });
}

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

export function getGuestVisitorId() {
  const storageKey = "python-game-tracker-visitor";
  const existingId = window.localStorage.getItem(storageKey);
  if (existingId && /^[a-f0-9]{32}$/.test(existingId)) return existingId;

  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  const visitorId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  window.localStorage.setItem(storageKey, visitorId);
  return visitorId;
}

async function requestPythonApi(path, payload, user) {
  const headers = { "Content-Type": "application/json" };
  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
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
      if (
        !Array.isArray(dashboard.players) ||
        !Array.isArray(dashboard.weeklyPlayers) ||
        !Number.isInteger(dashboard.activity?.totalGames) ||
        !Number.isInteger(dashboard.activity?.gamesThisWeek)
      ) {
        throw new Error("The Python game tracker returned incomplete dashboard data.");
      }
      if (active) onDashboard(dashboard);
    } catch (error) {
      if (active) onError(error);
    } finally {
      pending = false;
    }
  };

  void refresh();
  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") void refresh();
  }, gameDataRefreshIntervalMs);
  const unsubscribe = subscribeToGameUpdates(refresh);
  return () => {
    active = false;
    window.clearInterval(timer);
    unsubscribe();
  };
}

export function listenToPlayerRecords(user, visitorId, onRecords, onError) {
  let active = true;
  let pending = false;
  const refresh = async () => {
    if (!active || pending) return;
    pending = true;
    try {
      const path = user
        ? "/me/records"
        : `/me/records?visitorId=${encodeURIComponent(visitorId)}`;
      const { records } = await requestPythonApi(path, null, user);
      if (!Array.isArray(records)) {
        throw new Error("The Python game tracker returned invalid game history.");
      }
      if (active) onRecords(records);
    } catch (error) {
      if (active) onError(error);
    } finally {
      pending = false;
    }
  };

  void refresh();
  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") void refresh();
  }, gameDataRefreshIntervalMs);
  const unsubscribe = subscribeToGameUpdates(refresh);
  return () => {
    active = false;
    window.clearInterval(timer);
    unsubscribe();
  };
}

export async function startVerifiedGame(game, options = {}, visitorId, usePlayerProfile = false) {
  const result = await requestPythonApi(
    "",
    { operation: "start", game, options, visitorId },
    usePlayerProfile ? getCurrentFirebaseUser() : null,
  );
  return result.sessionId;
}

export function submitVerifiedGameAction(sessionId, action, visitorId, usePlayerProfile = false) {
  return requestPythonApi(
    "",
    { operation: "action", sessionId, action, visitorId },
    usePlayerProfile ? getCurrentFirebaseUser() : null,
  ).then((result) => {
    if (result.outcome) notifyGameRecorded();
    return result;
  });
}

export function createPlayerProfile(user, displayName) {
  return requestPythonApi(
    "",
    { operation: "profile", name: displayName },
    user,
  );
}
