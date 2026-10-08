"use client";
import { createContext, useContext, useState } from "react";

const NotificationContext = createContext<(message: string) => void>(() => {});
export function Notifications({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  return (
    <NotificationContext.Provider value={setMessage}>
      {message && (
        <div className="alert success" role="status">
          <span>✓</span>
          <span>{message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      {children}
    </NotificationContext.Provider>
  );
}
export const useNotify = () => useContext(NotificationContext);
