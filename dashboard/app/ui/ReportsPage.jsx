"use client";

import { BlockStack, Box, Button, Card, DataTable, InlineGrid, InlineStack, Layout, Page, Text, TextField } from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatRsFromPaise } from "./format";

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(raw);
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function isoDateDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [shop, setShop] = useLocalStorageState("ss_shop", "demo-store.myshopify.com");
  const [from, setFrom] = useLocalStorageState("ss_report_from", isoDateDaysAgo(7));
  const [to, setTo] = useLocalStorageState("ss_report_to", new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const apiBase = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const searchParams = useSearchParams();
  const shopFromUrl = searchParams.get("shop") || "";

  useEffect(() => {
    if (shopFromUrl && shopFromUrl !== shop) setShop(shopFromUrl);
  }, [shopFromUrl, shop, setShop]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = `${apiBase}/api/reports/weekly?shop=${encodeURIComponent(shop)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setData(json);
    } catch (e) {
      setData({ ok: false, error: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shop) return;
    fetchReport();
  }, [shop]);

  const title = useMemo(() => (data?.ok ? `Reports — ${data.shop}` : "Reports"), [data]);
  const rows = data?.ok ? data.rows || [] : [];

  const tableRows = rows.map((r) => [
    r.productTitle,
    `Size ${r.size || "—"}`,
    String(r.oosVisits),
    String(r.notifyIntents),
    `₹${formatRsFromPaise(r.missedRevenuePaise)}`
  ]);

  const total = data?.ok ? data.totalMissedRevenuePaise : null;

  return (
    <Page title={title} subtitle="Weekly missed revenue + demand breakdown">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineGrid columns={{ xs: 1, md: 2, lg: 4 }} gap="400">
                <TextField label="Shop domain" value={shop} onChange={setShop} autoComplete="off" />
                <TextField label="From" type="date" value={from} onChange={setFrom} autoComplete="off" />
                <TextField label="To" type="date" value={to} onChange={setTo} autoComplete="off" />
                <Box paddingBlockStart={{ xs: "0", md: "600" }}>
                  <Button onClick={fetchReport} disabled={loading}>
                    {loading ? "Loading…" : "Refresh"}
                  </Button>
                </Box>
              </InlineGrid>
              <InlineStack gap="200" align="start" blockAlign="center">
                <Text as="p" variant="bodyMd">
                  Total missed: {total !== null ? `₹${formatRsFromPaise(total)}` : "—"}
                </Text>
                {data?.ok ? null : (
                  <Text as="p" variant="bodySm" tone="critical">
                    {data?.error || "Unable to load report."}
                  </Text>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Founder Message Preview
              </Text>
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{data?.ok ? data.message : "—"}</pre>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Top Variants (Weekly)
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "numeric", "numeric", "numeric"]}
                headings={["Product", "Variant", "OOS Visits", "Notify", "Missed Revenue"]}
                rows={tableRows}
                truncate
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
