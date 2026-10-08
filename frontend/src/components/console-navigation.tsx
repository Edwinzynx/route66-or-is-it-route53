import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

export const sections = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Hosted zones", href: "/hosted-zones" },
  { label: "Health checks", href: "/health-checks" },
  { label: "Traffic policies", href: "/traffic-policies" },
  { label: "Resolver", href: "/resolver" },
  { label: "Profiles", href: "/profiles" },
];

export function ConsoleNavigation({
  open,
  mobileOpen,
  onClose,
  onNavigate,
}: {
  open: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside
      id="service-navigation"
      className={`sidebar ${open ? "is-open" : ""} ${mobileOpen ? "mobile-open" : ""}`}
    >
      <div className="sidebar-heading">
        <Link href="/hosted-zones" className="sidebar-title">
          Route 53
        </Link>
        <button
          className="plain-icon"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <Icon name="left" />
        </button>
      </div>
      <nav aria-label="Route 53">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            onClick={onNavigate}
            className={
              pathname.startsWith(section.href) ? "nav-item active" : "nav-item"
            }
            aria-current={
              pathname.startsWith(section.href) ? "page" : undefined
            }
          >
            {section.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <a
          href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html"
          target="_blank"
          rel="noreferrer"
        >
          Documentation <Icon name="external" />
        </a>
      </div>
    </aside>
  );
}
