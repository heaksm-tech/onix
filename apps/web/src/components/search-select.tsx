'use client';

import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';

import { controlClass } from '@/components/field';
import { IconCheck, IconChevronDown, IconSearch } from '@/components/icons';
import { cn } from '@/lib/cn';

/**
 * A select with a search box: the trigger shows the chosen option, the panel
 * below it holds a filter and the list.
 *
 * It exists for lists a native `<select>` stops serving once they grow — the
 * companies list first among them. Everything shorter stays native, because the
 * native control is still the better one: this is the exception, not a
 * replacement for `controlClass` on a `<select>`.
 *
 * The trigger wears `controlClass`, so it lines up with every other control in
 * a form, and the whole thing still lives inside a `Field`.
 *
 * Keyboard: the panel opens on click, Enter, Space or ArrowDown, focus moves
 * into the search box, ArrowUp/ArrowDown walk the list (wrapping), Enter takes
 * the active option and Escape or Tab closes and returns focus to the trigger.
 * The options are not focusable themselves — the search box keeps focus and
 * points at the active one with `aria-activedescendant`, which is what lets one
 * control both type and choose.
 */

export type SearchSelectOption = { value: string; label: string };

/** Filtering starts here: a single character narrows nothing worth narrowing. */
const MIN_QUERY = 2;

/** The tonos and every other mark NFD separates from its letter. */
const COMBINING_MARKS = /\p{M}/gu;

/**
 * The key both the typed text and a label are compared through: lower case,
 * accent-blind, and final sigma folded onto σ, so «Οδός» is found by "οδος".
 *
 * It maps one character to one character — an index into the key is therefore
 * also an index into the original label, which is what lets the match be
 * highlighted where it actually sits.
 */
function searchKey(text: string): string {
  let key = '';
  for (const char of text.toLowerCase().replace(/ς/g, 'σ')) {
    const stripped = char.normalize('NFD').replace(COMBINING_MARKS, '');
    key += stripped.length === char.length ? stripped : char;
  }
  return key;
}

/** An option that survived the filter, with where the typed text matched it. */
type Match = { option: SearchSelectOption; start: number };

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Επιλέξτε',
  searchPlaceholder = 'Αναζήτηση…',
  searchLabel = 'Αναζήτηση',
  emptyLabel = 'Δεν βρέθηκε αποτέλεσμα.',
  disabled = false,
}: {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Trigger text while nothing is chosen. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Accessible name of the search box — the `Field` label names the trigger. */
  searchLabel?: string;
  /** What the panel says when the filter matches nothing. */
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const listId = useId();
  const optionId = useId();

  const selected = options.find((option) => option.value === value);
  const typed = query.trim();
  const filtering = typed.length >= MIN_QUERY;

  // Below the threshold the whole list is offered, so opening the control and
  // scrolling still works exactly like the select it replaces.
  const matches = useMemo<Match[]>(() => {
    if (!filtering) return options.map((option) => ({ option, start: -1 }));

    const key = searchKey(typed);
    return options
      .map((option) => ({ option, start: searchKey(option.label).indexOf(key) }))
      .filter((match) => match.start >= 0)
      .sort((a, b) => a.start - b.start); // Names that begin with it come first.
  }, [options, typed, filtering]);

  // Closing forgets the query, so the panel always reopens on the full list.
  function close({ focusTrigger = true } = {}) {
    setOpen(false);
    setQuery('');
    if (focusTrigger) trigger.current?.focus();
  }

  function choose(option: SearchSelectOption) {
    onChange(option.value);
    close();
  }

  // Opening starts on the current value, so ArrowDown moves from where the
  // reader already is rather than from the top of the list.
  function openPanel() {
    if (disabled) return;
    const index = matches.findIndex((match) => match.option.value === value);
    setActive(index < 0 ? 0 : index);
    setOpen(true);
  }

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children.item(active)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      // A click outside dismisses without taking focus with it — the reader is
      // on their way somewhere else.
      if (!root.current?.contains(event.target as Node)) close({ focusTrigger: false });
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function move(step: number) {
    if (matches.length === 0) return;
    setActive((current) => (current + step + matches.length) % matches.length);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter') {
      // Always prevented: this control lives in a form, and Enter here means
      // "take this option", never "submit".
      event.preventDefault();
      const match = matches[active];
      if (match) choose(match.option);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close();
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openPanel();
          }
        }}
        className={cn(
          controlClass,
          'flex items-center justify-between gap-2 text-left',
          open && 'border-accent',
        )}
      >
        <span className={cn('truncate', selected ? 'text-ink' : 'text-ink-faint')}>
          {selected ? selected.label : placeholder}
        </span>
        <IconChevronDown
          className={cn(
            'size-4 shrink-0 text-ink-faint transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          // The `Field` around this control is a `<label>`, and a click on any
          // non-interactive part of a label is forwarded to the control it
          // names — here, the trigger, which would toggle the panel shut. The
          // panel's own controls have no default action to lose.
          onClick={(event) => event.preventDefault()}
          className="popover-panel absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-lg border border-line bg-surface shadow-pop"
        >
          <div className="relative border-b border-line p-1.5">
            <IconSearch className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              ref={search}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={matches[active] ? `${optionId}-${active}` : undefined}
              aria-label={searchLabel}
              autoComplete="off"
              value={query}
              placeholder={searchPlaceholder}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              className="h-9 w-full rounded-md bg-canvas pr-2.5 pl-8 text-sm text-ink outline-none transition-shadow placeholder:text-ink-faint focus-visible:ring-2 focus-visible:ring-accent/60"
            />
          </div>

          <div
            ref={list}
            id={listId}
            role="listbox"
            aria-label={searchLabel}
            className="max-h-64 overflow-y-auto overscroll-contain p-1.5"
          >
            {matches.map((match, index) => {
              const chosen = match.option.value === value;
              return (
                <button
                  key={match.option.value}
                  id={`${optionId}-${index}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={chosen}
                  onClick={() => choose(match.option)}
                  onMouseMove={() => setActive(index)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors duration-150',
                    index === active ? 'bg-ink/5 text-ink' : 'text-ink-secondary',
                  )}
                >
                  <span className={cn('min-w-0 flex-1 truncate', chosen && 'font-medium text-ink')}>
                    <Highlight
                      label={match.option.label}
                      start={match.start}
                      length={typed.length}
                    />
                  </span>
                  {chosen ? <IconCheck className="size-4 shrink-0 text-accent" /> : null}
                </button>
              );
            })}
            {matches.length === 0 ? (
              <p role="status" className="px-2.5 py-6 text-center text-sm text-ink-secondary">
                {emptyLabel}
              </p>
            ) : null}
          </div>

          {typed.length === 1 ? (
            <p className="border-t border-line px-3 py-2 text-xs text-ink-faint">
              Πληκτρολογήστε τουλάχιστον {MIN_QUERY} χαρακτήρες για αναζήτηση.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The matched run of a label, tinted where it sits. */
function Highlight({ label, start, length }: { label: string; start: number; length: number }) {
  if (start < 0) return <>{label}</>;

  return (
    <>
      {label.slice(0, start)}
      <mark className="bg-accent-soft text-accent">{label.slice(start, start + length)}</mark>
      {label.slice(start + length)}
    </>
  );
}
