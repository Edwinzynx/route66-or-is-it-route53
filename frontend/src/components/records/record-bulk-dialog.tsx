"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { DnsRecord } from "@/lib/types";
import { Modal } from "../modal";
import { useNotify } from "../notifications";

export function RecordBulkDialog({
  records,
  operation,
  onClose,
  onDone,
}: {
  records: DnsRecord[];
  operation: "delete" | "ttl";
  onClose: () => void;
  onDone: () => void;
}) {
  const [ttl, setTtl] = useState("300");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotify();
  const deleting = operation === "delete";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ affected: number }>(
        `/zones/${records[0].zone_id}/records/bulk`,
        {
          method: "POST",
          body: JSON.stringify({
            operation,
            ids: records.map((record) => record.id),
            ...(!deleting ? { ttl: Number(ttl) } : {}),
          }),
        },
      );
      notify(
        `${result.affected} record sets ${deleting ? "deleted" : "updated"} successfully.`,
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
      title={
        deleting ? "Delete selected records" : "Edit TTL for selected records"
      }
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button className="button link" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            form="bulk-record-form"
            className={`button ${deleting ? "danger" : "primary"}`}
            disabled={busy}
          >
            {busy
              ? "Saving…"
              : deleting
                ? `Delete ${records.length} record sets`
                : "Save TTL"}
          </button>
        </>
      }
    >
      <form id="bulk-record-form" onSubmit={submit}>
        <p>
          {deleting
            ? "These records will be permanently deleted."
            : "Apply the same TTL to all selected records."}{" "}
          All changes succeed together, or nothing is changed.
        </p>
        <ul>
          {records.map((record) => (
            <li key={record.id}>
              {record.name} ({record.type})
            </li>
          ))}
        </ul>
        {!deleting && (
          <div className="field">
            <label htmlFor="bulk-ttl">TTL (seconds)</label>
            <input
              id="bulk-ttl"
              type="number"
              min={0}
              max={2147483647}
              step={1}
              required
              value={ttl}
              onChange={(event) => setTtl(event.target.value)}
            />
          </div>
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
