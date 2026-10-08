"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Zone } from "@/lib/types";
import { useNotify } from "../notifications";

export function ZoneCreate() {
  const router = useRouter();
  const notify = useNotify();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Public");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const zone = await api<Zone>("/zones", {
        method: "POST",
        body: JSON.stringify({ name, description, type }),
      });
      notify(`Hosted zone ${zone.name} created successfully.`);
      router.push(`/hosted-zones/${zone.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="form-container">
      <div className="breadcrumbs">
        <Link href="/hosted-zones">Route 53</Link>
        <span>›</span>
        <Link href="/hosted-zones">Hosted zones</Link>
        <span>›</span>Create hosted zone
      </div>
      <h1>Create hosted zone</h1>
      <p className="description">
        Create a hosted zone to define how to route traffic for your domain.
      </p>
      <form onSubmit={submit}>
        <section className="panel">
          <div className="form-section-title">
            <h2>Hosted zone configuration</h2>
          </div>
          <div className="form-body">
            <div className="field">
              <label htmlFor="domain-name">Domain name</label>
              <input
                id="domain-name"
                placeholder="example.com"
                required
                maxLength={254}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
              <small>
                Enter the domain or subdomain name. For example, example.com or
                app.example.com.
              </small>
            </div>
            <div className="field">
              <label htmlFor="description">
                Description <span className="muted">– optional</span>
              </label>
              <textarea
                id="description"
                placeholder="A description for this hosted zone"
                maxLength={256}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <small>Maximum 256 characters.</small>
            </div>
            <fieldset
              className="field"
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              <legend className="field-label">Type</legend>
              <div className="radio-cards">
                {["Public", "Private"].map((kind) => (
                  <label
                    key={kind}
                    className={`radio-card ${type === kind ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="zone-type"
                      value={kind}
                      checked={type === kind}
                      onChange={() => setType(kind)}
                    />
                    <strong>{kind} hosted zone</strong>
                    <small>
                      {kind === "Public"
                        ? "Define how traffic is routed on the internet."
                        : "Define how traffic is routed within a VPC."}
                    </small>
                  </label>
                ))}
              </div>
              {type === "Private" && (
                <div className="alert info">
                  VPC associations are mocked in this assignment. Private zone
                  records are saved locally.
                </div>
              )}
            </fieldset>
          </div>
        </section>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="form-footer">
          <button
            type="button"
            className="button link"
            disabled={busy}
            onClick={() => router.push("/hosted-zones")}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Creating…" : "Create hosted zone"}
          </button>
        </div>
      </form>
    </div>
  );
}
