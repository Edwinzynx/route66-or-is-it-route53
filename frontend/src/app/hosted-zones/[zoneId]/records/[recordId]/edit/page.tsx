import { RecordEditor } from "@/components/records/record-editor";
export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ zoneId: string; recordId: string }>;
}) {
  const { zoneId, recordId } = await params;
  return <RecordEditor zoneId={zoneId} recordId={recordId} />;
}
