"use client";

import { FormEvent, useCallback, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Form } from "@heroui/form";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

import { useApiSettings } from "@/hooks/useApiSettings";
import { useToastMessage } from "@/hooks/useToastMessage";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import PageTitle from "@/components/page-title";
import StepTitle from "@/components/step-title";
import { CreateR2BucketBody, CreateR2BucketResponse } from "@/types/cloudflare";

const R2_ENV_BUCKET_DEFAULT_VALUE = "AWS_S3_BUCKET";
const R2_ENV_DOMAIN_DEFAULT_VALUE = "PUBLIC_FILE_URL";

const formatDate = (input?: string) => {
  if (!input) return "-";

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return date.toLocaleString();
};

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
};

export default function CloudflareR2Page() {
  const { tokens, isReady: areTokensReady } = useTokenStorage();
  const { settings: apiSettings, isReady: areSettingsReady } = useApiSettings();
  const toast = useToastMessage();

  const [bucketName, setBucketName] = useState("");
  const [enableDevDomain, setEnableDevDomain] = useState(true);
  const [enableUrlPrefix, setEnableUrlPrefix] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBucket, setCreatedBucket] =
    useState<CreateR2BucketResponse | null>(null);

  const isReady = areTokensReady && areSettingsReady;
  const hasCredentials = Boolean(
    tokens.cloudflare && apiSettings.cloudflareAccountId
  );

  const pageExternalLink = [
    {
      title: "Bucket List",
      url: `https://dash.cloudflare.com/${apiSettings.cloudflareAccountId}/r2/overview`,
    },
  ];

  const handleCreateBucket = useCallback(async () => {
    const trimmedBucket = bucketName.trim();

    if (!trimmedBucket) {
      toast.setMessage({
        type: "error",
        text: "Enter a bucket name before submitting.",
      });
      return;
    }

    if (!tokens.cloudflare) {
      toast.setMessage({
        type: "error",
        text: "Cloudflare token missing. Add it in Settings first.",
      });
      return;
    }

    if (!apiSettings.cloudflareAccountId) {
      toast.setMessage({
        type: "error",
        text: "Cloudflare account ID missing. Provide it in Settings.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cloudflare/r2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketName: trimmedBucket,
          accountId: apiSettings.cloudflareAccountId,
          token: tokens.cloudflare,
          enableDevDomain: enableDevDomain,
        } satisfies CreateR2BucketBody),
      });

      const payload = (await response.json()) as CreateR2BucketResponse;

      if (!response.ok) {
        throw new Error("Failed to create bucket");
      }

      if (!payload.bucket) {
        throw new Error("Unexpected API response.");
      }

      setCreatedBucket(payload);

      setBucketName("");

      toast.setMessage({
        type: "success",
        text: "Bucket created and dev domain enabled successfully.",
      });
    } catch (error) {
      toast.setMessage({
        type: "error",
        text: extractErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [apiSettings.cloudflareAccountId, bucketName, toast, tokens.cloudflare]);

  const handleCopyDevDomain = useCallback(
    async (withPrefix = false) => {
      if (!createdBucket?.devDomain.domain) {
        return;
      }

      let urlToCopy = createdBucket.devDomain.domain;

      if (withPrefix) {
        urlToCopy = "https://" + urlToCopy;
      }

      try {
        await navigator.clipboard.writeText(urlToCopy);
        toast.setMessage({
          type: "success",
          text: "Dev domain copied to clipboard.",
        });
      } catch (error) {
        toast.setMessage({
          type: "error",
          text: extractErrorMessage(error),
        });
      }
    },
    [createdBucket?.devDomain.domain, toast]
  );

  const handleCopyAsEnvValue = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const formValue = Object.fromEntries(new FormData(e.currentTarget));

      let valueToCopy = "";

      valueToCopy +=
        formValue.bucketNameKey + "=" + createdBucket?.bucket.name + "\n";
      valueToCopy +=
        formValue.bucketDomainKey +
        "=" +
        (enableUrlPrefix ? "https://" : "") +
        createdBucket?.devDomain.domain;

      try {
        await navigator.clipboard.writeText(valueToCopy);
        toast.setMessage({
          type: "success",
          text: "Dev domain copied to clipboard.",
        });
      } catch (error) {
        toast.setMessage({
          type: "error",
          text: extractErrorMessage(error),
        });
      }
    },
    [createdBucket, toast]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Cloudflare R2 Buckets"
        description="Create R2 buckets using your Cloudflare API token."
        externalLink={pageExternalLink}
      />

      {!hasCredentials && isReady && (
        <section>
          <p className="text-sm text-warning-600">
            Add your Cloudflare token and account ID on the Settings page before
            creating buckets.
          </p>
        </section>
      )}

      <Divider />

      <section className="flex flex-col gap-6">
        <StepTitle
          title="Create bucket"
          description="Provide a unique bucket name. Names must be globally unique across Cloudflare R2."
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Input
            isDisabled={!isReady}
            label="Bucket name"
            labelPlacement="outside"
            placeholder="my-r2-bucket"
            value={bucketName}
            className="md:w-1/2"
            onValueChange={setBucketName}
          />

          <Button
            color="primary"
            isDisabled={!isReady || !hasCredentials || !bucketName.trim()}
            isLoading={isSubmitting}
            onPress={handleCreateBucket}
          >
            Create bucket
          </Button>
        </div>

        <Switch isSelected={enableDevDomain} onValueChange={setEnableDevDomain}>
          Enable dev domain on created
        </Switch>
      </section>

      {createdBucket ? (
        <Card shadow="none" className="border border-primary/40">
          <CardHeader>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold">
                Bucket {createdBucket.bucket.name} created
              </h3>
              <p className="text-xs text-default-500">
                Location: {createdBucket.bucket.location} • Created at:{" "}
                {formatDate(createdBucket.bucket.createdAt)}
              </p>
            </div>
          </CardHeader>
          <Divider className="mx-0" />
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Dev domain</span>
              <span className="text-default-500">
                Status:{" "}
                {createdBucket.devDomain.enabled ? "Enabled" : "Disabled"}
              </span>
              <span className="text-primary">
                {createdBucket.devDomain.domain}
              </span>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <Button
                isDisabled={!createdBucket.devDomain.domain}
                variant="flat"
                size="sm"
                className="w-full md:w-1/2"
                onPress={() => handleCopyDevDomain()}
              >
                Copy domain
              </Button>
              <Button
                isDisabled={!createdBucket.devDomain.domain}
                variant="flat"
                size="sm"
                className="w-full md:w-1/2"
                onPress={() => handleCopyDevDomain(true)}
              >
                Copy domain (With https prefix)
              </Button>
            </div>

            {createdBucket.devDomain && (
              <Form onSubmit={handleCopyAsEnvValue}>
                <div className="mt-4 flex flex-col gap-3 w-full">
                  <Divider />
                  <div className="font-medium">Copy As Environment</div>

                  <Table
                    removeWrapper
                    aria-label={`Env table for bucket ${createdBucket.bucket.name}`}
                  >
                    <TableHeader>
                      <TableColumn>Key</TableColumn>
                      <TableColumn>Value</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No branches available.">
                      <TableRow key={`${createdBucket.bucket.name}-name`}>
                        <TableCell className="font-mono text-xs">
                          <Input
                            isRequired
                            name="bucketNameKey"
                            variant="bordered"
                            defaultValue={R2_ENV_BUCKET_DEFAULT_VALUE}
                          />
                        </TableCell>
                        <TableCell className="max-w-40 md: sm:max-w-full">
                          {createdBucket.bucket.name}
                        </TableCell>
                      </TableRow>
                      <TableRow
                        key={`${createdBucket.bucket.name}-file-domain`}
                      >
                        <TableCell className="font-mono text-xs">
                          <Input
                            isRequired
                            name="bucketDomainKey"
                            variant="bordered"
                            defaultValue={R2_ENV_DOMAIN_DEFAULT_VALUE}
                          />
                        </TableCell>
                        <TableCell className="max-w-40 md: sm:max-w-full">
                          {createdBucket.devDomain.domain}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Switch
                    size="sm"
                    isSelected={enableUrlPrefix}
                    onValueChange={setEnableUrlPrefix}
                  >
                    Enable https prefix for url value
                  </Switch>

                  <Button
                    color="primary"
                    size="sm"
                    type="submit"
                    className="w-full"
                  >
                    Copy as env value
                  </Button>
                </div>
              </Form>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
