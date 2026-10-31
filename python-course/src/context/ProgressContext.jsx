import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { achievements, course, exercises, lessons } from '../content/course.js';
import { isFirebaseConfigured, useFirebaseAuth } from '../../../src/auth.js';

const STORAGE_KEY = 'python-path-progress-v1';
const GUEST_STORAGE_KEY = `${STORAGE_KEY}:guest`;
const USER_STORAGE_PREFIX = `${STORAGE_KEY}:user:`;
const GUEST_MIGRATED_KEY = `${STORAGE_KEY}:guest-migrated`;
const SYNC_FIELDS = [
  'completedLessons',
  'passedExercises',
  'attempts',
  'hintsUsed',
  'firstTryPasses',
  'earned',
  'xp',
  'level',
  'runs',
  'activeDays',
  'visitedLevels',
  'currentLesson',
];
const ProgressContext = createContext(null);

function freshState() {
  return {
    completedLessons: [],
    passedExercises: {},
    attempts: {},
    hintsUsed: {},
    firstTryPasses: [],
    earned: [],
    xp: 0,
    level: 1,
    runs: 0,
    activeDays: [],
    theme: 'system',
    visitedLevels: [],
    currentLesson: lessons[0]?.id,
  };
}

function readState(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return saved ? { ...freshState(), ...saved, level: Math.floor((saved.xp || 0) / 150) + 1 } : freshState();
  } catch {
    return freshState();
  }
}

function getSyncableProgress(state) {
  return Object.fromEntries(SYNC_FIELDS.map((field) => [field, state[field]]));
}

function mergeProgress(local, remote = {}) {
  const merged = { ...local };
  const validIds = {
    completedLessons: new Set(lessons.map((lesson) => lesson.id)),
    firstTryPasses: new Set(exercises.map((exercise) => exercise.id)),
    earned: new Set(achievements.map((achievement) => achievement.id)),
    visitedLevels: new Set(course.map((level) => level.id)),
  };
  for (const field of Object.keys(validIds)) {
    merged[field] = [...new Set([...(remote[field] || []), ...(local[field] || [])])]
      .filter((id) => validIds[field].has(id));
  }
  merged.activeDays = [...new Set([...(remote.activeDays || []), ...(local.activeDays || [])])]
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
    .sort()
    .slice(-14);
  const validExerciseIds = validIds.firstTryPasses;
  for (const field of ['passedExercises', 'hintsUsed']) {
    merged[field] = Object.fromEntries(
      Object.entries({ ...(remote[field] || {}), ...(local[field] || {}) })
        .filter(([id, value]) => validExerciseIds.has(id) && value === true),
    );
  }
  const attemptIds = new Set(
    [...Object.keys(remote.attempts || {}), ...Object.keys(local.attempts || {})]
      .filter((id) => validExerciseIds.has(id)),
  );
  merged.attempts = Object.fromEntries(
    [...attemptIds].map((key) => [key, Math.max(
      Number.isInteger(remote.attempts?.[key]) ? remote.attempts[key] : 0,
      Number.isInteger(local.attempts?.[key]) ? local.attempts[key] : 0,
    )]),
  );
  merged.xp = Math.max(Number.isInteger(remote.xp) ? remote.xp : 0, Number.isInteger(local.xp) ? local.xp : 0);
  merged.level = Math.floor(merged.xp / 150) + 1;
  merged.runs = Math.max(Number.isInteger(remote.runs) ? remote.runs : 0, Number.isInteger(local.runs) ? local.runs : 0);
  const localProgressCount = local.completedLessons.length + Object.keys(local.passedExercises).length;
  const remoteProgressCount = (remote.completedLessons || []).length + Object.keys(remote.passedExercises || {}).length;
  merged.currentLesson = localProgressCount >= remoteProgressCount
    ? local.currentLesson || remote.currentLesson
    : remote.currentLesson || local.currentLesson;
  if (!validIds.completedLessons.has(merged.currentLesson)) {
    merged.currentLesson = lessons[0]?.id;
  }
  return merged;
}

