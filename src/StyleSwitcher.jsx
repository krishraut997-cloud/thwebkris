import React, { useEffect, useState } from "react";

const STORAGE_KEY = "portfolio-design-style";
const styles = [
  { id: "clean-motion", label: "Clean + motion" },
  { id: "premium", label: "Premium" },
  { id: "khatra", label: "Khatra" },
];

function getSavedStyle() {
  try {
    const savedStyle = window.localStorage.getItem(STORAGE_KEY);
    return styles.some(({ id }) => id === savedStyle) ? savedStyle : "clean-motion";
  } catch (error) {
    if (error instanceof DOMException && error.name === "SecurityError") {
      return "clean-motion";
    }
    throw error;
  }
}

export function useDesignStyle() {
  const [style, setStyle] = useState(getSavedStyle);

  useEffect(() => {
    document.documentElement.dataset.style = style;
    try {
      window.localStorage.setItem(STORAGE_KEY, style);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "SecurityError")) {
        throw error;
      }
    }
  }, [style]);

  return [style, setStyle];
}

export default function StyleSwitcher({ value, onChange, className = "" }) {
  return (
    <div
      role="group"
      aria-label="Visual style"
      className={`inline-flex items-center gap-0.5 rounded-full border border-ink/10 bg-white p-1 shadow-sm ${className}`}
    >
      {styles.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`min-h-9 rounded-full px-2.5 text-[10px] font-semibold transition-colors sm:px-3 ${
            value === id ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
