import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Braces,
  Code2,
  Database,
  ExternalLink,
  Github,
  Gamepad2,
  Layers3,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  Menu,
  Palette,
  UserRound,
  X,
} from "lucide-react";
import AdSenseSlot from "./AdSenseSlot.jsx";
import {
  isFirebaseConfigured,
  signInWithGoogle,
  signOutPlayer,
  useFirebaseAuth,
} from "./auth.js";

const GamesPage = lazy(() => import("./GamesPage.jsx"));
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const GAMES_PATH = `${BASE_PATH}/games`;
const PYTHON_COURSE_PATH = `${BASE_PATH}/python-course`;

const CONTACT_LINKS = {
  email: "mailto:tk042333@gmail.com",
  whatsapp: "https://wa.me/919768717870",
};

const featuredProject = {
  name: "Browser Games & Score Platform",
  image: `${BASE_PATH}/game-cards/game-platform.svg`,
  stack: ["React", "Python · FastAPI", "Firebase Auth", "SQLite · PostgreSQL"],
};

const skillGroups = [
  {
    icon: Code2,
    title: "Frontend",
    skills: ["HTML", "CSS", "JavaScript", "React"],
  },
  {
    icon: Palette,
    title: "Styling & design",
    skills: ["Tailwind CSS", "Responsive UI", "Figma"],
  },
  {
    icon: Braces,
    title: "Tools",
    skills: ["Git", "GitHub", "Vite", "VS Code"],
  },
  {
    icon: Layers3,
    title: "What I enjoy",
    skills: ["Component design", "Accessibility", "UI details"],
  },
  {
    icon: Database,
    title: "Python & backend",
    skills: ["Python", "FastAPI", "SQLite", "PostgreSQL"],
  },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const { user, loading: authLoading } = useFirebaseAuth();

  const closeMenu = () => setMenuOpen(false);
  const authenticate = async (action) => {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      await action();
      closeMenu();
    } catch (error) {
      if (error?.code !== "auth/popup-closed-by-user" && error?.code !== "auth/cancelled-popup-request") {
        setAuthMessage(error?.code === "auth/unauthorized-domain"
          ? `Google sign-in is not enabled for ${window.location.hostname}. Add this domain to Firebase Authentication's authorized domains.`
          : error?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setAuthBusy(false);
    }
  };
  const authAction = user ? (
    <button
      type="button"
      onClick={() => authenticate(signOutPlayer)}
      disabled={authBusy}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 py-2.5 text-[11px] font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-60"
      aria-label={`Sign out ${user.email || user.displayName || "account"}`}
    >
      <UserRound size={14} />
      <span className="max-w-32 truncate">{authBusy ? "Signing out…" : user.displayName || user.email || "Account"}</span>
      <LogOut size={13} />
    </button>
  ) : (
    <button
      type="button"
      onClick={() => authenticate(signInWithGoogle)}
      disabled={!isFirebaseConfigured || authLoading || authBusy}
      title={!isFirebaseConfigured ? "Google sign-in is not configured." : undefined}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogIn size={14} />
      {authLoading ? "Checking sign-in…" : authBusy ? "Connecting…" : "Continue with Google"}
    </button>
  );

  return (
    <header className="relative z-20">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-10 sm:py-6 lg:px-16"
      >
        <a
          href="#home"
          onClick={closeMenu}
          aria-label="Krish Raut, home"
          className="inline-flex min-h-11 min-w-11 items-center font-display text-[15px] font-extrabold tracking-[-0.06em]"
        >
          KR<span className="text-[#829f35]">.</span>
        </a>

        <div className="hidden items-center gap-9 xl:flex">
          <a className="nav-link" href="#work">Work</a>
          <a className="nav-link" href={GAMES_PATH}>Play</a>
          <a className="nav-link" href="#python-projects">Python</a>
          <a className="nav-link" href={`${PYTHON_COURSE_PATH}/`}>Learn Python</a>
          <a className="nav-link" href="#skills">Skills</a>
          <a className="nav-link" href="#about">About</a>
          <a className="nav-link" href="#contact">Contact</a>
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          {authAction}
          <a
            href="#contact"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-[12px] font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-paper"
          >
            Get in touch <ArrowUpRight size={14} strokeWidth={1.8} />
          </a>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 xl:hidden"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-full border-y border-ink/10 bg-paper px-5 py-5 shadow-lg xl:hidden">
          <div className="flex flex-col gap-5">
            {[["Work", "#work"], ["Play games", GAMES_PATH], ["Python", "#python-projects"], ["Learn Python", `${PYTHON_COURSE_PATH}/`], ["Skills", "#skills"], ["About", "#about"], ["Contact", "#contact"]].map(
              ([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={closeMenu}
                  className="flex min-h-11 items-center font-display text-2xl font-semibold tracking-tight"
                >
                  {label}
                </a>
              ),
            )}
            <a
              href="#contact"
              onClick={closeMenu}
              className="mt-1 flex min-h-11 items-center gap-2 text-sm font-semibold"
            >
              Get in touch <ArrowUpRight size={16} />
            </a>
            {authAction}
          </div>
        </div>
      )}
      {authMessage && <p className="px-5 pb-3 text-xs text-red-700 sm:px-10 lg:px-16" role="alert">{authMessage}</p>}
    </header>
  );
}

