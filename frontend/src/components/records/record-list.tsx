"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordTypes, type DnsRecord, type Page, type Zone } from "@/lib/types";
import { useDebounced, useResource } from "@/lib/use-resource";
import { Pagination } from "../pagination";
import { Loading, LoadError } from "../resource-state";
import { RecordBulkDialog } from "./record-bulk-dialog";
import { RecordTable } from "./record-table";
import { useSelection } from "@/lib/use-selection";
import { Icon } from "../icon";
import { RecordTransfer } from "./record-transfer";

export function RecordList({
  zone,
  onChange,
}: {
  zone: Zone;
  onChange: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState("asc");
  const [action, setAction] = useState<{
    operation: "delete" | "ttl";
    records: DnsRecord[];
  }>();
  const debounced = useDebounced(search);
  const params = new URLSearchParams({
    search: debounced,
    page: String(page),
    page_size: String(pageSize),
    sort,
    order,
  });
  if (type) params.set("type", type);
  const { data, error, loading, refresh } = useResource<Page<DnsRecord>>(
    `/zones/${zone.id}/records?${params}`,
  );
  const selection = useSelection(
    data?.items.filter((record) => !record.system) ?? [],
    `${zone.id}:${search}:${params}`,
  );
  const selected = selection.selected;
  const base = `/hosted-zones/${zone.id}/records`;
  function changeSort(key: string) {
    setSort(key);
    setOrder(sort === key && order === "asc" ? "desc" : "asc");
    setPage(1);
  }
  return (
    <>
      <section className="panel" aria-label="DNS records">
        <div className="panel-heading">
          <div>
            <h2>Records {data && <span>({data.total})</span>}</h2>
          </div>
          <div className="actions">
            <button
              className="button icon"
              aria-label="Refresh records"
              onClick={() => {
                refresh();
              }}
              disabled={loading}
            >
              <Icon name="refresh" />
            </button>
            <button
              className="button"
              disabled={!selected.length}
              onClick={() =>
                setAction({ operation: "delete", records: selected })
              }
            >
              Delete selected
            </button>
            <button
              className="button"
              disabled={selected.length !== 1}
              onClick={() =>
                selected[0] && router.push(`${base}/${selected[0].id}/edit`)
              }
            >
              Edit record
            </button>
            <button
              className="button"
              disabled={!selected.length}
              onClick={() => setAction({ operation: "ttl", records: selected })}
            >
              Edit TTL
            </button>
            <Link
              className="button primary"
              href={`${base}/create`}
              data-shortcut-create
              aria-keyshortcuts="N"
            >
              Create record
            </Link>
          </div>
        </div>
        <div className="record-transfers">
          <RecordTransfer zone={zone} onChange={onChange} />
        </div>
        <div className="table-toolbar">
          <div className="search-row">
            <div className="search-box">
              <Icon name="search" />
              <input
                aria-label="Search records"
                data-shortcut-search
                aria-keyshortcuts="/"
                placeholder="Find records by name or value"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="Filter record type"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All record types</option>
              {[...recordTypes, "SOA"].map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
        <p className="selection-note">
          {selected.length} selected on this page. Default NS and SOA records
          are read-only.
        </p>
        {loading ? (
          <Loading label="Loading records…" />
        ) : error ? (
          <LoadError error={error} retry={refresh} />
        ) : (
          data && (
            <>
              <RecordTable
                records={data.items}
                selectedIds={selection.ids}
                toggle={selection.toggle}
                selectAll={selection.selectAll}
                sort={sort}
                order={order}
                onSort={changeSort}
                base={base}
              />
              {!data.items.length && (
                <div className="empty-state">
                  <h2>No matching records</h2>
                  <p>Try a different search or clear your filters.</p>
                  <button
                    className="button"
                    onClick={() => {
                      setSearch("");
                      setType("");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )
        )}
      </section>
      {action && (
        <RecordBulkDialog
          {...action}
          onClose={() => setAction(undefined)}
          onDone={() => {
            setAction(undefined);
            selection.clear();
            setPage(1);
            refresh();
            onChange();
          }}
        />
      )}
    </>
  );
}
