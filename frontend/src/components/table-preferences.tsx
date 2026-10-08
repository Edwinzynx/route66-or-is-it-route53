"use client";
import { useState } from "react";
import { Icon } from "./icon";
import { Modal } from "./modal";

export function TablePreferences({
  pageSize,
  onPageSize,
}: {
  pageSize: number;
  onPageSize: (size: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(pageSize);
  return (
    <>
      <button
        className="button icon table-preferences-button"
        aria-label="Table preferences"
        title="Table preferences"
        onClick={() => {
          setDraft(pageSize);
          setOpen(true);
        }}
      >
        <Icon name="settings" />
      </button>
      {open && (
        <Modal
          title="Preferences"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="button link" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="button primary"
                onClick={() => {
                  onPageSize(draft);
                  setOpen(false);
                }}
              >
                Confirm
              </button>
            </>
          }
        >
          <fieldset className="page-size-options">
            <legend>Page size</legend>
            {[10, 25, 50].map((size) => (
              <label key={size}>
                <input
                  type="radio"
                  name="page-size"
                  checked={draft === size}
                  onChange={() => setDraft(size)}
                />
                {size} resources
              </label>
            ))}
          </fieldset>
        </Modal>
      )}
    </>
  );
}
