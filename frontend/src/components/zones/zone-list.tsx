"use client";
import Link from "next/link";
import { useState } from "react";
import type { Page, Zone } from "@/lib/types";
import { useDebounced, useResource } from "@/lib/use-resource";
import { Pagination } from "../pagination";
import { Loading, LoadError } from "../resource-state";
import { ZoneDialog } from "./zone-dialogs";
import { Icon, SortIndicator } from "../icon";
import { useRouter } from "next/navigation";

export function ZoneList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState("asc");
  const [selection, setSelection] = useState("");
  const [dialog, setDialog] = useState<{
    zone: Zone;
    mode: "edit" | "delete";
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
  const { data, error, loading, refresh } = useResource<Page<Zone>>(
    `/zones?${params}`,
  );
  const selected = data?.items.find((zone) => zone.id === selection);
  function changeSort(key: string) {
    setSort(key);
    setOrder(sort === key && order === "asc" ? "desc" : "asc");
    setPage(1);
  }
  const sortHeader = (key: string, title: string) => (
    <th
      className="sortable"
      aria-sort={
        sort === key ? (order === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button onClick={() => changeSort(key)}>
        {title}
        <SortIndicator active={sort === key} order={order} />
      </button>
    </th>
  );
  return (
    <>
      <div className="breadcrumbs">
        <Link href="/hosted-zones">Route 53</Link>
        <span>›</span>Hosted zones
      </div>
      <section className="panel resource-panel" aria-label="Hosted zones">
        <div className="panel-heading">
          <div>
            <h1>Hosted zones {data && <span>({data.total})</span>}</h1>
          </div>
          <div className="actions">
            <button
              className="button icon"
              aria-label="Refresh hosted zones"
              onClick={refresh}
              disabled={loading}
            >
              <Icon name="refresh" />
            </button>
            <button
              className="button"
              disabled={!selected}
              onClick={() =>
                selected && router.push(`/hosted-zones/${selected.id}`)
              }
            >
              View details
            </button>
            <button
              className="button"
              disabled={!selected}
              onClick={() =>
                selected && setDialog({ zone: selected, mode: "delete" })
              }
            >
              Delete
            </button>
            <button
              className="button"
              disabled={!selected}
              onClick={() =>
                selected && setDialog({ zone: selected, mode: "edit" })
              }
            >
              Edit
            </button>
            <Link
              className="button primary"
              href="/hosted-zones/create"
              data-shortcut-create
              aria-keyshortcuts="N"
            >
              Create hosted zone
            </Link>
          </div>
        </div>
        <p className="table-intro">
          A hosted zone contains records that specify how to route traffic for a
          domain and its subdomains.{" "}
          <a
            href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html"
            target="_blank"
            rel="noreferrer"
          >
            Learn more <Icon name="external" />
          </a>
        </p>
        <div className="table-toolbar">
          <div className="search-row">
            <div className="search-box">
              <Icon name="search" />
              <input
                aria-label="Search hosted zones"
                data-shortcut-search
                aria-keyshortcuts="/"
                placeholder="Filter hosted zones by name or description"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="Filter zone type"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All zone types</option>
              <option>Public</option>
              <option>Private</option>
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
        {loading ? (
          <Loading label="Loading hosted zones…" />
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
                      {sortHeader("name", "Hosted zone name")}
                      {sortHeader("type", "Type")}
                      {sortHeader("record_count", "Record count")}
                      <th>Description</th>
                      <th>Hosted zone ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((zone) => (
                      <tr
                        key={zone.id}
                        className={selection === zone.id ? "selected" : ""}
                      >
                        <td className="select-cell">
                          <input
                            type="radio"
                            name="zone-selection"
                            aria-label={`Select ${zone.name}`}
                            checked={selection === zone.id}
                            onChange={() => setSelection(zone.id)}
                          />
                        </td>
                        <td>
                          <Link
                            className="table-name"
                            href={`/hosted-zones/${zone.id}`}
                          >
                            {zone.name}
                          </Link>
                        </td>
                        <td>{zone.type}</td>
                        <td>{zone.record_count}</td>
                        <td className="table-description">
                          {zone.description || "—"}
                        </td>
                        <td className="nowrap">{zone.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.items.length && (
                <div className="empty-state">
                  <div className="empty-icon">◇</div>
                  <h2>
                    {search || type
                      ? "No matching hosted zones"
                      : "No hosted zones"}
                  </h2>
                  <p>
                    {search || type
                      ? "Try a different search or clear your filters."
                      : "Create a hosted zone to start managing records for your domain."}
                  </p>
                  {search || type ? (
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
                  ) : (
                    <Link
                      className="button primary"
                      href="/hosted-zones/create"
                    >
                      Create hosted zone
                    </Link>
                  )}
                </div>
              )}
            </>
          )
        )}
      </section>
      {dialog && (
        <ZoneDialog
          {...dialog}
          onClose={() => setDialog(undefined)}
          onDone={() => {
            setDialog(undefined);
            setSelection("");
            setPage(1);
            refresh();
          }}
        />
      )}
    </>
  );
}
