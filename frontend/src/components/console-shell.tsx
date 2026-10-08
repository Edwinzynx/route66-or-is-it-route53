"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Login } from "./login";
import { Notifications } from "./notifications";
import { ThemeToggle } from "./theme-toggle";
import { KeyboardShortcuts } from "./keyboard-shortcuts";

const sections = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Hosted zones", href: "/hosted-zones" },
  { label: "Health checks", href: "/health-checks" },
  { label: "Traffic policies", href: "/traffic-policies" },
  { label: "Resolver", href: "/resolver" },
  { label: "Profiles", href: "/profiles" },
];

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refresh, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  if (loading)
    return (
      <div className="boot" role="status">
        <div className="spinner" />
        Loading your console…
      </div>
    );
  if (error)
    return (
      <div className="boot">
        <div className="alert error" role="alert">
          {error}
        </div>
        <button className="button" onClick={refresh}>
          Retry connection
        </button>
      </div>
    );
  if (!user) return <Login />;
  async function signOut() {
    setSigningOut(true);
    try {
      await logout();
    } catch (err) {
      setLogoutError((err as Error).message);
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="console-header">
        <Link
          href="/hosted-zones"
          className="aws-logo"
          aria-label="AWS console home"
        >
          aws<span>⌣</span>
        </Link>
        <span className="header-divider" />
        <span className="services-label">
          ▦ <span>Services</span>
        </span>
        <div className="header-product">Amazon Route 53</div>
        <div className="header-right">
          <span className="header-region">Global</span>
          <ThemeToggle />
          <KeyboardShortcuts />
          <span className="header-divider" />
          <span className="account-name">{user.username}</span>
          <button onClick={signOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      <div className="service-bar">
        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
        <span>Route 53</span>
        <span className="service-global">Global service</span>
      </div>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link href="/hosted-zones" className="sidebar-title">
          Route 53
        </Link>
        <nav aria-label="Route 53">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              onClick={() => setOpen(false)}
              className={
                pathname.startsWith(section.href)
                  ? "nav-item active"
                  : "nav-item"
              }
              aria-current={
                pathname.startsWith(section.href) ? "page" : undefined
              }
            >
              {section.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html"
            target="_blank"
            rel="noreferrer"
          >
            Route 53 documentation ↗
          </a>
          <p>Assignment environment</p>
        </div>
      </aside>
      <main id="main-content" className="main-content">
        {logoutError && (
          <div className="alert error" role="alert">
            {logoutError}
          </div>
        )}
        <Notifications>{children}</Notifications>
      </main>
      <footer className="console-footer">
        <span>Route 53 Clone</span>
        <span>Local simulation · No live DNS changes</span>
      </footer>
    </>
  );
}
