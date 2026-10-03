"use server";

import type {
  CloudflareDnsRecord,
  CloudflareDnsRecordType,
  CloudflareZone,
} from "@/types/cloudflare";

import Cloudflare from "cloudflare";

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

const sanitizeToken = (raw: string | undefined): string => {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
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
  const cleanToken = sanitizeToken(token);
  const cleanAccountId = accountId?.trim().replace(/^["']|["']$/g, "");
  const client = new Cloudflare({ apiToken: cleanToken });

  try {
    const zones = await client.zones.list({
      account: { id: cleanAccountId },
      per_page: 50,
      order: "status",
      direction: "desc",
    });

    return zones.result.map((zone) => ({
      id: zone.id,
      name: zone.name,
      status: zone.status,
    }));
  } catch (error) {
    if (error instanceof Cloudflare.APIError) {
      throw new Error(`Cloudflare error (${error.status}): ${error.message}`);
    }
    throw error;
  }
};

export const listCloudflareRecords = async ({
  token,
  zoneId,
  search,
}: ListRecordsInput): Promise<CloudflareDnsRecord[]> => {
  const cleanToken = sanitizeToken(token);
  const client = new Cloudflare({ apiToken: cleanToken });

  try {
    const recordEntities = await client.dns.records.list({
      zone_id: zoneId,
      per_page: 100,
      order: "type",
      direction: "asc",
      search: search?.trim() || undefined,
    });

    return recordEntities.result.map(mapRecord);
  } catch (error) {
    if (error instanceof Cloudflare.APIError) {
      throw new Error(`Cloudflare error (${error.status}): ${error.message}`);
    }
    throw error;
  }
};

export const upsertCloudflareRecord = async ({
  token,
  zoneId,
  recordId,
  record,
}: UpsertRecordInput): Promise<CloudflareDnsRecord> => {
  const cleanToken = sanitizeToken(token);
  const client = new Cloudflare({ apiToken: cleanToken });
  const type = record.type.toUpperCase() as CloudflareDnsRecordType;

  try {
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
  } catch (error) {
    if (error instanceof Cloudflare.APIError) {
      throw new Error(`Cloudflare error (${error.status}): ${error.message}`);
    }
    throw error;
  }
};

export const deleteCloudflareRecord = async ({
  token,
  zoneId,
  recordId,
}: DeleteRecordInput) => {
  const cleanToken = sanitizeToken(token);
  const client = new Cloudflare({ apiToken: cleanToken });
  try {
    await client.dns.records.delete(recordId, { zone_id: zoneId });
    return true;
  } catch (error) {
    if (error instanceof Cloudflare.APIError) {
      throw new Error(`Cloudflare error (${error.status}): ${error.message}`);
    }
    throw error;
  }
};
