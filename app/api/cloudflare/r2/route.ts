import { NextResponse } from "next/server";
import Cloudflare from "cloudflare";

import { CreateR2BucketBody, CreateR2BucketResponse } from "@/types/cloudflare";

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
};

export async function POST(
  request: Request
): Promise<NextResponse<CreateR2BucketResponse | { error: string }>> {
  try {
    const body = (await request.json()) as CreateR2BucketBody;

    const bucketName = body.bucketName?.trim();
    const accountId = body.accountId?.trim();
    const token = body.token?.trim();

    if (!bucketName) {
      return NextResponse.json(
        { error: "Bucket name is required." },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "Cloudflare account ID is required." },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: "Cloudflare API token is required." },
        { status: 400 }
      );
    }

    const client = new Cloudflare({
      apiToken: token,
    });

    const bucket = await client.r2.buckets.create({
      account_id: accountId,
      name: bucketName,
    });

    if (!bucket || !bucket?.name) {
      return NextResponse.json(
        { error: "Unable to create R2 bucket." },
        { status: 400 }
      );
    }

    const devDomain = await client.r2.buckets.domains.managed.update(
      bucket.name,
      {
        account_id: accountId,
        enabled: !!body.enableDevDomain,
      }
    );

    return NextResponse.json({
      bucket: {
        name: bucket.name,
        location: bucket.location,
        createdAt: bucket.creation_date,
      },
      devDomain: devDomain,
    });
  } catch (error) {
    return NextResponse.json(
      { error: extractErrorMessage(error) },
      { status: 500 }
    );
  }
}
