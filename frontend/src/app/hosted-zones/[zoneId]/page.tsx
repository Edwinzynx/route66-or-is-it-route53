import { ZoneDetail } from "@/components/zones/zone-detail";
export default async function ZonePage({
  params,
}: {
  params: Promise<{ zoneId: string }>;
}) {
  const { zoneId } = await params;
  return <ZoneDetail zoneId={zoneId} />;
}
