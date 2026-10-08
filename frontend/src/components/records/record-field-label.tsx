export function RecordFieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: string;
}) {
  return (
    <div className="field-label-row">
      <label htmlFor={htmlFor}>{children}</label>
      <a
        className="field-help"
        href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-basic.html"
        target="_blank"
        rel="noreferrer"
        aria-label={`${children} documentation`}
      >
        Info
      </a>
    </div>
  );
}
