export type CreateR2BucketBody = {
  bucketName?: string;
  accountId?: string;
  token?: string;
  enableDevDomain?: boolean;
};

export type CreateR2BucketResponse = {
  bucket: {
    name: string;
    location?: string;
    createdAt?: string;
  };
  devDomain: {
    bucketId: string;
    domain: string;
    enabled: boolean;
  };
};

export type CloudflareZone = {
  id: string;
  name: string;
  status?: string;
};

import type { RecordListParams } from "cloudflare/resources/dns/records";

export type CloudflareDnsRecordType = NonNullable<RecordListParams["type"]>;

export type CloudflareDnsRecord = {
  id: string;
  type: CloudflareDnsRecordType;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
};
