"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "./modal";

function subscribe(callback: () => void) {
  window.addEventListener("shortcut-preference", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("shortcut-preference", callback);
    window.removeEventListener("storage", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem("route53-shortcuts") !== "false";
  } catch {
    return true;
  }
}

export function KeyboardShortcuts() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const enabled = useSyncExternalStore(subscribe, snapshot, () => true);
  const [fallbackDisabled, setFallbackDisabled] = useState(false);
  const active = enabled && !fallbackDisabled;
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      const target = event.target;
      if (
        !active ||
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing
      )
        return;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="textbox"]',
        )
      )
        return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "?") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      // Navigation shortcuts are deliberately limited to list/detail screens.
      if (
        !/^\/hosted-zones(?:\/[^/]+)?$/.test(pathname) ||
        pathname.endsWith("/create")
      )
        return;
      if (event.key === "/") {
        const search = document.querySelector<HTMLInputElement>(
          "[data-shortcut-search]",
        );
        if (search) {
          event.preventDefault();
          search.focus();
        }
      } else if (event.key.toLowerCase() === "n") {
        const create = document.querySelector<HTMLAnchorElement>(
          "[data-shortcut-create]",
        );
        if (create) {
          event.preventDefault();
          create.click();
        }
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [active, pathname]);

  function setEnabled(value: boolean) {
    setFallbackDisabled(!value);
    try {
      localStorage.setItem("route53-shortcuts", String(value));
    } catch {
      /* Preference remains usable for this session. */
    }
    window.dispatchEvent(new Event("shortcut-preference"));
  }
  return (
    <>
      <button
        type="button"
        className="shortcut-help"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        aria-keyshortcuts="Shift+/"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open && (
        <Modal
          title="Keyboard shortcuts"
          onClose={() => setOpen(false)}
          footer={
            <button className="button primary" onClick={() => setOpen(false)}>
              Close
            </button>
          }
        >
          <dl className="shortcut-list">
            <div>
              <dt>
                <kbd>/</kbd>
              </dt>
              <dd>Focus the hosted-zone or record search.</dd>
            </div>
            <div>
              <dt>
                <kbd>N</kbd>
              </dt>
              <dd>
                Create a hosted zone from its list, or a record from zone
                details.
              </dd>
            </div>
            <div>
              <dt>
                <kbd>?</kbd>
              </dt>
              <dd>Open this shortcut guide.</dd>
            </div>
            <div>
              <dt>
                <kbd>Esc</kbd>
              </dt>
              <dd>Close a dialog when no save is in progress.</dd>
            </div>
          </dl>
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Enable single-key shortcuts
          </label>
          <small>
            Shortcuts are ignored while typing and inside dialogs. They never
            submit a form or delete data.
          </small>
        </Modal>
      )}
    </>
  );
}
