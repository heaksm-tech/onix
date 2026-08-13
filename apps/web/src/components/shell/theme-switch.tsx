'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

import { IconMoon, IconSun } from '@/components/icons';

type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'onix-color-scheme';
const CHANGE_EVENT = 'onix-color-scheme-change';

function isColorScheme(value: string | null | undefined): value is ColorScheme {
  return value === 'light' || value === 'dark';
}

function storedScheme(): ColorScheme | undefined {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isColorScheme(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function currentScheme(): ColorScheme {
  const explicit = document.documentElement.dataset.scheme;
  if (isColorScheme(explicit)) return explicit;
  const saved = storedScheme();
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Desktop-only control for the explicit, persisted color-scheme preference. */
export function ThemeSwitch() {
  const [scheme, setScheme] = useState<ColorScheme>('light');

  useLayoutEffect(() => {
    const root = document.documentElement;
    const saved = storedScheme();

    if (saved) root.dataset.scheme = saved;
    else delete root.dataset.scheme;
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');

    function sync() {
      setScheme(currentScheme());
    }

    function syncWithStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;

      if (isColorScheme(event.newValue)) document.documentElement.dataset.scheme = event.newValue;
      else delete document.documentElement.dataset.scheme;
      sync();
    }

    preference.addEventListener('change', sync);
    window.addEventListener('storage', syncWithStorage);
    window.addEventListener(CHANGE_EVENT, sync);

    // Hydration starts from the server's neutral snapshot. Re-read the browser
    // preference once subscriptions are active so the control's state agrees.
    // Re-applying the attribute also covers Next's development-only root reset.
    const saved = storedScheme();
    if (saved) document.documentElement.dataset.scheme = saved;
    else delete document.documentElement.dataset.scheme;
    window.dispatchEvent(new Event(CHANGE_EVENT));

    return () => {
      preference.removeEventListener('change', sync);
      window.removeEventListener('storage', syncWithStorage);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  function toggleScheme() {
    const next: ColorScheme = currentScheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.scheme = next;

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The active page can still switch when storage is unavailable.
    }

    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  const dark = scheme === 'dark';

  return (
    <button
      type="button"
      aria-label="Σκούρο θέμα"
      aria-pressed={dark}
      title={dark ? 'Ενεργοποίηση φωτεινού θέματος' : 'Ενεργοποίηση σκούρου θέματος'}
      onClick={toggleScheme}
      className="hidden size-8 place-items-center rounded-lg text-ink-secondary outline-none transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 md:grid"
    >
      {dark ? <IconSun className="size-[18px]" /> : <IconMoon className="size-[18px]" />}
    </button>
  );
}
