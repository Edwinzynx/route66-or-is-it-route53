"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Zone } from "@/lib/types";
import { Modal } from "../modal";
import { useNotify } from "../notifications";

export function ZoneDialog({
  zone,
  mode,
  onClose,
  onDone,
}: {
  zone: Zone;
  mode: "edit" | "delete";
  onClose: () => void;
  onDone: () => void;
}) {
  const [description, setDescription] = useState(zone.description);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotify();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/zones/${zone.id}`, {
        method: mode === "delete" ? "DELETE" : "PATCH",
        ...(mode === "edit" ? { body: JSON.stringify({ description }) } : {}),
      });
      notify(
        `Hosted zone ${zone.name} ${mode === "delete" ? "deleted" : "updated"} successfully.`,
      );
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={mode === "delete" ? "Delete hosted zone" : "Edit hosted zone"}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button className="button link" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            form="zone-dialog-form"
            className={`button ${mode === "delete" ? "danger" : "primary"}`}
            disabled={busy || (mode === "delete" && confirmation !== zone.name)}
          >
            {busy
              ? "Saving…"
              : mode === "delete"
                ? "Delete zone"
                : "Save changes"}
          </button>
        </>
      }
    >
      <form id="zone-dialog-form" onSubmit={submit}>
        {mode === "edit" ? (
          <>
            <p>
              <strong>{zone.name}</strong>
            </p>
            <label htmlFor="zone-description">Description</label>
            <textarea
              id="zone-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={256}
            />
            <small>
              Domain name and zone type cannot be changed after creation.
            </small>
          </>
        ) : (
          <>
            <p>
              Delete the hosted zone <strong>{zone.name}</strong>? This action
              cannot be undone.
            </p>
            <p className="muted">
              Remove custom records first. The default NS and SOA records will
              be deleted with the zone.
            </p>
            <label htmlFor="delete-confirmation">
              To confirm, enter {zone.name}
            </label>
            <input
              id="delete-confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
