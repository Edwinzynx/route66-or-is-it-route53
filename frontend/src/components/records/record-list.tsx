"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordTypes, type DnsRecord, type Page, type Zone } from "@/lib/types";
import { useDebounced, useResource } from "@/lib/use-resource";
import { Pagination } from "../pagination";
import { Loading, LoadError } from "../resource-state";
import { RecordDelete } from "./record-delete";

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
  const [selection, setSelection] = useState("");
  const [deleting, setDeleting] = useState<DnsRecord>();
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
  const selected = data?.items.find((record) => record.id === selection);
  const editable = selected && !selected.system;
  const base = `/hosted-zones/${zone.id}/records`;
  function changeSort(key: string) {
    setSort(key);
    setOrder(sort === key && order === "asc" ? "desc" : "asc");
    setPage(1);
  }
  const heading = (key: string, label: string) => (
    <th
      className="sortable"
      aria-sort={
        sort === key ? (order === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button onClick={() => changeSort(key)}>
        {label}
        <span>{sort === key ? (order === "asc" ? "▴" : "▾") : "↕"}</span>
      </button>
    </th>
  );
  return (
    <>
      <section className="panel" aria-label="DNS records">
        <div className="panel-heading">
          <div>
            <h2>Records {data && <span>({data.total})</span>}</h2>
            <p>Define where traffic is routed for this domain.</p>
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
              ↻
            </button>
            <button
              className="button"
              disabled={!editable}
              onClick={() => selected && setDeleting(selected)}
            >
              Delete record
            </button>
            <button
              className="button"
              disabled={!editable}
              onClick={() =>
                selected && router.push(`${base}/${selected.id}/edit`)
              }
            >
              Edit record
            </button>
            <Link className="button primary" href={`${base}/create`}>
              Create record
            </Link>
          </div>
        </div>
        <div className="search-row">
          <div className="search-box">
            <input
              aria-label="Search records"
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
        {selected?.system && (
          <div className="alert info" style={{ margin: "0 24px 18px" }}>
            Default NS and SOA records are read-only in this clone. Nameservers
            are simulated.
          </div>
        )}
        {loading ? (
          <Loading label="Loading records…" />
        ) : error ? (
          <LoadError error={error} retry={refresh} />
        ) : (
          data && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="select-cell">
                        <span className="sr-only">Select</span>
                      </th>
                      {heading("name", "Record name")}
                      {heading("type", "Type")}
                      <th>Routing policy</th>
                      <th>Value / Route traffic to</th>
                      {heading("ttl", "TTL (seconds)")}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((record) => (
                      <tr
                        key={record.id}
                        className={selection === record.id ? "selected" : ""}
                      >
                        <td className="select-cell">
                          <input
                            type="radio"
                            name="record-selection"
                            aria-label={`Select ${record.name} ${record.type}`}
                            checked={selection === record.id}
                            onChange={() => setSelection(record.id)}
                          />
                        </td>
                        <td className="table-name">
                          {record.system ? (
                            record.name
                          ) : (
                            <Link href={`${base}/${record.id}/edit`}>
                              {record.name}
                            </Link>
                          )}
                          {record.system && <small>Default record</small>}
                        </td>
                        <td>{record.type}</td>
                        <td>Simple</td>
                        <td className="record-values">
                          {record.values.join("\n")}
                        </td>
                        <td>{record.ttl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <Pagination
                page={page}
                pageSize={pageSize}
                total={data.total}
                onPage={setPage}
                onPageSize={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          )
        )}
      </section>
      {deleting && (
        <RecordDelete
          record={deleting}
          onClose={() => setDeleting(undefined)}
          onDone={() => {
            setDeleting(undefined);
            setSelection("");
            setPage(1);
            refresh();
            onChange();
          }}
        />
      )}
    </>
  );
}
