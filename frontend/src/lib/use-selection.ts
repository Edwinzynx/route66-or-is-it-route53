"use client";
import { useState } from "react";

/** Selection belongs to one filter/page snapshot; hidden rows are never acted on. */
export function useSelection<T extends { id: string }>(
  items: T[],
  scope: string,
) {
  const [state, setState] = useState<{ scope: string; ids: string[] }>({
    scope,
    ids: [],
  });
  const selected =
    state.scope === scope
      ? items.filter((item) => state.ids.includes(item.id))
      : [];
  const ids = selected.map((item) => item.id);
  function toggle(id: string) {
    setState({
      scope,
      ids: ids.includes(id)
        ? ids.filter((value) => value !== id)
        : [...ids, id],
    });
  }
  return {
    selected,
    ids,
    toggle,
    selectAll: (checked: boolean) =>
      setState({ scope, ids: checked ? items.map((item) => item.id) : [] }),
    clear: () => setState({ scope, ids: [] }),
  };
}
