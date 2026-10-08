"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { DnsRecord } from "@/lib/types";
import { Modal } from "../modal";
import { useNotify } from "../notifications";

export function RecordDelete({
  record,
  onClose,
  onDone,
}: {
  record: DnsRecord;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotify();
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/zones/${record.zone_id}/records/${record.id}`, {
        method: "DELETE",
      });
      notify(`Record ${record.name} (${record.type}) deleted successfully.`);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Delete record"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button className="button link" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="button danger" onClick={remove} disabled={busy}>
            {busy ? "Deleting…" : "Delete record"}
          </button>
        </>
      }
    >
      <p>
        Delete <strong>{record.name}</strong> ({record.type})? This action
        cannot be undone.
      </p>
      <div className="record-values">{record.values.join("\n")}</div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
