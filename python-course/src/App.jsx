import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { achievements, course, lessonById, lessons } from './content/course.js';
import { useProgress, getAchievement, getCurrentStreak, courseStats } from './context/ProgressContext.jsx';
import { runPython, testExercise } from './engine/python.js';
import BadgeViewer from './components/BadgeViewer.jsx';
import HomeScene from './components/HomeScene.jsx';
import Sidebar from './components/Sidebar.jsx';
import AchievementMark from './components/AchievementMark.jsx';
import { Confetti, LoopDrawing, useGsapReveal, useProgressTween } from './components/Motion.jsx';
import { isFirebaseConfigured, signInWithGoogle, signOutPlayer } from '../../src/auth.js';
import AdSenseSlot from '../../src/AdSenseSlot.jsx';
import './styles.css';

const CodeEditor = lazy(() => import('./components/CodeEditor.jsx'));
const COURSE_ADMIN_EMAIL = 'emeye1911@gmail.com';

function isCourseAdmin(user) {
  return user?.emailVerified && user.email?.toLowerCase() === COURSE_ADMIN_EMAIL;
}

function ThemeButton() {
  const { state, dispatch } = useProgress();
  return (
    <button className="pc-theme-button" onClick={() => dispatch({ type: 'THEME', theme: state.theme === 'dark' ? 'light' : state.theme === 'light' ? 'system' : 'dark' })} aria-label={`Theme: ${state.theme}. Change theme`}>
      {state.theme === 'dark' ? '☾' : state.theme === 'light' ? '☼' : '◐'} <span>{state.theme === 'system' ? 'System' : state.theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}

function GoogleMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z" />
    <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
    <path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.8v-5.2H5.9a20 20 0 0 0 0 18.2l6.9-5.2Z" />
    <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8A19.3 19.3 0 0 0 24 4 20 20 0 0 0 5.9 14.9l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z" />
  </svg>;
}

function Header({ onMenu, user, authLoading, authBusy, onSignIn, onSignOut, onAdmin }) {
  return <header className="pc-topbar">
    <button className="pc-menu-button" onClick={onMenu} aria-label="Open course navigation">☰</button>
    <span className="pc-topbar-caption">PyLearningCourse</span>
    <a className="pc-portfolio-link" href={import.meta.env.BASE_URL}><ArrowLeft size={14} /> Back to portfolio</a>
    {user ? (
      <div className="pc-auth-account">
        <span className="pc-auth-avatar" aria-hidden="true">{(user.displayName || user.email || 'G').charAt(0).toUpperCase()}</span>
        <span className="pc-auth-user">{user.displayName || user.email}</span>
        {isCourseAdmin(user) && <button className="pc-auth-button pc-auth-admin-button" type="button" onClick={onAdmin}>Dashboard</button>}
        <button className="pc-auth-button pc-auth-signout" type="button" onClick={onSignOut} disabled={authBusy}>
          {authBusy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    ) : (
      <button
        className="pc-auth-button"
        type="button"
        onClick={onSignIn}
        disabled={!isFirebaseConfigured || authLoading || authBusy}
        title={!isFirebaseConfigured ? 'Set the VITE_FIREBASE_* settings to enable Google sign-in.' : undefined}
      >
        <GoogleMark />
        {authLoading ? 'Checking…' : authBusy ? 'Connecting…' : 'Sign in with Google'}
      </button>
    )}
    <ThemeButton />
  </header>;
}

function getGoogleSignInError(error) {
  if (error?.code === 'auth/unauthorized-domain') {
    return `Google sign-in is not enabled for ${window.location.hostname}. Add this domain to Firebase Authentication's authorized domains.`;
  }
  if (error?.code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.';
  }
  if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
    return '';
  }
  return error?.message || 'Google sign-in failed. Please try again.';
}

function AdminDashboard({ onBack, user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    import('../../src/courseProgress.js').then(({ listCourseProgress }) => listCourseProgress(user)).then((items) => {
      if (active) setRecords(items);
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Could not load learner progress.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [refresh, user]);

  const lessonCount = lessons.length;
  const learnerCount = records.length;
  const completedLessons = records.reduce((sum, record) => sum + Math.min(lessonCount, record.progress?.completedLessons?.length || 0), 0);
  const averageProgress = learnerCount
    ? Math.min(100, Math.round(completedLessons / (learnerCount * lessonCount) * 100))
    : 0;
  const orderedRecords = [...records].sort((first, second) =>
    new Date(second.lastActiveAt).getTime() - new Date(first.lastActiveAt).getTime(),
  );
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
      ? 'Not available'
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  return <main className="pc-main pc-dashboard-main">
    <div className="pc-breadcrumb"><button onClick={onBack}><ArrowLeft size={13} /> Back to course</button><span>›</span><span>Private dashboard</span></div>
    <div className="pc-admin-heading">
      <div><span className="pc-eyebrow">PRIVATE · ADMIN ONLY</span><h1>Learner progress</h1></div>
      <button className="pc-button pc-button-quiet" type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>Refresh</button>
    </div>
    <p className="pc-dashboard-intro">Course progress is tracked by the Python tracker and visible only to the course owner. Learners sign in with Google to sync their progress; results are learner-submitted and are not independently verified.</p>
    <div className="pc-admin-stats">
      <article className="pc-admin-stat"><span>LEARNERS</span><strong>{learnerCount}</strong></article>
      <article className="pc-admin-stat"><span>LESSONS COMPLETED</span><strong>{completedLessons}</strong></article>
      <article className="pc-admin-stat"><span>AVERAGE COURSE PROGRESS</span><strong>{averageProgress}%</strong></article>
      <article className="pc-admin-stat"><span>COURSE LESSONS</span><strong>{lessonCount}</strong></article>
    </div>
    {loading ? <p className="pc-admin-feedback">Loading learner progress…</p>
      : error ? <p className="pc-admin-feedback pc-admin-error" role="alert">{error}</p>
        : records.length === 0 ? <p className="pc-admin-feedback">No learners have synced course progress yet.</p>
          : <div className="pc-admin-table-wrap"><table className="pc-admin-table">
            <thead><tr><th>Learner</th><th>Lessons</th><th>Exercises</th><th>XP</th><th>Achievements</th><th>Last active</th></tr></thead>
            <tbody>{orderedRecords.map((record) => {
              const progress = record.progress || {};
              const displayName = record.displayName || record.email || 'Learner';
              return <tr key={record.uid}>
                <td><strong>{displayName}</strong>{record.email && <small>{record.email}</small>}</td>
                <td>{progress.completedLessons?.length || 0} / {lessonCount}</td>
                <td>{Object.values(progress.passedExercises || {}).filter(Boolean).length} / {courseStats.exerciseCount}</td>
                <td>{progress.xp || 0}</td>
                <td>{progress.earned?.length || 0} / {achievements.length}</td>
                <td>{formatDate(record.lastActiveAt)}</td>
              </tr>;
            })}</tbody>
          </table></div>}
  </main>;
}

function ProgressBar({ value, label }) {
  const fillRef = useProgressTween(value);
  return <div className="pc-progress-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin="0" aria-valuemax="100">
    <span ref={fillRef} className="pc-progress-fill" />
  </div>;
}

function OutputPanel({ output, error }) {
  if (!output && !error) return null;
  return <div className={`pc-output${error ? ' pc-output-error' : ''}`} aria-live="polite">
    <div className="pc-output-label">{error ? 'A note from Python' : 'Output'}</div>
    <pre>{error || output || '(no output)'}</pre>
  </div>;
}

function ExerciseCard({ exercise, lesson, draft, setDraft }) {
  const { state, dispatch } = useProgress();
  const [results, setResults] = useState(null);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealedHint, setRevealedHint] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const attempts = state.attempts[exercise.id] || 0;
  const passed = Boolean(state.passedExercises[exercise.id]);
  const runSubmit = useCallback(async () => {
    setBusy(true);
    setError('');
    setResults(null);
    const attempt = attempts + 1;
    dispatch({ type: 'RUN' });
    try {
      const nextResults = await testExercise(draft, exercise.tests);
      setResults(nextResults);
      const passedNow = nextResults.every((item) => item.passed);
      dispatch({ type: 'ATTEMPT', exerciseId: exercise.id, lessonId: lesson.id, attempt, passed: passedNow });
      if (passedNow) {
        setOutput('All checks passed. Nicely done!');
        setConfetti(true);
      } else {
        const failures = nextResults.filter((item) => !item.passed);
        setOutput(failures[0]?.actual === undefined ? '' : String(failures[0].actual));
        setError(nextResults.find((item) => item.error)?.error || '');
      }
    } catch (runError) {
      dispatch({ type: 'ATTEMPT', exerciseId: exercise.id, lessonId: lesson.id, attempt, passed: false });
      setError(runError.message || 'Python could not run this code.');
    } finally {
      setBusy(false);
    }
  }, [attempts, dispatch, draft, exercise, lesson.id]);
  const showHint = () => {
    setRevealedHint((count) => Math.min(exercise.hints.length, count + 1));
    dispatch({ type: 'HINT', exerciseId: exercise.id });
  };
  const failed = results?.filter((item) => !item.passed) || [];
  return (
    <section className="pc-exercise-card" aria-labelledby={`exercise-${exercise.id}`}>
      <div className="pc-exercise-heading">
        <div><span className="pc-eyebrow">PRACTICE {String(lesson.exercises.indexOf(exercise) + 1).padStart(2, '0')}</span><h3 id={`exercise-${exercise.id}`}>{exercise.title}</h3></div>
        <span className={`pc-exercise-status${passed ? ' pc-status-passed' : ''}`}>{passed ? '✓ Passed' : attempts ? `${attempts} ${attempts === 1 ? 'try' : 'tries'}` : 'Ready when you are'}</span>
      </div>
      <p className="pc-exercise-prompt">{exercise.prompt}</p>
      <div className="pc-example-pair"><span>Try it</span><code>{exercise.examples[0].input}</code><span>Expected</span><code>{exercise.examples[0].output}</code></div>
      <CodeEditor value={draft} onChange={setDraft} onRun={runSubmit} label={`${exercise.title} code`} className="pc-exercise-editor" />
      <div className="pc-action-row">
        <button className="pc-button pc-button-primary" onClick={runSubmit} disabled={busy}>
          {busy ? <><span className="pc-spinner" /> Checking…</> : passed ? 'Run again' : 'Check my code'}
        </button>
        <button className="pc-button pc-button-quiet" onClick={showHint} disabled={revealedHint >= exercise.hints.length}>Hint {revealedHint < exercise.hints.length ? `(${revealedHint + 1}/3)` : 'shown'}</button>
        {attempts >= 3 && <button className="pc-button pc-button-quiet" onClick={() => setDraft(exercise.solution)}>Show solution</button>}
      </div>
      {revealedHint > 0 && <div className="pc-hint-box" aria-live="polite"><strong>A small nudge</strong><p>{exercise.hints[revealedHint - 1]}</p></div>}
      {results && <div className="pc-test-results" aria-live="polite">
        <h4>Checks <span>{results.filter((result) => result.passed).length}/{results.length}</span></h4>
        {results.map((result, index) => <div className={`pc-test-row${result.passed ? ' pc-test-pass' : ' pc-test-fail'}`} key={`${exercise.id}-${index}`}>
          <span aria-hidden="true">{result.passed ? '✓' : '×'}</span>
          <div><strong>{result.passed ? 'Passed' : exercise.failureMessage}</strong>{!result.passed && <div className="pc-diff"><span>Expected</span><code>{String(result.expected)}</code><span>Your output</span><code>{String(result.actual ?? result.error ?? '(no output)')}</code></div>}</div>
        </div>)}
      </div>}
      {failed.length > 0 && <p className="pc-encouragement" role="status">{exercise.failureMessage}</p>}
      <OutputPanel output={output} error={error} />
      <Confetti active={confetti} onDone={() => setConfetti(false)} />
    </section>
  );
}

function LessonView({ lesson, lessonIndex, drafts, setDrafts, onSelect, onHome }) {
  const { state, dispatch } = useProgress();
  const introRef = useGsapReveal(lesson.id);
  const [tryCode, setTryCode] = useState(() => localStorage.getItem(`pc-draft-try-${lesson.id}`) || lesson.tryCode);
  const [tryInputs, setTryInputs] = useState(() => localStorage.getItem(`pc-input-${lesson.id}`) || '');
  const [tryOutput, setTryOutput] = useState('');
  const [tryError, setTryError] = useState('');
  const [running, setRunning] = useState(false);
  const allPassed = lesson.exercises.every((exercise) => state.passedExercises[exercise.id]);
  const done = state.completedLessons.includes(lesson.id);
  const nextLesson = lessons[lessonIndex + 1];
  const currentPassed = lesson.exercises.filter((exercise) => state.passedExercises[exercise.id]).length;
  const runTry = useCallback(async () => {
    setRunning(true);
    setTryError('');
    setTryOutput('');
    dispatch({ type: 'RUN' });
    try {
      const inputs = tryInputs ? tryInputs.split(/\r?\n/) : [];
      const result = await runPython(tryCode, inputs);
      setTryOutput(result.output);
      if (result.error) setTryError(result.error);
    } catch (error) {
      setTryError(error.message || 'Python could not run this code.');
    } finally {
      setRunning(false);
    }
  }, [dispatch, tryCode, tryInputs]);
  useEffect(() => {
    localStorage.setItem(`pc-draft-try-${lesson.id}`, tryCode);
  }, [lesson.id, tryCode]);
  useEffect(() => {
    localStorage.setItem(`pc-input-${lesson.id}`, tryInputs);
  }, [lesson.id, tryInputs]);
  const completeLesson = () => {
    dispatch({ type: 'COMPLETE_LESSON', lessonId: lesson.id });
    if (nextLesson) onSelect(nextLesson.id);
    else onHome();
  };

  return <main className="pc-main pc-lesson-main">
    <div className="pc-breadcrumb"><button onClick={onHome}>Course</button><span>›</span><span>{course.find((level) => level.id === lesson.levelId)?.title}</span><span>›</span><span>{lesson.title}</span></div>
    <section className="pc-lesson-content" ref={introRef}>
      <div className="pc-lesson-kicker"><span className="pc-kicker-dot" /> LESSON {String(lessonIndex + 1).padStart(2, '0')} <span>·</span> {currentPassed} OF {lesson.exercises.length} EXERCISES PASSED</div>
      <h1>{lesson.title}</h1>
      <ProgressBar value={currentPassed / lesson.exercises.length * 100} label="Lesson exercise progress" />
      <div className="pc-objectives"><strong>By the end, you can…</strong><ul>{lesson.objectives.map((objective) => <li key={objective}><span>✓</span>{objective}</li>)}</ul></div>
      <p className="pc-explanation">{lesson.explanation}</p>
      {lesson.id === 'loops' && <LoopDrawing />}
      <div className="pc-example-card"><div className="pc-section-label">A QUICK EXAMPLE</div><pre><code>{lesson.example}</code></pre></div>
      <section className="pc-try-card" aria-labelledby="try-heading">
        <div className="pc-section-heading"><div><span className="pc-section-label">YOUR TURN</span><h2 id="try-heading">Try it out</h2></div><span className="pc-soft-note">Nothing you type leaves this browser.</span></div>
        <CodeEditor value={tryCode} onChange={setTryCode} onRun={runTry} label={`${lesson.title} try-it code`} />
        <label className="pc-input-field">Input values <span>One value per line, if your program calls input()</span>
          <textarea value={tryInputs} onChange={(event) => setTryInputs(event.target.value)} rows={2} placeholder="For example: 18" />
        </label>
        <div className="pc-action-row"><button className="pc-button pc-button-primary" onClick={runTry} disabled={running}>{running ? <><span className="pc-spinner" /> Running…</> : 'Run code'}</button></div>
        <OutputPanel output={tryOutput} error={tryError} />
      </section>
      <div className="pc-exercises-title"><div><span className="pc-section-label">PRACTICE</span><h2>Make it yours</h2></div><span className="pc-soft-note">{lesson.exercises.length} short exercises</span></div>
      {lesson.exercises.map((exercise) => {
        const existing = drafts[exercise.id];
        const draft = existing ?? exercise.starter;
        return <ExerciseCard key={exercise.id} exercise={exercise} lesson={lesson} draft={draft} setDraft={(code) => setDrafts((value) => ({ ...value, [exercise.id]: code }))} />;
      })}
      <div className="pc-next-row">
        <div><strong>{done ? 'Lesson complete' : allPassed ? 'You’ve got it.' : 'One step at a time.'}</strong><span>{allPassed ? 'All exercise checks are green.' : `${currentPassed} of ${lesson.exercises.length} exercises passed`}</span></div>
        {allPassed && <button className="pc-button pc-button-primary" onClick={completeLesson}>{nextLesson ? 'Finish & continue' : 'Complete course'} <span>→</span></button>}
        {!allPassed && <button className="pc-button pc-button-secondary" disabled={!nextLesson} title="Pass all exercises to continue">Next lesson <span>→</span></button>}
      </div>
    </section>
  </main>;
}

function HomeView({ onContinue, onSelect }) {
  const { state } = useProgress();
  const completedLessons = state.completedLessons.length;
  const percent = Math.round(completedLessons / lessons.length * 100);
  const streak = getCurrentStreak(state.activeDays);
  const activeLevel = course.find((level) => level.modules.some((item) => item.id === state.currentLesson)) || course[0];
  const earnedLevel = [...course].reverse().find((level) => level.modules.every((item) => state.completedLessons.includes(item.id)));
  const badgeLevel = earnedLevel || activeLevel;
  const heroRef = useGsapReveal('home');
  const earned = achievements.filter((item) => state.earned.includes(item.id));
  return <main className="pc-main pc-home-main">
    <section className="pc-home-hero" ref={heroRef}>
      <HomeScene />
      <div className="pc-home-copy">
        <span className="pc-eyebrow pc-eyebrow-green">YOUR PYTHON JOURNEY</span>
        <h1>PyLearning<br /><em>Course</em></h1>
        <p>A calm, hands-on path from your first print statement to projects you can make your own.</p>
        <button className="pc-button pc-button-primary pc-home-cta" onClick={onContinue}>{completedLessons ? 'Continue learning' : 'Start learning'} <span>→</span></button>
        <div className="pc-home-free">Free forever <span>·</span> No account <span>·</span> Progress stays with you</div>
      </div>
      <div className="pc-home-decoration" aria-hidden="true"><span>{'{ }'}</span><i>01</i><b>print("hello")</b></div>
    </section>
    <section className="pc-stats-grid" aria-label="Your learning stats">
      <article className="pc-stat-card"><span className="pc-stat-icon">⌁</span><span className="pc-stat-label">COURSE PROGRESS</span><strong>{percent}%</strong><ProgressBar value={percent} label="Overall course progress" /><small>{completedLessons} of {lessons.length} lessons</small></article>
      <article className="pc-stat-card"><span className="pc-stat-icon">✧</span><span className="pc-stat-label">TOTAL XP</span><strong>{state.xp}<small> XP</small></strong><div className="pc-xp-level"><span>Level {state.level}</span><span>{150 - (state.xp % 150)} XP to next</span></div><ProgressBar value={(state.xp % 150) / 150 * 100} label={`Progress to level ${state.level + 1}`} /></article>
      <article className="pc-stat-card"><span className="pc-stat-icon">☼</span><span className="pc-stat-label">CURRENT STREAK</span><strong>{streak}<small> {streak === 1 ? 'day' : 'days'}</small></strong><div className="pc-stat-foot">A few minutes today keeps it going.</div></article>
      <article className="pc-stat-card pc-stat-badge"><span className="pc-stat-icon"><AchievementMark /></span><span className="pc-stat-label">{earnedLevel ? 'YOUR LATEST BADGE' : 'YOUR NEXT BADGE'}</span><BadgeViewer label={`${badgeLevel.title} level badge${earnedLevel ? ', earned' : ' preview'}`} /><small>{badgeLevel.title} · {earnedLevel ? 'earned on your path' : 'keep exploring'}</small></article>
    </section>
    <section className="pc-continue-card">
      <div className="pc-continue-icon">↗</div><div className="pc-continue-info"><span className="pc-eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>{lessonById[state.currentLesson]?.title || lessons[0].title}</h2><p>{activeLevel.title} · {activeLevel.subtitle}</p></div>
      <button className="pc-button pc-button-primary" onClick={onContinue}>Continue <span>→</span></button>
    </section>
    <section className="pc-level-overview">
      <div className="pc-section-heading"><div><span className="pc-section-label">THE LEARNING PATH</span><h2>Four levels. Your own pace.</h2></div><span className="pc-soft-note">{courseStats.lessonCount} lessons · {courseStats.exerciseCount} exercises</span></div>
      <div className="pc-level-cards">{course.map((level, index) => {
        const done = level.modules.filter((item) => state.completedLessons.includes(item.id)).length;
        const levelProgress = Math.round(done / level.modules.length * 100);
        const levelStart = lessons.findIndex((item) => item.id === level.modules[0].id);
        const unlocked = levelStart === 0 || state.completedLessons.includes(lessons[levelStart - 1]?.id);
        const firstAvailable = unlocked
          ? level.modules.find((item) => !state.completedLessons.includes(item.id)) || level.modules[0]
          : lessons.find((item) => !state.completedLessons.includes(item.id)) || lessons[0];
        return <button className="pc-level-card" key={level.id} onClick={() => onSelect(firstAvailable.id)}>
          <div className="pc-level-card-top"><span className="pc-level-number" style={{ color: level.color }}>0{index + 1}</span><span className="pc-level-progress">{done}/{level.modules.length}</span></div>
          <h3>{level.title}</h3><p>{level.subtitle}</p><ProgressBar value={levelProgress} label={`${level.title} completion`} />
          <div className="pc-level-card-bottom"><span>{level.modules.length} lessons</span><span aria-hidden="true">→</span></div>
        </button>;
      })}</div>
    </section>
    <section className="pc-achievement-section">
      <div className="pc-section-heading"><div><span className="pc-section-label">LITTLE MILESTONES</span><h2>Your achievements</h2></div><span className="pc-soft-note">{earned.length} of {achievements.length} earned</span></div>
      <div className="pc-achievement-grid">{achievements.slice(0, 8).map((achievement) => <AchievementCard key={achievement.id} achievement={achievement} unlocked={state.earned.includes(achievement.id)} />)}</div>
    </section>
  </main>;
}

function AchievementCard({ achievement, unlocked }) {
  return <article className={`pc-achievement-card${unlocked ? ' pc-achievement-earned' : ''}`} aria-label={`${achievement.name}${unlocked ? ', earned' : ', not yet earned'}`}>
    <span>{unlocked ? achievement.icon : '·'}</span><div><strong>{achievement.name}</strong><small>{achievement.description}</small></div>
  </article>;
}

function AchievementsView() {
  const { state } = useProgress();
  const ref = useGsapReveal('achievements');
  return <main className="pc-main pc-dashboard-main" ref={ref}>
    <div className="pc-breadcrumb"><span>Course</span><span>›</span><span>Achievements</span></div>
    <span className="pc-eyebrow">EVERY STEP COUNTS</span><h1>Your achievements</h1>
    <p className="pc-dashboard-intro">Small milestones celebrate the practice that adds up to real progress.</p>
    <div className="pc-achievement-grid pc-achievement-grid-full">{achievements.map((achievement) => <AchievementCard key={achievement.id} achievement={achievement} unlocked={state.earned.includes(achievement.id)} />)}</div>
  </main>;
}

function AchievementToast({ id, onDismiss }) {
  const achievement = getAchievement(id);
  const ref = useGsapReveal(id, { duration: 0.35 });
  useEffect(() => {
    if (!achievement) return undefined;
    const timer = setTimeout(onDismiss, 5200);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss]);
  if (!achievement) return null;
  return <div className="pc-achievement-toast" ref={ref} role="status">
    <span className="pc-toast-icon">{achievement.icon}</span><div><span className="pc-eyebrow">ACHIEVEMENT UNLOCKED</span><strong>{achievement.name}</strong><small>{achievement.description}</small></div>
    <button onClick={onDismiss} aria-label="Dismiss achievement">×</button>
  </div>;
}

function LevelUpToast({ level, onDismiss }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!level || !ref.current) return undefined;
    let active = true;
    let timeline;
    import('gsap').then(({ gsap }) => {
      if (!active || !ref.current) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      timeline = gsap.timeline();
      timeline.fromTo(ref.current, { opacity: 0, scale: reduced ? 1 : 0.9, y: reduced ? 0 : 14 }, { opacity: 1, scale: 1, y: 0, duration: reduced ? 0.01 : 0.28, ease: 'back.out(1.7)' })
        .fromTo(ref.current.querySelector('.pc-level-up-star'), { rotate: -25, scale: 0.7 }, { rotate: 0, scale: 1, duration: reduced ? 0.01 : 0.3, ease: 'back.out(2)' }, '-=0.1');
    });
    const timer = setTimeout(onDismiss, 4600);
    return () => { active = false; clearTimeout(timer); timeline?.kill(); };
  }, [level, onDismiss]);
  if (!level) return null;
  return <div className="pc-level-up-toast" ref={ref} role="status">
    <span className="pc-level-up-star">✦</span><div><span className="pc-eyebrow">LEVEL UP</span><strong>You reached level {level}</strong><small>Steady practice is adding up.</small></div>
    <button onClick={onDismiss} aria-label="Dismiss level-up message">×</button>
  </div>;
}

