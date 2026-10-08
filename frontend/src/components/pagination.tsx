import { Icon } from "./icon";
import { TablePreferences } from "./table-preferences";
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
        <TablePreferences pageSize={pageSize} onPageSize={onPageSize} />
      </div>
    </div>
  );
}
