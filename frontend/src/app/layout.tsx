import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { ConsoleShell } from "@/components/console-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Route 53 | AWS Console",
  description:
    "A persistent Route 53 console clone built with Next.js, FastAPI, and SQLite.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ConsoleShell>{children}</ConsoleShell>
        </AuthProvider>
      </body>
    </html>
  );
}
