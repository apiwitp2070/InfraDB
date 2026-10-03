"use server";

import type {
  CreateR2BucketBody,
  CreateR2BucketResponse,
} from "@/types/cloudflare";

import Cloudflare from "cloudflare";

const sanitizeToken = (raw: string | undefined): string => {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
};

export const createCloudflareR2Bucket = async (
  body: CreateR2BucketBody,
): Promise<CreateR2BucketResponse> => {
  const bucketName = body.bucketName?.trim();
  const accountId = body.accountId?.trim().replace(/^["']|["']$/g, "");
  const token = sanitizeToken(body.token);

  if (!bucketName) {
    throw new Error("Bucket name is required.");
  }

  if (!accountId) {
    throw new Error("Cloudflare account ID is required.");
  }

  if (!token) {
    throw new Error("Cloudflare API token is required.");
  }

  const client = new Cloudflare({ apiToken: token });

  try {
    const bucket = await client.r2.buckets.create({
      account_id: accountId,
      name: bucketName,
    });

    if (!bucket || !bucket?.name) {
      throw new Error("Unable to create R2 bucket.");
    }

    const devDomain = await client.r2.buckets.domains.managed.update(
      bucket.name,
      {
        account_id: accountId,
        enabled: !!body.enableDevDomain,
      },
    );

    return {
      bucket: {
        name: bucket.name,
        location: bucket.location,
        createdAt: bucket.creation_date,
      },
      devDomain,
    };
  } catch (error) {
    if (error instanceof Cloudflare.APIError) {
      throw new Error(`Cloudflare error (${error.status}): ${error.message}`);
    }
    throw error;
  }
};
