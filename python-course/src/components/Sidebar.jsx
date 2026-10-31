import { useEffect, useRef, useState } from 'react';
import { course, lessons } from '../content/course.js';
import { useProgress } from '../context/ProgressContext.jsx';
import AchievementMark from './AchievementMark.jsx';

export default function Sidebar({ activeId, onSelect, onHome, onAchievements, mobileOpen, compact, closeMobile }) {
  const { state } = useProgress();
  const [expanded, setExpanded] = useState(Object.fromEntries(course.map((level) => [level.id, true])));
  const activeIndex = lessons.findIndex((item) => item.id === activeId);
  const sidebarRef = useRef(null);
  useEffect(() => {
    let active = true;
    import('gsap').then(({ gsap }) => {
      if (!active || !sidebarRef.current) return;
      const isMobile = window.matchMedia('(max-width: 760px)').matches || compact;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.to(sidebarRef.current, {
        x: isMobile && !mobileOpen ? '-105%' : 0,
        duration: reduced ? 0.01 : 0.24,
        ease: 'power2.out',
      });
    });
    return () => { active = false; };
  }, [mobileOpen, compact]);
  return (
    <>
      {mobileOpen && <button className="pc-mobile-scrim" onClick={closeMobile} aria-label="Close course navigation" />}
      <aside ref={sidebarRef} className={`pc-sidebar${mobileOpen ? ' pc-sidebar-open' : ''}`} aria-label="Course navigation">
        <button className="pc-brand" onClick={onHome} aria-label="PyLearningCourse home">
          <span className="pc-brand-mark">Py</span><span>PyLearningCourse<small>learn at your pace</small></span>
        </button>
        <div className="pc-sidebar-heading">YOUR COURSE</div>
        <nav className="pc-course-nav">
          {course.map((level) => {
            const levelLessons = level.modules;
            const levelDone = levelLessons.filter((item) => state.completedLessons.includes(item.id)).length;
            return (
              <section className="pc-level" key={level.id}>
                <button className="pc-level-toggle" onClick={() => setExpanded((prev) => ({ ...prev, [level.id]: !prev[level.id] }))} aria-expanded={expanded[level.id]}>
                  <span className="pc-level-dot" style={{ backgroundColor: level.color }} />
                  <span className="pc-level-title">{level.title}<small>{level.subtitle}</small></span>
                  <span className="pc-level-count">{levelDone}/{levelLessons.length}</span>
                  <span className="pc-chevron">{expanded[level.id] ? '−' : '+'}</span>
                </button>
                {expanded[level.id] && <ol className="pc-lesson-list">
                  {levelLessons.map((item) => {
                    const index = lessons.findIndex((entry) => entry.id === item.id);
                    const locked = index > 0 && !state.completedLessons.includes(lessons[index - 1].id);
                    const done = state.completedLessons.includes(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          className={`pc-lesson-link${activeId === item.id ? ' pc-lesson-active' : ''}${locked ? ' pc-lesson-locked' : ''}`}
                          onClick={() => { if (!locked) { onSelect(item.id); closeMobile?.(); } }}
                          disabled={locked}
                          aria-current={activeId === item.id ? 'page' : undefined}
                          aria-label={`${item.title}${done ? ', completed' : locked ? ', locked, complete the previous lesson first' : ''}`}
                        >
                          <span className={`pc-lesson-state${done ? ' pc-state-done' : ''}`}>{done ? '✓' : locked ? '🔒' : index < activeIndex ? '○' : '·'}</span>
                          <span>{item.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>}
              </section>
            );
          })}
        </nav>
        <div className="pc-sidebar-footer">
          <button className="pc-sidebar-link" onClick={() => { onAchievements(); closeMobile?.(); }}><AchievementMark /> <span>Achievements</span></button>
          <button className="pc-sidebar-link" onClick={() => { onHome(); closeMobile?.(); }}>⌂ <span>Dashboard</span></button>
          <div className="pc-sidebar-note">Your progress is saved on this device.</div>
        </div>
      </aside>
    </>
  );
}
