"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { DnsRecord, Zone } from "@/lib/types";
import { Modal } from "../modal";
import { useNotify } from "../notifications";

type Preview = {
  records: Pick<DnsRecord, "name" | "type" | "ttl" | "values">[];
  skipped: string[];
  imported: number;
};

export function RecordImport({
  zone,
  onClose,
  onDone,
}: {
  zone: Zone;
  onClose: () => void;
  onDone: () => void;
}) {
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotify();

  async function readFile(file?: File) {
    setPreview(undefined);
    setError("");
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("Choose a UTF-8 zone file no larger than 1 MB.");
      return;
    }
    setBusy(true);
    try {
      setContent(await file.text());
    } catch {
      setError("The file could not be read. Try pasting its contents instead.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api<Preview>(`/zones/${zone.id}/import`, {
        method: "POST",
        body: JSON.stringify({ content, preview: !preview }),
      });
      if (!preview) setPreview(result);
      else {
        notify(`Imported ${result.imported} record sets into ${zone.name}.`);
        onDone();
      }
    } catch (err) {
      setError((err as Error).message);
      setPreview(undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Import records from BIND"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button className="button link" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={
              busy || !content.trim() || (preview && !preview.records.length)
            }
            onClick={submit}
          >
            {busy
              ? "Processing…"
              : preview
                ? `Import ${preview.records.length} record sets`
                : "Preview import"}
          </button>
        </>
      }
    >
      <p>
        Import into <strong>{zone.name}</strong>. Existing records are never
        overwritten. If any record conflicts or is invalid, nothing is saved.
      </p>
      <div className="field">
        <label htmlFor="zone-file">BIND zone file</label>
        <input
          id="zone-file"
          type="file"
          accept=".zone,.txt,text/plain"
          disabled={busy}
          onChange={(event) => void readFile(event.target.files?.[0])}
        />
        <small>
          UTF-8, up to 1 MB and 1,000 record sets. Supports $ORIGIN, $TTL,
          comments, and multiline records. $INCLUDE and $GENERATE are not
          supported.
        </small>
      </div>
      <div className="field">
        <label htmlFor="zone-content">Or paste zone file contents</label>
        <textarea
          id="zone-content"
          className="mono"
          rows={8}
          value={content}
          disabled={busy}
          onChange={(event) => {
            setContent(event.target.value);
            setPreview(undefined);
            setError("");
          }}
          placeholder={"$TTL 300\nwww IN A 192.0.2.10"}
        />
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {preview && (
        <section aria-label="Import preview">
          <h3>{preview.records.length} record sets ready to import</h3>
          {preview.skipped.map((message) => (
            <p className="alert info" key={message}>
              {message}
            </p>
          ))}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>TTL</th>
                  <th>Values</th>
                </tr>
              </thead>
              <tbody>
                {preview.records.map((record) => (
                  <tr key={`${record.name}:${record.type}`}>
                    <td>{record.name}</td>
                    <td>{record.type}</td>
                    <td>{record.ttl}</td>
                    <td className="record-values">
                      {record.values.join("\n")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Modal>
  );
}
