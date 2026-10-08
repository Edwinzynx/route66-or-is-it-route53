import Link from "next/link";
import type { DnsRecord } from "@/lib/types";
import { SortIndicator } from "../icon";

export function RecordTable({
  records,
  selectedIds,
  toggle,
  selectAll,
  sort,
  order,
  onSort,
  base,
}: {
  records: DnsRecord[];
  selectedIds: string[];
  toggle: (id: string) => void;
  selectAll: (checked: boolean) => void;
  sort: string;
  order: string;
  onSort: (key: string) => void;
  base: string;
}) {
  const editable = records.filter((record) => !record.system);
  const heading = (key: string, label: string) => (
    <th
      className="sortable"
      aria-sort={
        sort === key ? (order === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button onClick={() => onSort(key)}>
        {label}
        <SortIndicator active={sort === key} order={order} />
      </button>
    </th>
  );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="select-cell">
              <input
                type="checkbox"
                aria-label="Select all editable records on this page"
                checked={
                  editable.length > 0 && selectedIds.length === editable.length
                }
                ref={(element) => {
                  if (element)
                    element.indeterminate =
                      selectedIds.length > 0 &&
                      selectedIds.length < editable.length;
                }}
                disabled={!editable.length}
                onChange={(event) => selectAll(event.target.checked)}
              />
            </th>
            {heading("name", "Record name")}
            {heading("type", "Type")}
            <th>Routing policy</th>
            <th>Value / Route traffic to</th>
            {heading("ttl", "TTL (seconds)")}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              className={selectedIds.includes(record.id) ? "selected" : ""}
            >
              <td className="select-cell">
                <input
                  type="checkbox"
                  aria-label={`Select ${record.name} ${record.type}`}
                  disabled={record.system}
                  checked={selectedIds.includes(record.id)}
                  onChange={() => toggle(record.id)}
                />
              </td>
              <td className="table-name">
                {record.system ? (
                  record.name
                ) : (
                  <Link href={`${base}/${record.id}/edit`}>{record.name}</Link>
                )}
                {record.system && <small>Default record</small>}
              </td>
              <td>{record.type}</td>
              <td>Simple</td>
              <td className="record-values">{record.values.join("\n")}</td>
              <td>{record.ttl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
