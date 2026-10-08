"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  recordTypes,
  type DnsRecord,
  type RecordType,
  type Zone,
} from "@/lib/types";
import { useNotify } from "../notifications";
import { Icon } from "../icon";

const hints: Record<
  RecordType,
  { label: string; example: string; help: string }
> = {
  A: {
    label: "Routes traffic to an IPv4 address",
    example: "192.0.2.1",
    help: "Enter one IPv4 address per line.",
  },
  AAAA: {
    label: "Routes traffic to an IPv6 address",
    example: "2001:db8::1",
    help: "Enter one IPv6 address per line.",
  },
  CNAME: {
    label: "Routes traffic to another domain name",
    example: "target.example.com",
    help: "Enter one destination domain. CNAME cannot be used at the zone apex.",
  },
  TXT: {
    label: "Specifies text information",
    example: '"v=spf1 -all"',
    help: "Enter one text value per line. Each quoted string can contain up to 255 bytes.",
  },
  MX: {
    label: "Specifies mail servers",
    example: "10 mail.example.com",
    help: "Enter priority and mail server, separated by a space.",
  },
  NS: {
    label: "Specifies name servers",
    example: "ns1.example.com",
    help: "Enter one name server per line.",
  },
  PTR: {
    label: "Maps an IP address to a domain name",
    example: "host.example.com",
    help: "Enter one destination domain per line.",
  },
  SRV: {
    label: "Specifies the location of a service",
    example: "10 5 443 service.example.com",
    help: "Enter priority, weight, port, and target, separated by spaces.",
  },
  CAA: {
    label: "Specifies certificate authorities",
    example: '0 issue "letsencrypt.org"',
    help: "Enter flags, a tag (issue, issuewild, or iodef), and a quoted value.",
  },
};

export function RecordForm({
  zone,
  record,
}: {
  zone: Zone;
  record?: DnsRecord;
}) {
  const router = useRouter();
  const notify = useNotify();
  const relativeName = record
    ? record.name === zone.name
      ? ""
      : record.name.slice(0, -(zone.name.length + 1))
    : "";
  const [name, setName] = useState(relativeName);
  const [type, setType] = useState<RecordType>(
    record && record.type !== "SOA" ? record.type : "A",
  );
  const [ttl, setTtl] = useState(String(record?.ttl ?? 300));
  const [values, setValues] = useState(record?.values.join("\n") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/zones/${zone.id}/records${record ? `/${record.id}` : ""}`, {
        method: record ? "PUT" : "POST",
        body: JSON.stringify({
          name,
          type,
          ttl: Number(ttl),
          values: values.split("\n").filter((value) => value.trim()),
        }),
      });
      notify(
        `Record ${name ? `${name}.${zone.name}` : zone.name} ${record ? "updated" : "created"} successfully.`,
      );
      router.push(`/hosted-zones/${zone.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <section className="panel">
        <div className="form-section-title">
          <h2>{record ? "Record configuration" : "Quick create record"}</h2>
        </div>
        <div className="form-body">
          {!record && (
            <div className="record-number">
              <Icon name="down" />
              Record 1
            </div>
          )}
          <div className="field-grid">
            <div className="field">
              <label htmlFor="record-name">Record name</label>
              <div className="name-input">
                <input
                  id="record-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="subdomain"
                  maxLength={253}
                  autoFocus
                />
                <span className="name-suffix">.{zone.name}</span>
              </div>
              <small>Leave blank to create a record for {zone.name}.</small>
            </div>
            <div className="field">
              <label htmlFor="record-type">Record type</label>
              <select
                id="record-type"
                value={type}
                onChange={(event) => setType(event.target.value as RecordType)}
              >
                {recordTypes.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind} – {hints[kind].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="record-values">Value</label>
            <textarea
              id="record-values"
              className="mono"
              rows={5}
              required
              placeholder={hints[type].example}
              value={values}
              onChange={(event) => setValues(event.target.value)}
            />
            <small>{hints[type].help}</small>
          </div>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="record-ttl">TTL (seconds)</label>
              <div className="ttl-control">
                <input
                  id="record-ttl"
                  type="number"
                  required
                  min={0}
                  max={2147483647}
                  step={1}
                  value={ttl}
                  onChange={(event) => setTtl(event.target.value)}
                />
                {[60, 300, 3600, 86400].map((value) => (
                  <button
                    type="button"
                    className="button"
                    key={value}
                    onClick={() => setTtl(String(value))}
                  >
                    {value === 60
                      ? "1m"
                      : value === 300
                        ? "5m"
                        : value === 3600
                          ? "1h"
                          : "1d"}
                  </button>
                ))}
              </div>
              <small>How long DNS resolvers should cache this record.</small>
            </div>
            <div className="field">
              <label htmlFor="routing-policy">Routing policy</label>
              <select id="routing-policy" value="Simple" disabled>
                <option>Simple</option>
              </select>
              <small>Simple routing is supported in this assignment.</small>
            </div>
          </div>
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
          onClick={() => router.push(`/hosted-zones/${zone.id}`)}
        >
          Cancel
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : record ? "Save changes" : "Create record"}
        </button>
      </div>
    </form>
  );
}
