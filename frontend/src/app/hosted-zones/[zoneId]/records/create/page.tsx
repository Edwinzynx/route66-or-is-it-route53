import { RecordEditor } from "@/components/records/record-editor";
export default async function CreateRecordPage({
  params,
}: {
  params: Promise<{ zoneId: string }>;
}) {
  const { zoneId } = await params;
  return <RecordEditor zoneId={zoneId} />;
}
