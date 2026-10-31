const scoreApiBase = (import.meta.env.VITE_SCORE_API_URL || "").replace(/\/+$/, "");
const refreshIntervalMs = 15_000;

async function requestCourseTracker(path, user, options = {}) {
  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${scoreApiBase}/api${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Cannot reach the Python tracker. Check the tracker service and try again.", { cause: error });
    }
    throw error;
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    const isLocalDevelopment = import.meta.env.DEV && !scoreApiBase;
    throw new Error(
      isLocalDevelopment
        ? "The local Python tracker returned an invalid response. Start it with `npm run dev:score-api` and try again."
        : `The Python tracker returned an invalid response (HTTP ${response.status}).`,
      { cause: error },
    );
  }
  if (!response.ok) {
    throw new Error(result.detail || "The Python tracker could not complete the request.");
  }
  return result;
}

export function listenToCourseProgress(user, onProgress, onError) {
  let active = true;
  let pending = false;
  const refresh = async () => {
    if (!active || pending) return;
    pending = true;
    try {
      const { record } = await requestCourseTracker("/course-progress/me", user);
      if (active) onProgress(record);
    } catch (error) {
      if (active) onError(error);
    } finally {
      pending = false;
    }
  };

  void refresh();
  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") void refresh();
  }, refreshIntervalMs);
  const refreshWhenVisible = () => {
    if (document.visibilityState === "visible") void refresh();
  };
  window.addEventListener("online", refresh);
  document.addEventListener("visibilitychange", refreshWhenVisible);
  return () => {
    active = false;
    window.clearInterval(timer);
    window.removeEventListener("online", refresh);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
  };
}

export async function saveCourseProgress(user, progress) {
  const { record } = await requestCourseTracker("/course-progress", user, {
    method: "POST",
    body: JSON.stringify({ progress }),
  });
  return record;
}

export async function listCourseProgress(user) {
  const { records } = await requestCourseTracker("/admin/course-progress", user);
  if (!Array.isArray(records)) {
    throw new Error("The Python tracker returned invalid learner progress.");
  }
  return records;
}
