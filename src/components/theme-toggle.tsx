"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_KEY as key } from "@/constants/constants";
function subscribe(update: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  function syncSystem() {
    let preference: string | null = null;
    try {
      preference = localStorage.getItem(key);
    } catch {}
    if (preference !== "light" && preference !== "dark") {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    }
    update();
  }
  function syncStorage(event: StorageEvent) {
    if (event.key !== key && event.key !== null) return;
    document.documentElement.dataset.theme =
      event.newValue === "dark" || event.newValue === "light"
        ? event.newValue
        : media.matches
          ? "dark"
          : "light";
    update();
  }
  window.addEventListener("voxa-theme-change", update);
  window.addEventListener("storage", syncStorage);
  media.addEventListener("change", syncSystem);
  return () => {
    window.removeEventListener("voxa-theme-change", update);
    window.removeEventListener("storage", syncStorage);
    media.removeEventListener("change", syncSystem);
  };
}
function snapshot() {
  return document.documentElement.dataset.theme === "dark";
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  const label = `Switch to ${dark ? "light" : "dark"} mode`;
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(key, next);
        } catch {}
        window.dispatchEvent(new Event("voxa-theme-change"));
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
