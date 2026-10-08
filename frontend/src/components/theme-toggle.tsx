"use client";
import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

function subscribe(callback: () => void) {
  function sync(event: StorageEvent) {
    if (event.key === "route53-theme" || event.key === null) {
      document.documentElement.dataset.theme =
        event.newValue === "dark" ? "dark" : "light";
      callback();
    }
  }
  window.addEventListener("theme-change", callback);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener("theme-change", callback);
    window.removeEventListener("storage", sync);
  };
}
const snapshot = () => document.documentElement.dataset.theme === "dark";

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggle() {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("route53-theme", theme);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
    window.dispatchEvent(new Event("theme-change"));
  }
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label="Dark mode"
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon name={dark ? "sun" : "moon"} />
      <span className="theme-label">{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
