"use client";
import Link from "next/link";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="panel empty-state">
      <h1>Something went wrong</h1>
      <p>
        We couldn’t load this page. Try again or return to your hosted zones.
      </p>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="button primary" onClick={retry}>
          Try again
        </button>
        <Link className="button" href="/hosted-zones">
          Hosted zones
        </Link>
      </div>
    </section>
  );
}
