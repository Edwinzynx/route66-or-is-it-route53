"use client";
import Link from "next/link";
import { useResource } from "@/lib/use-resource";
import type { DnsRecord, Zone } from "@/lib/types";
import { RecordForm } from "./record-form";
import { Loading, LoadError } from "../resource-state";

function EditRecord({ zone, recordId }: { zone: Zone; recordId: string }) {
  const { data, error, loading, refresh } = useResource<DnsRecord>(
    `/zones/${zone.id}/records/${recordId}`,
  );
  if (loading) return <Loading label="Loading record…" />;
  if (error) return <LoadError error={error} retry={refresh} />;
  if (data?.system)
    return (
      <div className="alert info">
        Default NS and SOA records are read-only in this clone.{" "}
        <Link href={`/hosted-zones/${zone.id}`}>Back to records</Link>
      </div>
    );
  return data && <RecordForm zone={zone} record={data} />;
}

export function RecordEditor({
  zoneId,
  recordId,
}: {
  zoneId: string;
  recordId?: string;
}) {
  const {
    data: zone,
    error,
    loading,
    refresh,
  } = useResource<Zone>(`/zones/${zoneId}`);
  const title = recordId ? "Edit record" : "Create record";
  return (
    <div className="form-container">
      <div className="breadcrumbs">
        <Link href="/hosted-zones">Route 53</Link>
        <span>›</span>
        <Link href="/hosted-zones">Hosted zones</Link>
        <span>›</span>
        <Link href={`/hosted-zones/${zoneId}`}>{zone?.name || zoneId}</Link>
        <span>›</span>
        {title}
      </div>
      <h1>{title}</h1>
      <p className="description">
        Specify how to route traffic for a domain or subdomain.
      </p>
      {loading ? (
        <Loading label="Loading hosted zone…" />
      ) : error ? (
        <LoadError error={error} retry={refresh} />
      ) : (
        zone &&
        (recordId ? (
          <EditRecord zone={zone} recordId={recordId} />
        ) : (
          <RecordForm zone={zone} />
        ))
      )}
    </div>
  );
}
