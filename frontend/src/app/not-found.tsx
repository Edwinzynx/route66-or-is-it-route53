import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel empty-state">
      <div className="eyebrow">404</div>
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link className="button primary" href="/hosted-zones">
        Back to hosted zones
      </Link>
    </section>
  );
}
