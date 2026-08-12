'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { IconClose, IconMenu } from '@/components/icons';
import { LogoMark } from '@/components/logo';
import { NavList } from '@/components/shell/nav-list';
import { UserCard } from '@/components/shell/user-card';
import type { AuthUser } from '@/lib/session';

/** A store that never changes — it only reports which renderer is running. */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * The navigation for viewports below `md`, where the sidebar is hidden: a
 * topbar button that slides the same nav in as a drawer.
 *
 * The full-screen layer only exists while the drawer is open. Do not keep an
 * inert or pointer-transparent copy mounted: iOS WebKit has allowed that fixed
 * layer to win hit testing and swallow every tap on the page underneath.
 *
 * It is portalled to `<body>` rather than left in the topbar: the header's
 * `backdrop-blur` makes it a containing block for fixed descendants, which
 * would clip the overlay to the 56px header strip.
 */
export function MobileNav({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // `document.body` — the portal target — only exists in the browser, and the
  // server renderer refuses portals outright, so the drawer joins after
  // hydration. It needs JS to open anyway.
  const mounted = useSyncExternalStore(neverChanges, onClient, onServer);

  // Arriving on a new page dismisses the drawer; focus stays with the page,
  // not with the trigger, because the content behind it has changed.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);

    // The page underneath must not scroll while the overlay is up.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Άνοιγμα μενού"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-secondary transition-colors duration-150 outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 md:hidden"
      >
        <IconMenu className="size-[18px]" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden">
            <div aria-hidden onClick={close} className="absolute inset-0 bg-ink/40" />

            <div
              role="dialog"
              aria-modal="true"
              aria-label="Πλοήγηση"
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-canvas"
            >
              <div className="mt-4 flex items-center gap-2.5 px-5">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-canvas shadow-card">
                    <LogoMark className="size-[18px]" />
                  </span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-[15px] font-semibold tracking-tight">
                      Onix CRM
                    </span>
                    <span className="truncate text-[11px] text-ink-faint">
                      ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.
                    </span>
                  </span>
                </Link>
                <button
                  ref={closeRef}
                  type="button"
                  aria-label="Κλείσιμο μενού"
                  onClick={close}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors duration-150 outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <IconClose className="size-[18px]" />
                </button>
              </div>

              <nav className="mt-4 flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
                <NavList pathname={pathname} role={user.role} onNavigate={() => setOpen(false)} />
              </nav>

              <div className="flex flex-col px-3 pb-4">
                <div className="mx-2.5 mb-2 border-t border-line" />
                <UserCard user={user} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
