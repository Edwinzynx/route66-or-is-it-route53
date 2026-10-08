"use client";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Login } from "./login";
import { Notifications } from "./notifications";
import { ConsoleHeader } from "./console-header";
import { ConsoleNavigation } from "./console-navigation";
import { Icon } from "./icon";

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refresh, logout } = useAuth();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <ConsoleHeader
        username={user.username}
        signingOut={signingOut}
        signOut={signOut}
      />
      <div className="service-bar">
        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-controls="service-navigation"
          onClick={() => {
            if (window.matchMedia("(max-width: 760px)").matches)
              setMobileOpen(!mobileOpen);
            else setOpen(!open);
          }}
        >
          <Icon name="menu" />
        </button>
      </div>
      <ConsoleNavigation
        open={open}
        mobileOpen={mobileOpen}
        onClose={() => {
          setOpen(false);
          setMobileOpen(false);
        }}
        onNavigate={() => setMobileOpen(false)}
      />
      <main
        id="main-content"
        className={`main-content ${open ? "" : "nav-closed"}`}
      >
        {logoutError && (
          <div className="alert error" role="alert">
            {logoutError}
          </div>
        )}
        <Notifications>{children}</Notifications>
      </main>
      <aside className="tools-rail" aria-label="Help">
        <a
          href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html"
          target="_blank"
          rel="noreferrer"
          aria-label="Route 53 documentation"
        >
          <Icon name="info" />
        </a>
      </aside>
      <footer className="console-footer">
        <span>Route 53 Clone</span>
        <span>Local simulation · No live DNS changes</span>
      </footer>
    </>
  );
}
