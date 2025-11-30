"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { Form } from "@heroui/form";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Spinner } from "@heroui/spinner";

import {
  deleteCloudflareRecord,
  listCloudflareRecords,
  listCloudflareZones,
  upsertCloudflareRecord,
} from "./actions";

import PageTitle from "@/components/page-title";
import StepTitle from "@/components/step-title";
import TokenAlertBox from "@/components/token-alert-box";
import { useApiSettings } from "@/hooks/useApiSettings";
import { useToastMessage } from "@/hooks/useToastMessage";
import { useTokenStorage } from "@/hooks/useTokenStorage";
import {
  CloudflareDnsRecord,
  CloudflareDnsRecordType,
  CloudflareZone,
} from "@/types/cloudflare";

const DNS_RECORD_TYPES: CloudflareDnsRecordType[] = [
  "A",
  "AAAA",
  "CAA",
  "CERT",
  "CNAME",
  "DNSKEY",
  "DS",
  "HTTPS",
  "LOC",
  "MX",
  "NAPTR",
  "NS",
  "OPENPGPKEY",
  "PTR",
  "SMIMEA",
  "SRV",
  "SSHFP",
  "SVCB",
  "TLSA",
  "TXT",
  "URI",
];

export default function CloudflareDnsPage() {
  const { tokens, isReady: areTokensReady } = useTokenStorage();
  const { settings: apiSettings, isReady: areSettingsReady } = useApiSettings();
  const toast = useToastMessage();

  const [zones, setZones] = useState<CloudflareZone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [records, setRecords] = useState<CloudflareDnsRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formDefaults, setFormDefaults] = useState<{
    type: CloudflareDnsRecordType;
    name: string;
    content: string;
    proxied: boolean;
  }>({
    type: "A",
    name: "",
    content: "",
    proxied: true,
  });
  const [formResetKey, setFormResetKey] = useState(0);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const isReady = areTokensReady && areSettingsReady;
  const hasCredentials = Boolean(
    tokens.cloudflare && apiSettings.cloudflareAccountId,
  );

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId),
    [selectedZoneId, zones],
  );

  const externalLinks = useMemo(() => {
    if (!apiSettings.cloudflareAccountId) return undefined;

    const links = [];

    links.push({
      title: "Dashboard",
      url: `https://dash.cloudflare.com/${apiSettings.cloudflareAccountId}/home`,
    });

    if (selectedZone) {
      links.push({
        title: `DNS records (${selectedZone.name})`,
        url: `https://dash.cloudflare.com/${apiSettings.cloudflareAccountId}/${selectedZone.name}/dns/records`,
      });
    }

    return links;
  }, [apiSettings.cloudflareAccountId, selectedZone?.name]);

  const handleLoadRecords = useCallback(
    async (zoneId: string, showErrors = true) => {
      if (!tokens.cloudflare) {
        if (showErrors) {
          toast.setMessage({
            type: "error",
            text: "Cloudflare token missing. Add it in Settings first.",
          });
        }
        return;
      }

      const trimmedZoneId = zoneId.trim();
      if (!trimmedZoneId) return;

      setIsLoadingRecords(true);
      toast.clearMessage();

      try {
        const fetchedRecords = await listCloudflareRecords({
          token: tokens.cloudflare,
          zoneId: trimmedZoneId,
          search: searchTerm,
        });
        setRecords(fetchedRecords ?? []);
        setEditingRecordId(null);
        resetRecordForm();
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        toast.setMessage({ type: "error", text });
      } finally {
        setIsLoadingRecords(false);
      }
    },
    [searchTerm, toast, tokens.cloudflare],
  );

  const handleLoadZones = useCallback(async () => {
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

    setIsLoadingZones(true);
    toast.clearMessage();

    try {
      const fetchedZones = await listCloudflareZones({
        token: tokens.cloudflare,
        accountId: apiSettings.cloudflareAccountId,
      });

      setZones(fetchedZones ?? []);

      if (fetchedZones.length > 0) {
        const firstZoneId = fetchedZones[0].id;
        setSelectedZoneId((prev) => prev || firstZoneId);
        void handleLoadRecords(firstZoneId, false);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      toast.setMessage({ type: "error", text });
    } finally {
      setIsLoadingZones(false);
    }
  }, [
    apiSettings.cloudflareAccountId,
    handleLoadRecords,
    toast,
    tokens.cloudflare,
  ]);

  const resetRecordForm = () => {
    setFormDefaults({
      type: "A",
      name: "",
      content: "",
      proxied: true,
    });
    setFormResetKey((prev) => prev + 1);
    setEditingRecordId(null);
  };

  const handleSubmitRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedZoneId) {
      toast.setMessage({ type: "error", text: "Select a domain first." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const recordType = (formData.get("recordType") as string | null)?.trim();
    const recordName =
      (formData.get("recordName") as string | null)?.trim() ?? "";
    const recordContent =
      (formData.get("recordContent") as string | null)?.trim() ?? "";
    const recordProxied = formData.get("recordProxied") !== null;

    if (!recordType) {
      toast.setMessage({
        type: "error",
        text: "Record type is required.",
      });
      return;
    }

    if (!recordName.length || !recordContent.length) {
      toast.setMessage({
        type: "error",
        text: "Record name and content are required.",
      });
      return;
    }

    setIsSavingRecord(true);
    toast.clearMessage();

    try {
      await upsertCloudflareRecord({
        token: tokens.cloudflare,
        zoneId: selectedZoneId,
        recordId: editingRecordId ?? undefined,
        record: {
          type: recordType as CloudflareDnsRecordType,
          name: recordName,
          content: recordContent,
          proxied: recordProxied,
        },
      });

      toast.setMessage({
        type: "success",
        text: editingRecordId ? "Record updated." : "Record created.",
      });

      // refresh list
      await handleLoadRecords(selectedZoneId, false);
      resetRecordForm();
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      toast.setMessage({ type: "error", text });
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (recordId: string, label?: string) => {
    if (!selectedZoneId) return;

    const confirmed = window.confirm(
      `Delete DNS record${label ? ` ${label}` : ""}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingRecordId(recordId);
    toast.clearMessage();

    try {
      await deleteCloudflareRecord({
        token: tokens.cloudflare,
        zoneId: selectedZoneId,
        recordId,
      });

      setRecords((prev) => prev.filter((item) => item.id !== recordId));
      toast.setMessage({ type: "success", text: "Record deleted." });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      toast.setMessage({ type: "error", text });
    } finally {
      setDeletingRecordId(null);
    }
  };

  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setRecords([]);
    resetRecordForm();
    void handleLoadRecords(zoneId);
  };

  const handleEditRecord = (record: CloudflareDnsRecord) => {
    setEditingRecordId(record.id);
    setFormDefaults({
      type: record.type as CloudflareDnsRecordType,
      name: record.name,
      content: record.content,
      proxied: Boolean(record.proxied),
    });
    setFormResetKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Cloudflare DNS"
        description="Browse your domains and manage A/CNAME DNS records."
        externalLink={externalLinks}
      />

      {!hasCredentials && isReady ? (
        <TokenAlertBox module="Cloudflare" />
      ) : null}

      <Divider />

      <section className="flex flex-col gap-4">
        <StepTitle
          title="Domains"
          description="Load domains under your Cloudflare account."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-default-500">
            Domains are fetched via the account ID provided in Settings.
          </p>
          <Button
            color="primary"
            isDisabled={!isReady || !hasCredentials}
            isLoading={isLoadingZones}
            onPress={handleLoadZones}
          >
            Refresh domains
          </Button>
        </div>

        {isLoadingZones ? (
          <div className="flex items-center gap-2 text-sm text-default-500">
            <Spinner size="sm" /> Loading domains...
          </div>
        ) : zones.length ? (
          <Table removeWrapper aria-label="Cloudflare domains">
            <TableHeader>
              <TableColumn>Domain</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn className="w-32">Action</TableColumn>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => {
                const isActive = selectedZoneId === zone.id;
                return (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell className="capitalize text-sm text-default-500">
                      {zone.status ?? "unknown"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={isActive ? "flat" : "light"}
                        color={isActive ? "secondary" : "default"}
                        onPress={() => handleSelectZone(zone.id)}
                      >
                        {isActive ? "Selected" : "View DNS"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-default-500">
            No domains loaded yet. Refresh to fetch zones from Cloudflare.
          </p>
        )}
      </section>

      <Divider />

      <section className="flex flex-col gap-4">
        <StepTitle
          title="DNS Records"
          description={
            selectedZone
              ? `Manage DNS records for ${selectedZone.name}.`
              : "Select a domain to view and manage DNS records."
          }
        />

        {selectedZone ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
              <Input
                className="sm:w-full"
                label="Search DNS records"
                labelPlacement="outside"
                placeholder="Filter by name or content"
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <Button
                variant="flat"
                isDisabled={!isReady}
                isLoading={isLoadingRecords}
                onPress={() => handleLoadRecords(selectedZone.id)}
              >
                Refresh records
              </Button>
            </div>

            <Card shadow="none" className="border border-default-200 mt-3">
              <CardHeader>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold">
                    {editingRecordId ? "Edit record" : "Add record"}
                  </h3>
                  <p className="text-xs text-default-500">
                    Supports Cloudflare DNS record types. TTL defaults to
                    Automatic.
                  </p>
                </div>
              </CardHeader>
              <Divider className="mx-0" />
              <CardBody className="flex flex-col gap-4">
                <Form
                  key={formResetKey}
                  className="flex flex-col gap-4 w-full"
                  onSubmit={handleSubmitRecord}
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full">
                    <Select
                      isRequired
                      name="recordType"
                      labelPlacement="outside"
                      label="Record type"
                      defaultSelectedKeys={[formDefaults.type]}
                    >
                      {DNS_RECORD_TYPES.map((type) => (
                        <SelectItem key={type}>{type}</SelectItem>
                      ))}
                    </Select>
                    <Switch
                      name="recordProxied"
                      value="true"
                      defaultSelected={formDefaults.proxied}
                    >
                      Proxied
                    </Switch>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full">
                    <Input
                      isRequired
                      name="recordName"
                      label="Record name"
                      labelPlacement="outside"
                      placeholder="app.example.com"
                      defaultValue={formDefaults.name}
                    />
                    <Input
                      isRequired
                      name="recordContent"
                      label="Record content"
                      labelPlacement="outside"
                      placeholder="Value or target"
                      defaultValue={formDefaults.content}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {editingRecordId ? (
                      <Button
                        type="button"
                        variant="light"
                        onPress={() => resetRecordForm()}
                      >
                        Cancel edit
                      </Button>
                    ) : null}
                    <Button
                      color="primary"
                      isDisabled={!isReady}
                      isLoading={isSavingRecord}
                      type="submit"
                    >
                      {editingRecordId ? "Update record" : "Add record"}
                    </Button>
                  </div>
                </Form>
              </CardBody>
            </Card>

            {isLoadingRecords ? (
              <div className="flex items-center gap-2 text-sm text-default-500">
                <Spinner size="sm" /> Loading DNS records...
              </div>
            ) : records.length ? (
              <div className="w-full overflow-x-auto">
                <Table
                  removeWrapper
                  aria-label={`DNS records for ${selectedZone.name}`}
                  className="min-w-[720px]"
                >
                  <TableHeader>
                    <TableColumn>Name</TableColumn>
                    <TableColumn className="w-24">Type</TableColumn>
                    <TableColumn>Content</TableColumn>
                    <TableColumn className="w-24">Proxied</TableColumn>
                    <TableColumn className="w-40">Action</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No DNS records found.">
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-xs">
                          {record.name}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {record.type}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {record.content}
                        </TableCell>
                        <TableCell>{record.proxied ? "Yes" : "No"}</TableCell>
                        <TableCell className="min-w-[200px]">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="flat"
                              onPress={() => handleEditRecord(record)}
                            >
                              Edit
                            </Button>
                            <Button
                              color="danger"
                              size="sm"
                              variant="light"
                              isLoading={deletingRecordId === record.id}
                              onPress={() =>
                                handleDeleteRecord(record.id, record.name)
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-default-500">
                No DNS records found. Add one using the form below.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-default-500">
            Select a domain above to see DNS records and add new ones.
          </p>
        )}
      </section>
    </div>
  );
}
