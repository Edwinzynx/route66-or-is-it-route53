export type Zone = {
  id: string;
  name: string;
  description: string;
  type: "Public" | "Private";
  created_at: string;
  record_count: number;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
export const recordTypes = [
  "A",
  "AAAA",
  "CNAME",
  "TXT",
  "MX",
  "NS",
  "PTR",
  "SRV",
  "CAA",
] as const;
export type RecordType = (typeof recordTypes)[number];
export type DnsRecord = {
  id: string;
  zone_id: string;
  name: string;
  type: RecordType | "SOA";
  ttl: number;
  values: string[];
  system: boolean;
};
