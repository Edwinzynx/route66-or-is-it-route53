import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { AwsLogo, Icon } from "./icon";
import { sections } from "./console-navigation";

export function ConsoleHeader({
  username,
  signingOut,
  signOut,
}: {
  username: string;
  signingOut: boolean;
  signOut: () => void;
}) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const matches = sections.filter((section) =>
    section.label.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <header className="console-header">
      <Link
        href="/hosted-zones"
        className="aws-logo"
        aria-label="AWS console home"
      >
        <AwsLogo />
      </Link>
      <span className="header-divider" />
      <details className="header-menu services-menu">
        <summary>
          <Icon name="grid" />
          <span>Services</span>
        </summary>
        <nav className="header-popover" aria-label="Services">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              onClick={(event) =>
                event.currentTarget.closest("details")?.removeAttribute("open")
              }
            >
              {section.label}
            </Link>
          ))}
        </nav>
      </details>
      <div
        className="console-search"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setSearchOpen(false);
        }}
      >
        <Icon name="search" />
        <input
          aria-label="Search Route 53 navigation"
          placeholder="Search"
          value={query}
          onFocus={() => setSearchOpen(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSearchOpen(false);
          }}
        />
        {searchOpen && (
          <nav
            className="header-popover search-results"
            aria-label="Search results"
          >
            <small>Route 53</small>
            {matches.length ? (
              matches.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  {section.label}
                </Link>
              ))
            ) : (
              <p>No matching pages</p>
            )}
          </nav>
        )}
      </div>
      <div className="header-right">
        <KeyboardShortcuts />
        <span className="header-divider" />
        <ThemeToggle />
        <span className="header-divider" />
        <span className="header-region">Global</span>
        <span className="header-divider" />
        <details className="header-menu account-menu">
          <summary>
            <span className="account-name">{username}</span>
            <Icon name="down" />
          </summary>
          <div className="header-popover">
            <strong>Account alias</strong>
            <p>{username}</p>
            <button onClick={signOut} disabled={signingOut}>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