function sameProgress(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function withPracticeDay(state) {
  const activeDays = [...new Set([...(state.activeDays || []), todayKey()])].sort().slice(-14);
  return { ...state, activeDays };
}

function currentStreak(days) {
  if (!days?.length) return 0;
  const normalized = [...days].sort().reverse();
  const date = new Date(`${normalized[0]}T12:00:00`);
  const today = todayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (normalized[0] !== today && normalized[0] !== yesterdayKey) return 0;
  let streak = 1;
  for (let index = 1; index < normalized.length; index += 1) {
    date.setDate(date.getDate() - 1);
    const expected = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (normalized[index] !== expected) break;
    streak += 1;
  }
  return streak;
}

function award(state, id) {
  if (state.earned.includes(id)) return state;
  return { ...state, earned: [...state.earned, id], newestAchievement: id };
}

function addXp(state, amount) {
  const xp = state.xp + amount;
  const level = Math.floor(xp / 150) + 1;
  return { ...state, xp, level, newestLevel: level > state.level ? level : undefined };
}

function checkAwards(state, extra = {}) {
  const passedIds = Object.keys(state.passedExercises);
  const completed = state.completedLessons;
  const firstTryCount = state.firstTryPasses.length;
  const allLevels = course.every((level) => level.modules.every((item) => completed.includes(item.id)));
  const levelsDone = course.map((level) => level.modules.every((item) => completed.includes(item.id)));
  const streak = currentStreak(state.activeDays);
  let next = state;
  const grant = (condition, id) => { if (condition) next = award(next, id); };
  grant(completed.length >= 1, 'first-steps');
  grant(state.runs >= 1, 'hello-world');
  grant(passedIds.length >= 1, 'first-pass');
  grant(extra.bugHunter, 'bug-hunter');
  grant(extra.noHints, 'no-hints');
  grant(completed.includes('loops'), 'loop-master');
  grant(streak >= 3, 'streak-3');
  grant(extra.hour >= 22 || extra.hour < 5, 'night-owl');
  grant(levelsDone[0], 'beginner-champion');
  grant(levelsDone[1], 'intermediate-champion');
  grant(levelsDone[2], 'advanced-champion');
  grant(levelsDone[3], 'expert-champion');
  grant(extra.capstone, 'capstone-builder');
  grant(extra.perfectionist, 'perfectionist');
  grant(allLevels, 'course-complete');
  grant(state.runs >= 10, 'ten-runs');
  grant(state.xp >= 100, 'xp-100');
  grant(state.xp >= 500, 'xp-500');
  grant(completed.length >= 3, 'three-lessons');
  grant(passedIds.length >= 5, 'five-exercises');
  grant(passedIds.length >= 10, 'ten-exercises');
  grant(levelsDone.every(Boolean), 'all-levels');
  grant(extra.hour < 7, 'early-bird');
  grant(extra.weekend, 'weekend-learner');
  grant(firstTryCount >= 5, 'steady-hands');
  grant(state.visitedLevels.length === course.length, 'explorer');
  return next;
}

function reducer(state, action) {
  let next = state;
  const now = new Date();
  if (action.type === 'RUN') {
    next = withPracticeDay({ ...state, runs: state.runs + 1 });
    next = checkAwards(next, { hour: now.getHours(), weekend: [0, 6].includes(now.getDay()) });
  } else if (action.type === 'VISIT_LESSON') {
    const lesson = lessons.find((item) => item.id === action.lessonId);
    next = withPracticeDay({ ...state, currentLesson: action.lessonId });
    if (lesson && !state.visitedLevels.includes(lesson.levelId)) {
      next.visitedLevels = [...state.visitedLevels, lesson.levelId];
    }
    next = checkAwards(next);
  } else if (action.type === 'HINT') {
    next = { ...state, hintsUsed: { ...state.hintsUsed, [action.exerciseId]: true } };
  } else if (action.type === 'ATTEMPT') {
    const attempts = { ...state.attempts, [action.exerciseId]: (state.attempts[action.exerciseId] || 0) + 1 };
    next = { ...withPracticeDay({ ...state, attempts }), newestAchievement: undefined };
    if (action.passed) {
      const alreadyPassed = Boolean(state.passedExercises[action.exerciseId]);
      const passedExercises = { ...state.passedExercises, [action.exerciseId]: true };
      const firstTryPasses = action.attempt === 1 && !alreadyPassed
        ? [...state.firstTryPasses, action.exerciseId]
        : state.firstTryPasses;
      const awardXp = alreadyPassed ? 0 : 20 + (action.attempt === 1 ? 10 : 0);
      next = {
        ...next,
        passedExercises,
        firstTryPasses,
      };
      next = addXp(next, awardXp);
      const lesson = lessons.find((item) => item.id === action.lessonId);
      const allLessonPassed = lesson?.exercises.every((exercise) => passedExercises[exercise.id]);
      const allFirstTry = lesson?.exercises.every((exercise) => firstTryPasses.includes(exercise.id));
      next = checkAwards(next, {
        hour: now.getHours(),
        weekend: [0, 6].includes(now.getDay()),
        bugHunter: action.attempt >= 4,
        noHints: !state.hintsUsed[action.exerciseId],
        perfectionist: allLessonPassed && allFirstTry,
      });
    } else {
      next = withPracticeDay(next);
    }
  } else if (action.type === 'COMPLETE_LESSON') {
    const justCompleted = !state.completedLessons.includes(action.lessonId);
    next = {
      ...withPracticeDay(state),
      completedLessons: justCompleted ? [...state.completedLessons, action.lessonId] : state.completedLessons,
      currentLesson: action.lessonId,
    };
    next = addXp(next, justCompleted ? 25 : 0);
    const capstones = ['guessing-game', 'contact-book', 'inventory', 'mastery'];
    next = checkAwards(next, { capstone: capstones.includes(action.lessonId), hour: now.getHours() });
  } else if (action.type === 'THEME') {
    next = { ...state, theme: action.theme };
  } else if (action.type === 'HYDRATE') {
    next = { ...freshState(), ...action.state };
  } else if (action.type === 'DISMISS_ACHIEVEMENT') {
    next = { ...state, newestAchievement: undefined };
  } else if (action.type === 'DISMISS_LEVEL') {
    next = { ...state, newestLevel: undefined };
  }
  return next;
}

export function ProgressProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => readState(GUEST_STORAGE_KEY));
  const { user, loading: authLoading, error: authError } = useFirebaseAuth();
  const [storageKey, setStorageKey] = useState(null);
  const [localReady, setLocalReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState(isFirebaseConfigured ? 'loading' : 'local');
  const [syncError, setSyncError] = useState('');
  const stateRef = useRef(state);
  const authUserRef = useRef(null);
  const lastSyncedProgressRef = useRef('');
  stateRef.current = state;
  useEffect(() => {
    if (authUserRef.current?.uid !== user?.uid) {
      authUserRef.current = user;
      setLocalReady(false);
    }
    if (authError) {
      setLocalReady(false);
      setSyncStatus('error');
      setSyncError('Could not check your Google sign-in status.');
    }
  }, [authError, user]);
  useEffect(() => {
    if (authLoading || authError) return;
    let nextStorageKey = GUEST_STORAGE_KEY;
    let nextState;
    const legacyState = localStorage.getItem(STORAGE_KEY);
    if (legacyState && !localStorage.getItem(GUEST_STORAGE_KEY)) {
      localStorage.setItem(GUEST_STORAGE_KEY, legacyState);
      localStorage.removeItem(STORAGE_KEY);
    }
    if (user) {
      nextStorageKey = `${USER_STORAGE_PREFIX}${user.uid}`;
      const savedAccountState = localStorage.getItem(nextStorageKey);
      if (savedAccountState) {
        nextState = readState(nextStorageKey);
      } else {
        const guestState = readState(GUEST_STORAGE_KEY);
        const hasMigratedGuest = localStorage.getItem(GUEST_MIGRATED_KEY) === 'true';
        nextState = hasMigratedGuest ? freshState() : guestState;
        if (!hasMigratedGuest) {
          localStorage.setItem(GUEST_MIGRATED_KEY, 'true');
          localStorage.removeItem(GUEST_STORAGE_KEY);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setSyncStatus('syncing');
      setSyncError('');
      lastSyncedProgressRef.current = '';
    } else {
      nextState = readState(GUEST_STORAGE_KEY);
      setSyncStatus('local');
      setSyncError('');
      lastSyncedProgressRef.current = '';
    }
    dispatch({ type: 'HYDRATE', state: nextState });
    setStorageKey(nextStorageKey);
    setLocalReady(true);
  }, [authError, authLoading, user]);
  useEffect(() => {
    if (!localReady || !storageKey) return;
    const { newestAchievement, newestLevel, ...persisted } = state;
    localStorage.setItem(storageKey, JSON.stringify(persisted));
  }, [localReady, state, storageKey]);
  useEffect(() => {
    if (!localReady || !user || storageKey !== `${USER_STORAGE_PREFIX}${user.uid}`) return undefined;
    let active = true;
    let unsubscribe;
    setSyncStatus('syncing');
    import('../../../src/courseProgress.js').then(({ listenToCourseProgress, saveCourseProgress }) => {
      if (!active) return;
      unsubscribe = listenToCourseProgress(user, (record) => {
        if (!active) return;
        if (record?.uid !== undefined && record.uid !== user.uid) {
          setSyncStatus('error');
          return;
        }
        const merged = mergeProgress(stateRef.current, record?.progress);
        const progress = getSyncableProgress(merged);
        if (!sameProgress(getSyncableProgress(stateRef.current), progress)) {
          dispatch({ type: 'HYDRATE', state: merged });
        }
        lastSyncedProgressRef.current = JSON.stringify(progress);
        if (!record || !sameProgress(record.progress, progress)) {
          saveCourseProgress(user, progress).catch(() => {
            if (active) {
              setSyncError('Progress could not be saved to the Python tracker.');
              setSyncStatus('error');
            }
          });
        }
        setSyncStatus('synced');
      }, (error) => {
        if (active) {
          setSyncError(error.message || 'Progress could not be loaded from the Python tracker.');
          setSyncStatus('error');
        }
      });
    }).catch(() => {
      if (active) {
        setSyncError('Progress could not be loaded from the Python tracker.');
        setSyncStatus('error');
      }
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [localReady, storageKey, user]);
  useEffect(() => {
    if (syncStatus !== 'synced' || !user) return undefined;
    let active = true;
    const progress = getSyncableProgress(state);
    const signature = JSON.stringify(progress);
    if (signature === lastSyncedProgressRef.current) return undefined;
    import('../../../src/courseProgress.js').then(({ saveCourseProgress }) => {
      if (!active) return;
      lastSyncedProgressRef.current = signature;
      return saveCourseProgress(user, progress);
    }).catch(() => {
      if (active) {
        lastSyncedProgressRef.current = '';
        setSyncError('Progress could not be saved to the Python tracker.');
        setSyncStatus('error');
      }
    });
    return () => {
      active = false;
    };
  }, [state, syncStatus, user]);
  const value = useMemo(() => ({ state, dispatch, user, authLoading, syncStatus, syncError, localReady }), [authLoading, localReady, state, syncError, syncStatus, user]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used within ProgressProvider.');
  return context;
}

export function getAchievement(id) {
  return achievements.find((item) => item.id === id);
}

export function getCurrentStreak(days) {
  return currentStreak(days);
}

export const courseStats = { lessonCount: lessons.length, exerciseCount: exercises.length };
