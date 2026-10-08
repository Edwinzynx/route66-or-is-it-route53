export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <div className="spinner" />
      {label}
    </div>
  );
}
export function LoadError({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="alert error" role="alert">
        {error}
      </div>
      <button className="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