function Hero() {
  return (
    <section
      id="home"
      className="relative mx-auto flex min-h-[580px] max-w-[1440px] flex-col px-5 pb-8 pt-8 sm:min-h-[700px] sm:px-10 sm:pb-10 sm:pt-16 lg:min-h-[790px] lg:px-16 lg:pt-24"
    >
      <div className="grid flex-1 items-center gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="relative z-10 pb-2" data-reveal>
          <div className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.17em] text-muted">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a7c843] opacity-40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#8eaa35]" />
            </span>
            Frontend developer · Python learner
          </div>
          <h1 className="max-w-[740px] font-display text-[clamp(3.25rem,12vw,7.4rem)] font-medium leading-[0.91] tracking-[-0.085em]">
            Hi, I&apos;m
            <br />
            Krish{" "}
            <span className="relative inline-block">
              Raut<span className="text-[#8ea93b]">.</span>
              <svg
                className="absolute -bottom-3 left-1 w-[96%]"
                viewBox="0 0 310 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 13C80 4 216 2 306 8"
                  stroke="#B5D943"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-[420px] text-sm leading-6 text-muted sm:mt-8 sm:text-base sm:leading-7">
            I build clean, responsive web experiences with React while learning
            Python through practical projects. I enjoy making games and interfaces
            that feel simple, useful, and polished.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
            <a href={GAMES_PATH} className="button-primary">
              <Gamepad2 size={16} strokeWidth={1.8} />
              Play games
            </a>
            <a
              href={`${PYTHON_COURSE_PATH}/`}
              className="inline-flex min-h-11 items-center gap-3 rounded-full border border-ink/15 px-[21px] text-xs font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              Learn Python <ArrowRight size={16} strokeWidth={1.8} />
            </a>
          </div>
        </div>

        <div className="hero-art relative mx-auto mt-3 h-[250px] w-full max-w-[490px] sm:mt-0 sm:h-[330px] lg:h-[500px]" data-reveal>
          <div className="absolute right-[5%] top-[1%] h-[82%] w-[78%] overflow-hidden rounded-[48%_48%_8px_8px] bg-[#d7d4c8]">
            <img
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-[50%_48%]"
              src={`${BASE_PATH}/game-cards/game-board.svg`}
              alt="Illustrated Context Guess sample game board"
            />
          </div>
          <div className="absolute bottom-[4%] left-[0%] w-[43%] overflow-hidden rounded-[48%_48%_8px_8px] border-[7px] border-paper bg-[#d9cdb8] sm:w-[42%]">
            <img
              loading="lazy"
              decoding="async"
              className="h-[205px] w-full object-cover sm:h-[248px] lg:h-[270px]"
              src={featuredProject.image}
              alt="Illustrated preview of the browser games and live player dashboard"
            />
          </div>
          <div className="absolute bottom-[11%] right-[4%] flex h-[82px] w-[82px] rotate-[-12deg] items-center justify-center rounded-full bg-[#b5d943] text-center text-[10px] font-bold uppercase leading-[1.35] tracking-[0.1em] text-ink shadow-lg sm:h-[100px] sm:w-[100px] sm:text-[11px]">
            Build with
            <br />
            curiosity
            <Asterisk className="absolute -right-1 -top-3" size={23} strokeWidth={1.7} />
          </div>
          <div className="absolute left-[8%] top-[9%] hidden -rotate-6 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted sm:block">
            Thoughtfully made ↗
          </div>
          <div className="absolute bottom-[-2%] left-[47%] hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:flex">
            Scroll to explore <ArrowDown size={13} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-ink/10 pt-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted sm:mt-8 sm:pt-5 sm:text-[11px] sm:tracking-[0.16em]">
        <span>Frontend development</span>
        <span className="hidden sm:inline">React · JavaScript · Tailwind CSS</span>
        <span>Thoughtful digital experiences</span>
      </div>
    </section>
  );
}