export default function App() {
  const { state, dispatch, user: authUser, authLoading, syncStatus, syncError, localReady } = useProgress();
  const appRef = useRef(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [page, setPage] = useState('home');
  const [activeId, setActiveId] = useState(state.currentLesson || lessons[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [layoutSize, setLayoutSize] = useState({ compact: window.innerWidth < 920, tiny: window.innerWidth < 520 });
  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pc-exercise-drafts') || '{}'); } catch { return {}; }
  });
  const lesson = lessonById[activeId] || lessons[0];
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
  const dismiss = useCallback(() => dispatch({ type: 'DISMISS_ACHIEVEMENT' }), [dispatch]);
  useEffect(() => {
    if (page === 'admin' && !isCourseAdmin(authUser)) setPage('home');
  }, [authUser, page]);
  const handleSignIn = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthError(getGoogleSignInError(error));
    } finally {
      setAuthBusy(false);
    }
  };
  const handleSignOut = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await signOutPlayer();
    } catch (error) {
      setAuthError(error.message || 'Could not sign out. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };
  useEffect(() => {
    localStorage.setItem('pc-exercise-drafts', JSON.stringify(drafts));
  }, [drafts]);
  useEffect(() => {
    const app = appRef.current;
    if (!app) return undefined;
    const update = () => setLayoutSize({ compact: window.innerWidth < 920, tiny: window.innerWidth < 520 });
    window.addEventListener('resize', update);
    update();
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      const dark = state.theme === 'dark' || (state.theme === 'system' && media.matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      root.style.colorScheme = dark ? 'dark' : 'light';
    };
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [state.theme]);
  const navigate = (id) => {
    const selected = lessonById[id];
    if (!selected) return;
    setActiveId(id);
    dispatch({ type: 'VISIT_LESSON', lessonId: id });
    setPage('lesson');
  };
  const continueLearning = () => navigate(state.currentLesson || lessons[0].id);
  const selectCurrent = useMemo(() => page === 'lesson' ? lesson : null, [page, lesson]);

  if (!localReady) {
    return <main className="pc-app-loading" aria-live="polite">Loading your course progress…</main>;
  }

  return <div ref={appRef} className={`pc-app${layoutSize.compact ? ' pc-app-compact' : ''}${layoutSize.tiny ? ' pc-app-tiny' : ''}`}>
    <Sidebar activeId={selectCurrent?.id} onSelect={navigate} onHome={() => setPage('home')} onAchievements={() => setPage('achievements')} mobileOpen={mobileOpen} compact={layoutSize.compact} closeMobile={() => setMobileOpen(false)} />
    <div className="pc-workspace">
      <Header onMenu={() => setMobileOpen(true)} user={authUser} authLoading={authLoading} authBusy={authBusy} onSignIn={handleSignIn} onSignOut={handleSignOut} onAdmin={() => setPage('admin')} />
      {!isFirebaseConfigured && <p className="pc-auth-message" role="status">Google sign-in is not configured for this build. Add the Firebase web app settings to enable it.</p>}
      {!authUser && isFirebaseConfigured && <p className="pc-sync-notice">Sign in to sync course progress across devices. Guest progress stays on this device.</p>}
      {authError && <p className="pc-auth-message pc-auth-message-error" role="alert">{authError}</p>}
      {syncError && <p className="pc-auth-message pc-auth-message-error" role="alert">{syncError}</p>}
      {authUser && <p className="pc-sync-notice" role="status">
        {syncStatus === 'synced' ? 'Progress synced to your Google account.' : syncStatus === 'syncing' || syncStatus === 'loading' ? 'Syncing your course progress…' : syncStatus === 'error' ? 'Progress is saved on this device; tracker sync is unavailable.' : 'Course progress is saved on this device.'}
      </p>}
      {import.meta.env.VITE_ADSENSE_COURSE_CONSENT_CONFIGURED === 'true' && (
        <AdSenseSlot
          slotId={import.meta.env.VITE_ADSENSE_COURSE_HEADER_SLOT || import.meta.env.VITE_ADSENSE_HOME_SLOT}
          className="pc-course-ad-slot"
        />
      )}
      {page === 'home' && <HomeView onContinue={continueLearning} onSelect={navigate} />}
      {page === 'lesson' && <Suspense fallback={<main className="pc-main"><div className="pc-editor-loading">Opening your Python editor…</div></main>}><LessonView key={lesson.id} lesson={lesson} lessonIndex={lessonIndex} drafts={drafts} setDrafts={setDrafts} onSelect={navigate} onHome={() => setPage('home')} /></Suspense>}
      {page === 'achievements' && <AchievementsView />}
      {page === 'admin' && isCourseAdmin(authUser) && <AdminDashboard onBack={() => setPage('home')} user={authUser} />}
    </div>
    {state.newestAchievement && <AchievementToast id={state.newestAchievement} onDismiss={dismiss} />}
    {state.newestLevel && <LevelUpToast level={state.newestLevel} onDismiss={() => dispatch({ type: 'DISMISS_LEVEL' })} />}
    <button className="pc-achievement-shortcut" onClick={() => setPage('achievements')} aria-label="View all achievements"><AchievementMark /> <span>{state.earned.length}</span></button>
  </div>;
}
