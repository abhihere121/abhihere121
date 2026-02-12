"use client";

import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  DataTable,
  Divider,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField
} from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clamp, formatRsFromPaise } from "./format";

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

function RiskBadge({ badge }) {
  const tone = badge === "critical" ? "critical" : badge === "high" ? "warning" : "info";
  const label = badge === "critical" ? "Critical" : badge === "high" ? "High" : "Medium";
  return <Badge tone={tone}>{label}</Badge>;
}

function BarChart({ rows }) {
  const max = rows.reduce((m, r) => Math.max(m, r.demandCount), 0) || 1;
  return (
    <BlockStack gap="200">
      {rows.map((r) => {
        const w = clamp(Math.round((r.demandCount / max) * 100), 3, 100);
        return (
          <Box key={`${r.productTitle}-${r.size}`} padding="200">
            <InlineStack align="space-between" blockAlign="center" gap="200">
              <Text as="span" variant="bodyMd" fontWeight="medium">
                {r.productTitle} · {r.size}
              </Text>
              <Text as="span" variant="bodyMd">
                {r.demandCount} demand · ₹{formatRsFromPaise(r.missedRevenuePaise)}
              </Text>
            </InlineStack>
            <div style={{ height: 10, background: "#E2E8F0", borderRadius: 999, marginTop: 8 }}>
              <div
                style={{
                  width: `${w}%`,
                  height: 10,
                  background: r.demandCount >= 200 ? "#EF4444" : r.demandCount >= 80 ? "#F59E0B" : "#22C55E",
                  borderRadius: 999
                }}
              />
            </div>
          </Box>
        );
      })}
    </BlockStack>
  );
}

export function OverviewPage() {
  const [shop, setShop] = useLocalStorageState("ss_shop", "demo-store.myshopify.com");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const apiBase = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const searchParams = useSearchParams();
  const shopFromUrl = searchParams.get("shop") || "";

  useEffect(() => {
    if (shopFromUrl && shopFromUrl !== shop) setShop(shopFromUrl);
  }, [shopFromUrl, shop, setShop]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const statusRes = await fetch(`${apiBase}/api/store/status?shop=${encodeURIComponent(shop)}`, {
          cache: "no-store"
        });
        const statusJson = await statusRes.json().catch(() => null);
        if (!cancelled) setStatus(statusJson);

        const res = await fetch(`${apiBase}/api/dashboard/overview?shop=${encodeURIComponent(shop)}`, {
          cache: "no-store"
        });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setStatus({ ok: false, error: String(e?.message || e) });
          setData({ ok: false, error: String(e?.message || e) });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (shop) run();
    return () => {
      cancelled = true;
    };
  }, [apiBase, shop, refreshNonce]);

  const title = useMemo(() => {
    if (data?.ok) return `Overview — ${data.shop}`;
    return "Overview";
  }, [data]);

  const kpis = data?.ok ? data.kpis : null;
  const demandRows = data?.ok ? data.demandByVariant || [] : [];
  const highRiskRows = data?.ok ? data.highRisk || [] : [];

  const tableRows = highRiskRows.map((r) => [
    r.productTitle,
    r.size,
    String(r.demandCount),
    `₹${formatRsFromPaise(r.missedRevenuePaise)}`,
    String(Math.max(0, Math.round((r.demandCount || 0) * 0.35))),
    "—"
  ]);

  const installed = Boolean(status?.ok && status?.installed);
  const installUrl = `${apiBase}/auth?shop=${encodeURIComponent(shop)}`;
  const counts = status?.ok && status?.counts ? status.counts : null;

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${apiBase}/api/shopify/sync?shop=${encodeURIComponent(shop)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, maxPages: 4, limit: 100 })
      });
      const json = await res.json().catch(() => ({}));
      setSyncResult(json);
      setRefreshNonce((n) => n + 1);
    } catch (e) {
      setSyncResult({ ok: false, error: String(e?.message || e) });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Page
      title={title}
      subtitle="Revenue-first. Actionable. Founder-speed."
      primaryAction={{ content: "Upgrade", disabled: true }}
      secondaryActions={[{ content: "Support", disabled: true }]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                <TextField
                  label="Shop domain"
                  value={shop}
                  onChange={setShop}
                  autoComplete="off"
                  helpText="Use the exact *.myshopify.com domain installed via /auth"
                />
                <Box paddingBlockStart={{ xs: "0", md: "600" }}>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    API: {apiBase}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Status: {loading ? "Loading…" : installed ? "Installed" : "Not installed"}
                  </Text>
                  {installed && counts ? (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Data: {counts.products_count} products · {counts.variants_count} variants · {counts.demand_events_count} events ·{" "}
                      {counts.webhooks_count} webhooks
                    </Text>
                  ) : null}
                </Box>
              </InlineGrid>
              {!installed ? (
                <InlineStack gap="200" align="start" blockAlign="center">
                  <Text as="p" variant="bodyMd">
                    Install the app for this shop to see real data.
                  </Text>
                  <Button url={installUrl} external>
                    Install now
                  </Button>
                </InlineStack>
              ) : (
                <InlineStack gap="200" align="start" blockAlign="center">
                  <Button onClick={runSync} disabled={syncing}>
                    {syncing ? "Syncing…" : "Sync now"}
                  </Button>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {syncResult?.ok
                      ? `Synced: ${syncResult.productsUpserted} products, ${syncResult.variantsUpserted} variants`
                      : syncResult?.error
                        ? `Sync error: ${syncResult.error}`
                        : "Pull products/variants into the database."}
                  </Text>
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="headingSm" tone="subdued">
                  ₹ Missed Revenue (Last 7 days)
                </Text>
                <Text as="p" variant="heading2xl" fontWeight="bold">
                  ₹{kpis ? formatRsFromPaise(kpis.missedRevenuePaise) : "—"}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Revenue-first framing (money lost).
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="headingSm" tone="subdued">
                  Top Risk Variant
                </Text>
                {kpis?.topRiskVariant ? (
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {kpis.topRiskVariant.productTitle} · Size {kpis.topRiskVariant.size}
                    </Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd">
                        Demand: {kpis.topRiskVariant.demandCount}
                      </Text>
                      <RiskBadge badge={kpis.topRiskVariant.badge} />
                    </InlineStack>
                  </BlockStack>
                ) : (
                  <Text as="p" tone="subdued">
                    —
                  </Text>
                )}
                <Text as="p" variant="bodySm" tone="subdued">
                  Next action: restock plan.
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="headingSm" tone="subdued">
                  Customers Waiting
                </Text>
                <Text as="p" variant="heading2xl" fontWeight="bold">
                  {kpis ? kpis.customersWaiting : "—"}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Will auto-notify on restock.
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="headingSm" tone="subdued">
                  Restock Urgency Score
                </Text>
                <Text as="p" variant="heading2xl" fontWeight="bold">
                  {kpis ? `${kpis.restockUrgencyScore} / 10` : "—"}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Signal over noise.
                </Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Demand by Variant
              </Text>
              <Divider />
              {demandRows.length ? (
                <BarChart rows={demandRows} />
              ) : (
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    You haven’t missed revenue yet. That’s good — or we’re not tracking correctly.
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Verify Integration: install the app on a dev store, then generate demand events.
                  </Text>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                High Risk Products
              </Text>
              <Divider />
              <DataTable
                columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "text"]}
                headings={["Product", "Variant", "Demand", "Missed Revenue", "Suggested Units", "Action"]}
                rows={tableRows}
                truncate
              />
              <Text as="p" variant="bodySm" tone="subdued">
                Actions (Generate PO / Notify Customers) will be wired next.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
