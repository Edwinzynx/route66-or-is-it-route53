"use client";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { ThemeToggle } from "./theme-toggle";
import { AwsLogo } from "./icon";

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("demo");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <ThemeToggle />
      <div className="login-brand">
        <AwsLogo />
      </div>
      <main className="login-card">
        <div className="eyebrow">AWS MANAGEMENT CONSOLE · LOCAL DEMO</div>
        <h1>Sign in</h1>
        <p>Manage your DNS with Amazon Route 53.</p>
        <form onSubmit={submit}>
          <label htmlFor="username">Account alias</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={80}
            pattern="[a-zA-Z0-9@._+\-]+"
            autoComplete="username"
            autoFocus
          />
          <small>
            Use any alias, such as demo. Return with the same alias to access
            your saved zones.
          </small>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary login-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to the console"}
          </button>
        </form>
        <div className="login-note">
          This assignment uses mocked authentication. No AWS credentials are
          needed, and no real DNS changes are made.
        </div>
      </main>
      <div className="login-footer">
        Route 53 Clone · Scaler Fullstack Assignment
      </div>
    </div>
  );
}
