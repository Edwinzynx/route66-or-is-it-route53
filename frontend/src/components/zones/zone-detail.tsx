"use client";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Zone } from "@/lib/types";
import { useResource } from "@/lib/use-resource";
import { Loading, LoadError } from "../resource-state";
import { ZoneDialog } from "./zone-dialogs";
import { RecordList } from "../records/record-list";
import { Icon } from "../icon";

export function ZoneDetail({ zoneId }: { zoneId: string }) {
  const {
    data: zone,
    loading,
    error,
    refresh,
  } = useResource<Zone>(`/zones/${zoneId}`);
  const [dialog, setDialog] = useState<"edit" | "delete">();
  const router = useRouter();
  return (
    <>
      <Breadcrumbs>
        <Link href="/hosted-zones">Route 53</Link>
        <span>›</span>
        <Link href="/hosted-zones">Hosted zones</Link>
        <span>›</span>
        {zone?.name || zoneId}
      </Breadcrumbs>
      {loading ? (
        <Loading label="Loading hosted zone…" />
      ) : error ? (
        <LoadError error={error} retry={refresh} />
      ) : (
        zone && (
          <>
            <div className="page-title-row">
              <h1>{zone.name}</h1>
              <div className="actions">
                <button className="button" onClick={() => setDialog("edit")}>
                  Edit hosted zone
                </button>
                <button className="button" onClick={() => setDialog("delete")}>
                  Delete zone
                </button>
              </div>
            </div>
            <details className="panel zone-summary" open>
              <summary className="panel-heading">
                <Icon name="right" />
                <h2>Hosted zone details</h2>
              </summary>
              <dl className="details-grid">
                <div>
                  <dt>Hosted zone name</dt>
                  <dd>{zone.name}</dd>
                </div>
                <div>
                  <dt>Hosted zone ID</dt>
                  <dd className="mono">{zone.id}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{zone.type} hosted zone</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{zone.description || "—"}</dd>
                </div>
                <div>
                  <dt>Record count</dt>
                  <dd>{zone.record_count}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{new Date(zone.created_at).toLocaleString()}</dd>
                </div>
              </dl>
            </details>
            <div className="tabs">
              <span className="tab">Records ({zone.record_count})</span>
            </div>
            <RecordList zone={zone} onChange={refresh} />
            {dialog && (
              <ZoneDialog
                zone={zone}
                mode={dialog}
                onClose={() => setDialog(undefined)}
                onDone={() => {
                  if (dialog === "delete") router.push("/hosted-zones");
                  else refresh();
                  setDialog(undefined);
                }}
              />
            )}
          </>
        )
      )}
    </>
  );
}
