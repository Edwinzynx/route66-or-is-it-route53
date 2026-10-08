import { Icon } from "./icon";
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
          : "0 results"}
      </span>
      <div className="pagination-controls">
        <label
          htmlFor="page-size"
          className="page-size-label muted"
          style={{ margin: 0 }}
        >
          Page size
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
        >
          {[10, 25, 50].map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
        <button
          className="button icon"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <Icon name="left" />
        </button>
        <span
          className="pagination-current"
          aria-label={`Page ${page} of ${pages}`}
        >
          {page}
        </span>
        <button
          className="button icon"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <Icon name="right" />
        </button>
      </div>
    </div>
  );
}
