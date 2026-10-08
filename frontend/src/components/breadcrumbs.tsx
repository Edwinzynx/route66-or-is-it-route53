import type { ReactNode } from "react";

/** Route-owned breadcrumbs share the console's fixed service bar. */
export function Breadcrumbs({ children }: { children: ReactNode }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {children}
    </nav>
  );
}
