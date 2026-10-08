"use client";
import { useState } from "react";
import { apiResponse } from "@/lib/api";
import type { Zone } from "@/lib/types";
import { RecordImport } from "./record-import";
import { useNotify } from "../notifications";

export function RecordTransfer({
  zone,
  onChange,
}: {
  zone: Zone;
  onChange: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notify = useNotify();
  async function download(format: "json" | "bind") {
    setBusy(true);
    setError("");
    try {
      const response = await apiResponse(
        `/zones/${zone.id}/export?format=${format}`,
      );
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${zone.name}.${format === "json" ? "json" : "zone"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(
        `Exported ${zone.name} as ${format === "json" ? "JSON" : "BIND"}.`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="actions" aria-label="Import and export records">
        <button className="button" onClick={() => setImporting(true)}>
          Import records
        </button>
        <button
          className="button"
          disabled={busy}
          onClick={() => void download("json")}
        >
          Export JSON
        </button>
        <button
          className="button"
          disabled={busy}
          onClick={() => void download("bind")}
        >
          Export BIND
        </button>
        {busy && <span role="status">Preparing download…</span>}
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {importing && (
        <RecordImport
          zone={zone}
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            onChange();
          }}
        />
      )}
    </>
  );
}