function LimeMarquee() {
  const message = "BUILD · PLAY · LEARN · MAKE SOMETHING GOOD · ";
  return (
    <div className="lime-marquee" aria-label="Build, play, learn, make something good">
      <div className="lime-marquee-track" aria-hidden="true">
        <span>{message.repeat(3)}</span>
        <span>{message.repeat(3)}</span>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-5 md:mb-14 md:flex-row md:items-end" data-reveal>
      <div>
        <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
          <Asterisk size={14} className="text-[#8ea93b]" /> {eyebrow}
        </div>
        <h2 className="font-display text-4xl font-medium leading-[1] tracking-[-0.07em] sm:text-5xl lg:text-6xl">
          {title}
        </h2>
      </div>
      {description && (
        <p className="max-w-[330px] text-sm leading-6 text-muted">{description}</p>
      )}
    </div>
  );
}

function Work() {
  return (
    <section id="work" className="bg-white/55 px-5 py-16 sm:px-10 sm:py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1312px]">
        <SectionHeading
          eyebrow="Built & playable"
          title="Work from this portfolio"
          description="A real, playable game collection backed by a Python API that verifies game results and keeps the leaderboard."
        />
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <a
            href={`${GAMES_PATH}/context-guess`}
            className="group relative block overflow-hidden rounded-sm bg-[#e8e6de]"
            aria-label={`Play ${featuredProject.name}`}
          >
            <img
              src={featuredProject.image}
              alt="Preview of the browser game collection and live player dashboard"
              loading="lazy"
              decoding="async"
              className="aspect-[1.9/1] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
            />
          </a>
          <article
            data-reveal
            className="motion-card rounded-xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8"
            onPointerMove={handleMotionCardPointerMove}
            onPointerLeave={handleMotionCardPointerLeave}
          >
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              <Gamepad2 size={15} className="text-[#829f35]" /> Live project
            </div>
            <h3 className="font-display text-3xl font-semibold tracking-[-0.06em]">
              {featuredProject.name}
            </h3>
            <p className="mt-4 text-sm leading-6 text-muted">
              I wanted a portfolio where visitors can actually play the games
              and where saved scores are trustworthy. The Python API verifies
              each game session and result before updating the live dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {featuredProject.stack.map((item) => (
                <span key={item} className="rounded-full border border-ink/10 px-2.5 py-1 text-[10px] font-medium text-muted">
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-4">
              <a href={`${GAMES_PATH}/context-guess`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-xs font-semibold text-paper transition hover:bg-[#4a4b41]">
                Play Context Guess <ArrowUpRight size={14} />
              </a>
              <a href="https://github.com/krishraut997-cloud/thwebkris" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold transition-colors hover:text-[#71862f]">
                <Github size={15} /> View the code <ExternalLink size={13} />
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

const pythonProjects = [
  {
    id: "game-api",
    category: "FastAPI · Game backend",
    name: "Verified Game Score API",
    description: "A Python API for player profiles, server-verified game sessions, score records, and the live leaderboard. Supports SQLite locally and PostgreSQL in production.",
    technologies: ["Python", "FastAPI", "SQLite · PostgreSQL", "unittest"],
    repositoryUrl: "https://github.com/krishraut997-cloud/thwebkris/tree/main/score_backend",
  },
  {
    id: "python-course",
    category: "Python · Interactive course",
    name: "Python Path",
    description: "A free, hands-on Python course with guided lessons, runnable exercises, instant feedback, and saved learning progress.",
    technologies: ["Python", "React", "Pyodide", "CodeMirror"],
    repositoryUrl: "https://github.com/krishraut997-cloud/thwebkris/tree/main/python-course",
    courseUrl: `${PYTHON_COURSE_PATH}/`,
  },
];

function PythonProjects() {
  return (
    <section id="python-projects" className="bg-white/55 px-5 py-16 sm:px-10 sm:py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1312px]">
        <SectionHeading
          eyebrow="Python · GitHub"
          title="Learning by building"
          description="I’m learning Python from the fundamentals and working toward job-ready skills by building and testing a real backend."
        />
        <div className="grid max-w-[780px] gap-4">
          {pythonProjects.map((project) => (
            <article
              key={project.id}
              className="motion-card group flex min-h-[250px] flex-col rounded-xl border border-ink/10 bg-paper p-5 shadow-sm sm:p-6"
              onPointerMove={handleMotionCardPointerMove}
              onPointerLeave={handleMotionCardPointerLeave}
              data-reveal
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaeae2] text-[#71862f]">
                  <Braces size={19} />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {project.category}
                </span>
              </div>
              <h3 className="mt-7 font-display text-xl font-semibold tracking-[-0.05em]">
                {project.name}
              </h3>
              <p className="mt-2 flex-1 text-xs leading-6 text-muted">
                {project.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.technologies.map((technology) => (
                  <span key={technology} className="rounded-full border border-ink/10 px-2.5 py-1 text-[10px] font-medium text-muted">
                    {technology}
                  </span>
                ))}
              </div>
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 text-xs font-semibold transition-colors hover:text-[#71862f]"
              >
                <Github size={15} /> View on GitHub <ExternalLink size={13} />
              </a>
              {project.courseUrl && (
                <a
                  href={project.courseUrl}
                  className="mt-2 inline-flex min-h-11 w-fit items-center gap-2 text-xs font-semibold transition-colors hover:text-[#71862f]"
                >
                  Start learning <ArrowUpRight size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section id="skills" className="bg-[#eaeae2] px-5 py-16 sm:px-10 sm:py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1312px]">
        <SectionHeading
          eyebrow="My toolkit"
          title="Skills & technologies"
          description="The tools I use to design, build, and refine responsive web experiences."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map(({ icon: Icon, title, skills }) => (
            <div key={title} className="min-h-[185px] rounded-sm bg-paper p-5 sm:p-6" data-reveal>
              <Icon size={21} strokeWidth={1.6} className="text-[#829f35]" />
              <h3 className="mt-6 font-display text-lg font-semibold tracking-[-0.04em]">
                {title}
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full border border-ink/10 px-2.5 py-1 text-[10px] font-medium text-muted"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="px-5 py-16 sm:px-10 sm:py-24 lg:px-16 lg:py-32">
      <div className="mx-auto grid max-w-[1312px] gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-24">
        <div className="relative min-h-[300px] overflow-hidden rounded-sm bg-[#d8d5c9] sm:min-h-[420px]" data-reveal>
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={`${BASE_PATH}/game-cards/game-platform.svg`}
            alt="Illustrated preview of the browser games and live player dashboard"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute bottom-5 left-5 rounded-full bg-paper/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.13em] backdrop-blur-sm">
            Curious by nature. Focused on the details.
          </div>
        </div>
        <div className="flex flex-col justify-center py-2 lg:py-8" data-reveal>
          <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            <Asterisk size={14} className="text-[#8ea93b]" /> A bit about me
          </div>
          <h2 className="max-w-[660px] font-display text-[clamp(2.6rem,5vw,4.5rem)] font-medium leading-[1.03] tracking-[-0.075em]">
            Building for the
            <br />
            <span className="text-[#898b80]">web, with care.</span>
          </h2>
          <div className="mt-7 max-w-[520px] space-y-4 text-sm leading-7 text-muted sm:text-[15px]">
            <p>
              Hey, I&apos;m Krish Raut. I&apos;m learning Python from the basics
              and building toward job-ready skills through practical projects.
            </p>
            <p>
              This site is both my portfolio and a place to play browser games.
              I built it with a live game dashboard, a Python score API, and a
              focus on clean UI, useful motion, and a welcoming player experience.
            </p>
          </div>
          <a
            href="#contact"
            className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 border-b border-ink text-xs font-semibold transition-colors hover:border-[#8ea93b] hover:text-[#71862f]"
          >
            Get in touch <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <footer id="contact" className="bg-ink px-5 pb-7 pt-16 text-paper sm:px-10 sm:pt-20 lg:px-16 lg:pt-28">
      <div className="mx-auto max-w-[1312px]">
        <div className="grid gap-10 pb-16 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:gap-16 lg:pb-24" data-reveal>
          <div>
            <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-paper/55">
              <Asterisk size={14} className="text-[#b5d943]" /> Have a good one in mind?
            </div>
            <h2 className="max-w-[800px] font-display text-[clamp(3.25rem,8vw,7rem)] font-medium leading-[0.9] tracking-[-0.08em]">
              Let&apos;s build
              <br />
              something <span className="text-[#b5d943]">great.</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-6 text-paper/65">
              I&apos;m looking for entry-level Python opportunities and
              collaborations on playful web and game projects. Have an idea to
              discuss? Choose how you&apos;d like to get in touch.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <a
              href={CONTACT_LINKS.email}
              className="group flex items-center gap-4 rounded-lg border border-paper/15 p-4 transition-colors hover:border-[#b5d943]/70 hover:bg-white/5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#b5d943] text-ink">
                <Mail size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.13em] text-paper/55">Email</span>
                <span className="mt-1 block truncate text-sm font-medium">tk042333@gmail.com</span>
              </span>
              <ArrowUpRight size={16} className="shrink-0 text-paper/50 transition-colors group-hover:text-[#b5d943]" />
            </a>
            <a
              href={CONTACT_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-lg border border-paper/15 p-4 transition-colors hover:border-[#b5d943]/70 hover:bg-white/5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#b5d943] text-ink">
                <MessageCircle size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.13em] text-paper/55">WhatsApp</span>
                <span className="mt-1 block truncate text-sm font-medium">9768717870</span>
              </span>
              <ArrowUpRight size={16} className="shrink-0 text-paper/50 transition-colors group-hover:text-[#b5d943]" />
            </a>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-5 border-t border-paper/15 pt-5 text-[10px] text-paper/55 sm:flex-row sm:items-center">
          <a href="#home" className="inline-flex min-h-11 min-w-11 items-center font-display text-sm font-extrabold tracking-[-0.06em] text-paper">
            KR<span className="text-[#b5d943]">.</span>
          </a>
          <nav aria-label="Site information" className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="./about.html" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-paper">About</a>
            <a href="./contact.html" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-paper">Contact</a>
            <a href="./privacy-policy.html" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-paper">Privacy</a>
            <a href="./terms.html" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-paper">Terms</a>
          </nav>
          <p>© {new Date().getFullYear()} Krish Raut. Built with React & Tailwind CSS.</p>
          <a href="#home" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-paper">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}

function handleMotionCardPointerMove(event) {
  if (
    event.pointerType === "touch" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  card.style.transform = `perspective(900px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-4px)`;
}

function handleMotionCardPointerLeave(event) {
  event.currentTarget.style.transform = "";
}

export default function App() {
  const requestedRoute = new URLSearchParams(window.location.search).get("route");
  if (requestedRoute) {
    const routeUrl = new URL(requestedRoute, window.location.origin);
    if (routeUrl.origin === window.location.origin && routeUrl.pathname.startsWith("/")) {
      window.history.replaceState(
        null,
        "",
        `${BASE_PATH}${routeUrl.pathname}${routeUrl.search}${routeUrl.hash}`,
      );
    }
  }

  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const isGamesPage =
    currentPath === GAMES_PATH || currentPath.startsWith(`${GAMES_PATH}/`);

  useEffect(() => {
    if (isGamesPage) {
      document.title = "Play Games — Krish Raut";
      return undefined;
    }

    const elements = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );

    elements.forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 80}ms`);
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [isGamesPage]);

  if (isGamesPage) {
    return (
      <Suspense fallback={<main className="min-h-screen bg-paper px-5 py-16 text-center text-sm text-muted">Loading games…</main>}>
        <GamesPage />
      </Suspense>
    );
  }

  return (
    <>
      <Header />
      <main>
        <Hero />
        <LimeMarquee />
        <Work />
        <AdSenseSlot slotId={import.meta.env.VITE_ADSENSE_HOME_SLOT} className="my-12 sm:my-16" />
        <PythonProjects />
        <Skills />
        <About />
      </main>
      <Contact />
    </>
  );
}
