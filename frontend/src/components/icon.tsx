const paths = {
  search: "M10.5 10.5 15 15M12 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  refresh: "M14 7a6 6 0 1 0-1.5 5M14 2v5H9",
  menu: "M2 3h12M2 8h12M2 13h12",
  close: "m3 3 10 10M13 3 3 13",
  down: "m4 6 4 4 4-4",
  left: "m10 3-5 5 5 5",
  right: "m6 3 5 5-5 5",
  external: "M9 2h5v5M14 2 7 9M6 3H2v11h11v-4",
  info: "M8 7v5M8 4v.2M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z",
  moon: "M14 10A6.5 6.5 0 0 1 6 2a6.5 6.5 0 1 0 8 8Z",
  sun: "M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M3 13l1.5-1.5M11.5 4.5 13 3M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  grid: "M1 1h3v3H1ZM6.5 1h3v3h-3ZM12 1h3v3h-3ZM1 6.5h3v3H1ZM6.5 6.5h3v3h-3ZM12 6.5h3v3h-3ZM1 12h3v3H1ZM6.5 12h3v3h-3ZM12 12h3v3h-3Z",
  sort: "m3 5 5 6 5-6Z",
  settings: "M6.5 1h3l.5 2 1 .6 2-.5 1.5 2.6-1.5 1.5v1.6l1.5 1.5-1.5 2.6-2-.5-1 .6-.5 2h-3l-.5-2-1-.6-2 .5L1.5 10.3 3 8.8V7.2L1.5 5.7 3 3.1l2 .5 1-.6ZM10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
} as const;

export function SortIndicator({
  active,
  order,
}: {
  active: boolean;
  order: string;
}) {
  return (
    <span className={`sort-indicator ${active ? `is-sorted ${order}` : ""}`}>
      <Icon name="sort" />
    </span>
  );
}

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      className="ui-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function AwsLogo() {
  return (
    <svg className="aws-wordmark" viewBox="0 0 50 32" aria-hidden="true">
      <text
        x="2"
        y="22"
        fill="currentColor"
        fontFamily="Arial, sans-serif"
        fontSize="29"
        letterSpacing="-2"
      >
        aws
      </text>
      <path
        d="M6 25c11 7 25 6 35-1M36 24l6-1-1 5"
        fill="none"
        stroke="#ff9900"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
