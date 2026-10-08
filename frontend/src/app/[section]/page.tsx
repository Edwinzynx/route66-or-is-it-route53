import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
const sections: Record<string, string> = {
  dashboard: "Dashboard",
  "health-checks": "Health checks",
  "traffic-policies": "Traffic policies",
  resolver: "Resolver",
  profiles: "Profiles",
};
export default async function PlaceholderPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = sections[section];
  if (!title) notFound();
  return (
    <>
      <Breadcrumbs>
        <Link href="/hosted-zones">Route 53</Link>
        <span>›</span>
        {title}
      </Breadcrumbs>
      <h1>{title}</h1>
      <div className="panel empty-state">
        <div className="empty-icon">◇</div>
        <h2>Coming soon</h2>
        <p>
          {title} is a placeholder in this assignment.
          <br />
          Hosted zones and DNS record management are available now.
        </p>
        <Link className="button primary" href="/hosted-zones">
          View hosted zones
        </Link>
      </div>
    </>
  );
}
