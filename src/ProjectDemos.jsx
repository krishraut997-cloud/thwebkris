import React, { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock3,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

const activity = [
  ["Online store", "E-commerce", "Today, 10:42 AM", 4820, "Active"],
  ["Product launch", "Campaign", "Today, 9:18 AM", 3260, "Active"],
  ["Spring collection", "E-commerce", "Yesterday", 2840, "Active"],
  ["Newsletter #24", "Email", "Yesterday", 1760, "Complete"],
  ["Weekend sale", "Campaign", "Oct 24, 2026", 1390, "Complete"],
];

function AnalyticsDemo() {
  const [range, setRange] = useState("7 days");
  const [search, setSearch] = useState("");
  const scale = range === "30 days" ? 4.2 : range === "90 days" ? 11.6 : 1;
  const bars = [36, 54, 43, 74, 52, 88, 65, 77, 58, 95, 71, 84];
  const rows = activity.filter(([name, type]) =>
    `${name} ${type}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs text-muted">Tuesday, October 27, 2026</p><h3 className="mt-1 font-display text-2xl font-semibold tracking-[-0.06em]">Overview</h3></div>
        <label className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs">
          <Clock3 size={14} className="text-muted" /><span className="sr-only">Date range</span>
          <select value={range} onChange={(event) => setRange(event.target.value)} className="bg-transparent outline-none"><option>7 days</option><option>30 days</option><option>90 days</option></select><ChevronDown size={13} className="text-muted" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Total revenue", `$${(48270 * scale).toLocaleString()}`, "+12.8%"], ["Orders", Math.round(384 * scale).toLocaleString(), "+8.2%"], ["Conversion rate", "3.64%", "+0.6%"]].map(([label, value, change]) => (
          <div key={label} className="rounded-lg border border-ink/10 bg-white p-4"><p className="text-xs text-muted">{label}</p><div className="mt-3 flex items-end justify-between gap-2"><p className="font-display text-2xl font-semibold tracking-[-0.06em]">{value}</p><span className="text-[10px] font-semibold text-[#71862f]">{change}</span></div></div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-ink/10 bg-white p-4 sm:p-5">
        <div><h4 className="text-sm font-semibold">Revenue over time</h4><p className="mt-1 text-[11px] text-muted">Sales performance · {range}</p></div>
        <div className="mt-5 flex h-36 items-end gap-1.5 sm:gap-3" aria-label={`Revenue chart for ${range}`}>
          {bars.map((height, index) => <div key={index} className="group flex h-full flex-1 items-end"><div title={`$${Math.round(height * scale * 46).toLocaleString()}`} style={{ height: `${height}%` }} className={`w-full rounded-t-sm transition-colors ${index === 9 ? "bg-[#829f35]" : "bg-[#dce7bd] group-hover:bg-[#bacd89]"}`} /></div>)}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted"><span>Oct 21</span><span>Oct 23</span><span>Oct 25</span><span>Oct 27</span></div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-ink/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-4"><div><h4 className="text-sm font-semibold">Recent activity</h4><p className="mt-1 text-[11px] text-muted">Your latest sales and campaigns</p></div><label className="flex items-center gap-2 rounded-md border border-ink/10 px-2.5 py-2"><Search size={13} className="text-muted" /><span className="sr-only">Search activity</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="w-24 bg-transparent text-xs outline-none sm:w-32" /></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-[#f8f8f5] text-[10px] uppercase tracking-wide text-muted"><tr>{["Name", "Type", "Date", "Revenue", "Status"].map((item) => <th key={item} className="px-4 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y divide-ink/5">{rows.map(([name, type, date, revenue, status]) => <tr key={name}><td className="px-4 py-3 font-medium">{name}</td><td className="px-4 py-3 text-muted">{type}</td><td className="px-4 py-3 text-muted">{date}</td><td className="px-4 py-3">${revenue.toLocaleString()}</td><td className="px-4 py-3"><span className="rounded-full bg-[#eef4db] px-2 py-1 text-[10px] text-[#71862f]">{status}</span></td></tr>)}{rows.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-muted">No matching activity.</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
}

const products = [
  { id: 1, name: "Everyday Runner", category: "Footwear", price: 89, image: "photo-1542291026-7eec264c27ff" },
  { id: 2, name: "Canvas Carryall", category: "Accessories", price: 48, image: "photo-1590874103328-eac38a683ce7" },
  { id: 3, name: "Classic Timepiece", category: "Accessories", price: 125, image: "photo-1524592094714-0f0654e20314" },
  { id: 4, name: "Weekend Layer", category: "Apparel", price: 76, image: "photo-1529139574466-a303027c1d8b" },
  { id: 5, name: "Soft Knit", category: "Apparel", price: 64, image: "photo-1576566588028-4147f3842f27" },
  { id: 6, name: "Studio Sneaker", category: "Footwear", price: 98, image: "photo-1495555961986-6d4c1ecb7be3" },
];

function StoreDemo() {
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState({});
  const [ordered, setOrdered] = useState(false);
  const categories = ["All", "Apparel", "Footwear", "Accessories"];
  const visible = products.filter((product) => category === "All" || product.category === category);
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = products.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0);

  function changeQuantity(id, amount) {
    setOrdered(false);
    setCart((current) => {
      const quantity = (current[id] || 0) + amount;
      const updated = { ...current };
      if (quantity <= 0) delete updated[id];
      else updated[id] = quantity;
      return updated;
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.15em] text-muted">The everyday edit</p><h3 className="mt-1 font-display text-2xl font-semibold tracking-[-0.06em]">Good things, made useful.</h3></div><div className="rounded-full bg-[#eaeae2] px-3 py-2 text-xs font-semibold"><ShoppingBag size={14} className="mr-1 inline" /> Bag · {count}</div></div>
      <div className="mb-5 flex flex-wrap gap-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${category === item ? "bg-ink text-white" : "border border-ink/10 bg-white hover:bg-[#eaeae2]"}`}>{item}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => <article key={product.id} className="overflow-hidden rounded-lg border border-ink/10 bg-white"><div className="aspect-[1.25/1] bg-[#eeeae2]"><img src={`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=600&q=70`} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" /></div><div className="p-3.5"><p className="text-[10px] uppercase tracking-wide text-muted">{product.category}</p><div className="mt-1 flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">{product.name}</h4><span className="text-xs font-medium">${product.price}</span></div><button type="button" onClick={() => changeQuantity(product.id, 1)} className="mt-3 w-full rounded-full border border-ink/15 py-2 text-[11px] font-semibold transition hover:bg-ink hover:text-white">{cart[product.id] ? `Add another · ${cart[product.id]} in bag` : "Add to bag"}</button></div></article>)}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#eaeae2] p-4"><div><p className="text-xs font-semibold">Your bag · {count} {count === 1 ? "item" : "items"}</p><p className="mt-1 text-xs text-muted">Subtotal <span className="font-semibold text-ink">${total.toFixed(2)}</span></p></div><button type="button" disabled={count === 0} onClick={() => { setOrdered(true); setCart({}); }} className="rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#4a4b41] disabled:cursor-not-allowed disabled:opacity-40">Demo checkout</button></div>
      {ordered && <p role="status" className="mt-3 flex items-center gap-2 text-xs font-medium text-[#71862f]"><Check size={15} /> Demo order complete — no payment was taken.</p>}
    </div>
  );
}

