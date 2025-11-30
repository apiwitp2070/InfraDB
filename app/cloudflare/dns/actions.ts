"use server";

import Cloudflare from "cloudflare";

import type { CloudflareDnsRecord, CloudflareDnsRecordType, CloudflareZone } from "@/types/cloudflare";

type ListZonesInput = {
  token: string;
  accountId: string;
};

type ListRecordsInput = {
  token: string;
  zoneId: string;
  search?: string;
};

type UpsertRecordInput = {
  token: string;
  zoneId: string;
  recordId?: string;
  record: {
    type: CloudflareDnsRecordType;
    name: string;
    content: string;
    proxied?: boolean;
  };
};

type DeleteRecordInput = {
  token: string;
  zoneId: string;
  recordId: string;
};

const mapRecord = (record: any): CloudflareDnsRecord => ({
  id: record.id,
  type: record.type,
  name: record.name,
  content: record.content,
  proxied: record.proxied,
  ttl: record.ttl,
});

export const listCloudflareZones = async ({
  token,
  accountId,
}: ListZonesInput): Promise<CloudflareZone[]> => {
  const client = new Cloudflare({ apiToken: token });

  const zones = await client.zones.list({
    account: { id: accountId },
    per_page: 50,
    order: "status",
    direction: "desc",
  });

  return zones.result.map((zone) => ({
    id: zone.id,
    name: zone.name,
    status: zone.status,
  }));
};

export const listCloudflareRecords = async ({
  token,
  zoneId,
  search,
}: ListRecordsInput): Promise<CloudflareDnsRecord[]> => {
  const client = new Cloudflare({ apiToken: token });

  const recordEntities = await client.dns.records.list({
    zone_id: zoneId,
    per_page: 100,
    order: "type",
    direction: "asc",
    search: search?.trim() || undefined,
  });

  return recordEntities.result.map(mapRecord);
};

export const upsertCloudflareRecord = async ({
  token,
  zoneId,
  recordId,
  record,
}: UpsertRecordInput): Promise<CloudflareDnsRecord> => {
  const client = new Cloudflare({ apiToken: token });
  const type = record.type.toUpperCase() as CloudflareDnsRecordType;

  const payload = recordId
    ? await client.dns.records.update(recordId, {
        zone_id: zoneId,
        type,
        name: record.name,
        content: record.content,
        proxied: record.proxied ?? false,
        ttl: 1, // Automatic
      })
    : await client.dns.records.create({
        zone_id: zoneId,
        type,
        name: record.name,
        content: record.content,
        proxied: record.proxied ?? false,
        ttl: 1, // Automatic
      });

  return mapRecord(payload);
};

export const deleteCloudflareRecord = async ({
  token,
  zoneId,
  recordId,
}: DeleteRecordInput) => {
  const client = new Cloudflare({ apiToken: token });
  await client.dns.records.delete(recordId, { zone_id: zoneId });
  return true;
};
