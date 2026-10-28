import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Braces,
  Code2,
  ExternalLink,
  Github,
  Layers3,
  Mail,
  MessageCircle,
  Menu,
  Palette,
  X,
} from "lucide-react";
import { ProjectDemo } from "./ProjectDemos.jsx";
import AdSenseSlot from "./AdSenseSlot.jsx";

const GamesPage = lazy(() => import("./GamesPage.jsx"));
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const GAMES_PATH = `${BASE_PATH}/games`;

const CONTACT_LINKS = {
  email: "mailto:your.email@example.com",
  whatsapp: "https://wa.me/yourphonenumber",
};

const projects = [
  {
    number: "01",
    name: "Analytics Dashboard",
    description: "A clear, responsive dashboard for exploring data.",
    category: "React · Tailwind CSS · Data visualization",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=75",
    imageAlt: "Colorful charts on a modern analytics dashboard",
    className: "project-image-dashboard",
    label: "Dashboard",
    descriptionDetail:
      "A concept project focused on presenting key metrics, trends, and reports in a clean interface.",
    stack: ["React", "Tailwind CSS", "Recharts"],
  },
  {
    number: "02",
    name: "Everyday Goods",
    description: "A simple shopping experience for a modern store.",
    category: "React · JavaScript · Responsive design",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=75",
    imageAlt: "A bright red sneaker presented as an online store product",
    className: "project-image-store",
    label: "E-commerce",
    descriptionDetail:
      "A storefront concept with product discovery, thoughtful product cards, and a mobile-first layout.",
    stack: ["React", "JavaScript", "CSS"],
  },
  {
    number: "03",
    name: "Focus Flow",
    description: "A lightweight task planner built for focus.",
    category: "React · UI design · Frontend",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=75",
    imageAlt: "A laptop and notes on a developer's workspace",
    className: "project-image-focus",
    label: "Productivity",
    descriptionDetail:
      "A productivity app concept that brings daily tasks, priorities, and progress into one focused view.",
    stack: ["React", "Tailwind CSS", "Lucide"],
  },
];

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
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="relative z-20">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-6 sm:px-10 lg:px-16"
      >
        <a
          href="#home"
          onClick={closeMenu}
          aria-label="Krish Raut, home"
          className="font-display text-[15px] font-extrabold tracking-[-0.06em]"
        >
          KR<span className="text-[#829f35]">.</span>
        </a>

        <div className="hidden items-center gap-9 md:flex">
          <a className="nav-link" href="#work">Work</a>
          <a className="nav-link" href={GAMES_PATH}>Play</a>
          <a className="nav-link" href="#python-projects">Python</a>
          <a className="nav-link" href="#skills">Skills</a>
          <a className="nav-link" href="#about">About</a>
          <a className="nav-link" href="#contact">Contact</a>
        </div>

        <a
          href="#contact"
          className="hidden items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-[12px] font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-paper md:flex"
        >
          Get in touch <ArrowUpRight size={14} strokeWidth={1.8} />
        </a>

        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-full p-2 md:hidden"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-full border-y border-ink/10 bg-paper px-6 py-7 shadow-lg md:hidden">
          <div className="flex flex-col gap-5">
            {[["Work", "#work"], ["Play games", GAMES_PATH], ["Python", "#python-projects"], ["Skills", "#skills"], ["About", "#about"], ["Contact", "#contact"]].map(
              ([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={closeMenu}
                  className="font-display text-2xl font-semibold tracking-tight"
                >
                  {label}
                </a>
              ),
            )}
            <a
              href="#contact"
              onClick={closeMenu}
              className="mt-1 flex items-center gap-2 text-sm font-semibold"
            >
              Get in touch <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section
      id="home"
      className="relative mx-auto flex min-h-[650px] max-w-[1440px] flex-col px-6 pb-10 pt-12 sm:px-10 sm:pt-16 md:min-h-[700px] lg:min-h-[790px] lg:px-16 lg:pt-24"
    >
      <div className="grid flex-1 items-center gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="relative z-10 pb-2" data-reveal>
          <div className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.17em] text-muted">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a7c843] opacity-40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#8eaa35]" />
            </span>
            Frontend developer · React & UI
          </div>
          <h1 className="max-w-[740px] font-display text-[clamp(3.75rem,8vw,7.4rem)] font-medium leading-[0.91] tracking-[-0.085em]">
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
          <p className="mt-8 max-w-[420px] text-[15px] leading-7 text-muted sm:text-base">
            I build clean, responsive web experiences with React and modern
            frontend tools. I enjoy turning ideas into interfaces that feel
            simple, useful, and polished.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <a href="#work" className="button-primary">
              View my projects <ArrowDownRight size={16} strokeWidth={1.8} />
            </a>
            <a href="#contact" className="text-xs font-medium text-muted hover:text-ink">
              Say hello <ArrowUpRight className="ml-1 inline" size={13} />
            </a>
          </div>
        </div>

        <div className="hero-art relative mx-auto h-[280px] w-full max-w-[490px] sm:h-[330px] lg:h-[500px]" data-reveal>
          <div className="absolute right-[5%] top-[1%] h-[82%] w-[78%] overflow-hidden rounded-[48%_48%_8px_8px] bg-[#d7d4c8]">
            <img
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-[50%_48%]"
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=75"
              alt="A team working together at a laptop"
            />
          </div>
          <div className="absolute bottom-[4%] left-[0%] w-[43%] overflow-hidden rounded-[48%_48%_8px_8px] border-[7px] border-paper bg-[#d9cdb8] sm:w-[42%]">
            <img
              loading="lazy"
              decoding="async"
              className="h-[205px] w-full object-cover sm:h-[248px] lg:h-[270px]"
              src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=700&q=75"
              alt="A laptop displaying a web development workspace"
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

      <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px] sm:tracking-[0.16em]">
        <span>Frontend development</span>
        <span className="hidden sm:inline">React · JavaScript · Tailwind CSS</span>
        <span>Thoughtful digital experiences</span>
      </div>
    </section>
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
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => {
    if (!activeProject) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setActiveProject(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeProject]);

  return (
    <section id="work" className="bg-white/55 px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1312px]">
        <SectionHeading
          eyebrow="Concepts & experiments"
          title="Selected projects"
          description="A few frontend concepts exploring useful interfaces, responsive layouts, and thoughtful details."
        />
        <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 sm:gap-y-16">
          {projects.map((project) => (
            <article
              key={project.number}
              className="project-card group"
              data-reveal
            >
              <div className="relative mb-5 aspect-[1.27/1] overflow-hidden rounded-sm bg-[#e8e6de]">
                <img
                  src={project.image}
                  alt={project.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] ${project.className}`}
                />
                <span className="absolute right-4 top-4 flex h-10 w-10 translate-y-1 items-center justify-center rounded-full bg-paper opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <ArrowUpRight size={17} />
                </span>
                <span className="absolute bottom-4 left-4 rounded-full bg-paper/90 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-ink backdrop-blur-sm">
                  {project.label}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl font-bold tracking-[-0.055em] sm:text-2xl">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-[13px] text-muted">{project.description}</p>
                </div>
                <span className="pt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                  {project.number}
                </span>
              </div>
              <p className="mt-3 text-[12px] leading-6 text-muted">
                {project.descriptionDetail}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-ink/10 px-2.5 py-1 text-[10px] font-medium text-muted"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#85867e]">
                {project.category}
              </p>
              <button
                type="button"
                onClick={() => setActiveProject(project.number)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper transition hover:bg-[#4a4b41]"
              >
                Open live demo <ArrowUpRight size={14} />
              </button>
            </article>
          ))}
        </div>
      </div>
      {activeProject && (
        <ProjectDemo project={activeProject} onClose={() => setActiveProject(null)} />
      )}
    </section>
  );
}

const pythonProjects = [
  {
    id: "automation",
    category: "Automation",
    name: "Your Python project",
    description: "Add your project name and a short description of what it does.",
    technologies: ["Python"],
    repositoryUrl: "",
  },
  {
    id: "data",
    category: "Data",
    name: "Your Python project",
    description: "Showcase a Python project for data analysis or visualization.",
    technologies: ["Python"],
    repositoryUrl: "",
  },
  {
    id: "application",
    category: "Application",
    name: "Your Python project",
    description: "Add a Python app, API, or other project you want to share.",
    technologies: ["Python"],
    repositoryUrl: "",
  },
];

function PythonProjects() {
  return (
    <section id="python-projects" className="bg-white/55 px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1312px]">
        <SectionHeading
          eyebrow="Python · GitHub"
          title="Python projects"
          description="A showcase of Python work, with each card linking directly to its GitHub repository."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pythonProjects.map((project, index) => (
            <article
              key={project.id}
              className="group flex min-h-[250px] flex-col rounded-sm border border-ink/10 bg-paper p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6"
              data-reveal
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaeae2] text-[#71862f]">
                  {index === 0 ? <Braces size={19} /> : index === 1 ? <Layers3 size={19} /> : <Code2 size={19} />}
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
              {project.repositoryUrl ? (
                <a
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-fit items-center gap-2 text-xs font-semibold transition-colors hover:text-[#71862f]"
                >
                  <Github size={15} /> View on GitHub <ExternalLink size={13} />
                </a>
              ) : (
                <p className="mt-5 text-[11px] font-medium text-muted">
                  Add your GitHub repository URL in <code>pythonProjects</code>.
                </p>
              )}
            </article>
          ))}
        </div>
        <p className="mt-5 text-[11px] text-muted" data-reveal>
          These are starter cards. Replace the sample names and descriptions with your projects, then add each repository URL to <code>pythonProjects</code> in <code>src/App.jsx</code>.
        </p>
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section id="skills" className="bg-[#eaeae2] px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
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
    <section id="about" className="px-6 py-24 sm:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto grid max-w-[1312px] gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-24">
        <div className="relative min-h-[300px] overflow-hidden rounded-sm bg-[#d8d5c9] sm:min-h-[420px]" data-reveal>
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=75"
            alt="A laptop and notes on a developer's workspace"
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
              Hey, I&apos;m Krish Raut. I&apos;m a frontend developer who enjoys
              building useful, polished experiences for the web.
            </p>
            <p>
              I work with React, JavaScript, and Tailwind CSS, and I care about
              the details that make a site feel intuitive: clear layouts,
              responsive behavior, accessibility, and a little personality.
            </p>
          </div>
          <a
            href="#contact"
            className="mt-8 inline-flex w-fit items-center gap-2 border-b border-ink pb-2 text-xs font-semibold transition-colors hover:border-[#8ea93b] hover:text-[#71862f]"
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
    <footer id="contact" className="bg-ink px-6 pb-7 pt-20 text-paper sm:px-10 lg:px-16 lg:pt-28">
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
              Have a project, opportunity, or idea to discuss? Choose how you&apos;d like
              to get in touch.
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
                <span className="mt-1 block truncate text-sm font-medium">your.email@example.com</span>
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
                <span className="mt-1 block truncate text-sm font-medium">Add your number</span>
              </span>
              <ArrowUpRight size={16} className="shrink-0 text-paper/50 transition-colors group-hover:text-[#b5d943]" />
            </a>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-5 border-t border-paper/15 pt-5 text-[10px] text-paper/55 sm:flex-row sm:items-center">
          <a href="#home" className="font-display text-sm font-extrabold tracking-[-0.06em] text-paper">
            KR<span className="text-[#b5d943]">.</span>
          </a>
          <p>© {new Date().getFullYear()} Krish Raut. Built with React & Tailwind CSS.</p>
          <a href="#home" className="transition-colors hover:text-paper">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const isGamesPage = window.location.pathname.replace(/\/+$/, "") === GAMES_PATH;

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