function FocusDemo() {
  const [tasks, setTasks] = useState([{ id: 1, text: "Plan the day", done: true }, { id: 2, text: "Finish dashboard layout", done: false }, { id: 3, text: "Review project notes", done: false }]);
  const [filter, setFilter] = useState("All");
  const [newTask, setNewTask] = useState("");
  const [seconds, setSeconds] = useState(1500);
  const [running, setRunning] = useState(false);
  const doneCount = tasks.filter((task) => task.done).length;
  const visible = tasks.filter((task) => filter === "All" || (filter === "Done" ? task.done : !task.done));

  useEffect(() => {
    if (!running) return undefined;
    const timerId = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timerId);
  }, [running]);

  useEffect(() => {
    if (seconds === 0) setRunning(false);
  }, [seconds]);

  function addTask(event) {
    event.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    setTasks((current) => [...current, { id: Date.now(), text, done: false }]);
    setNewTask("");
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_0.8fr]">
      <div className="rounded-lg border border-ink/10 bg-white p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted">Your day, at your pace</p><h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.05em]">Today&apos;s tasks</h3></div><span className="rounded-full bg-[#eef4db] px-2.5 py-1 text-[10px] font-semibold text-[#71862f]">{doneCount}/{tasks.length} done</span></div>
        <form onSubmit={addTask} className="mt-5 flex gap-2"><label className="sr-only" htmlFor="focus-new-task">Add a task</label><input id="focus-new-task" value={newTask} onChange={(event) => setNewTask(event.target.value)} maxLength={100} placeholder="Add a task..." className="min-w-0 flex-1 rounded-md border border-ink/10 px-3 py-2.5 text-xs outline-none focus:border-[#829f35]" /><button type="submit" aria-label="Add task" className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white hover:bg-[#4a4b41]"><Plus size={16} /></button></form>
        <div className="my-4 flex gap-1 border-b border-ink/10 pb-2">{["All", "Active", "Done"].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${filter === item ? "bg-[#eaeae2] text-ink" : "text-muted hover:text-ink"}`}>{item}</button>)}</div>
        <ul className="space-y-2">{visible.map((task) => <li key={task.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-[#f8f8f5]"><button type="button" onClick={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} aria-label={`${task.done ? "Mark incomplete" : "Complete"}: ${task.text}`} className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${task.done ? "border-[#829f35] bg-[#829f35] text-white" : "border-ink/25"}`}>{task.done && <Check size={11} />}</button><span className={`flex-1 text-xs ${task.done ? "text-muted line-through" : "text-ink"}`}>{task.text}</span><button type="button" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))} aria-label={`Delete ${task.text}`} className="rounded p-1.5 text-muted hover:bg-[#eaeae2] hover:text-ink"><Trash2 size={13} /></button></li>)}{visible.length === 0 && <li className="py-6 text-center text-xs text-muted">No tasks in this view.</li>}</ul>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg bg-[#eaeae2] p-5 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-paper"><Clock3 size={18} /></span><p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Focus session</p><p className="mt-2 font-display text-5xl font-medium tabular-nums tracking-[-0.07em]" aria-live="polite">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p><p className="mt-2 text-xs text-muted">One thing at a time.</p><div className="mt-5 flex items-center gap-2"><button type="button" onClick={() => setRunning(!running)} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#4a4b41]">{running ? <Pause size={14} /> : <Play size={14} />}{running ? "Pause" : "Start focus"}</button><button type="button" onClick={() => { setRunning(false); setSeconds(1500); }} aria-label="Reset timer" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 hover:bg-paper"><RotateCcw size={14} /></button></div><p className="mt-4 text-[10px] text-muted">25-minute focus timer</p></div>
    </div>
  );
}

export function ProjectDemo({ project, onClose }) {
  const details = {
    "01": { name: "Analytics Dashboard", stack: "React · Interactive sample data", content: <AnalyticsDemo /> },
    "02": { name: "Everyday Goods", stack: "React · Storefront prototype", content: <StoreDemo /> },
    "03": { name: "Focus Flow", stack: "React · Tasks & focus timer", content: <FocusDemo /> },
  }[project];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/65 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="project-demo-title" className="max-h-[94vh] w-full max-w-[1050px] overflow-y-auto rounded-xl bg-paper shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur sm:px-6"><div className="min-w-0"><h2 id="project-demo-title" className="truncate font-display text-lg font-semibold tracking-[-0.04em]">{details.name}</h2><p className="mt-0.5 text-[10px] text-muted">{details.stack} · Demo</p></div><button type="button" onClick={onClose} aria-label="Close project demo" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 hover:bg-[#eaeae2]"><X size={17} /></button></div>
        <div className="p-4 sm:p-6">{details.content}</div>
      </div>
    </div>
  );
}
