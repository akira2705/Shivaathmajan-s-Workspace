"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "task-control:groq-api-key";
const OLD_KEY = "task-control:gemini-api-key";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");

  useEffect(() => {
    const old = window.localStorage.getItem(OLD_KEY);
    if (old) {
      window.localStorage.setItem(STORAGE_KEY, old);
      window.localStorage.removeItem(OLD_KEY);
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setApiKeyState(stored);
  }, []);

  function setApiKey(key: string) {
    setApiKeyState(key);
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  return { apiKey, setApiKey };
}
