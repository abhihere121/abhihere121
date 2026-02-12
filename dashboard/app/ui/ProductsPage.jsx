"use client";

import { BlockStack, Button, Card, DataTable, Divider, InlineStack, Layout, Page, Text } from "@shopify/polaris";
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

export function ProductsPage() {
  const [shop, setShop] = useLocalStorageState("ss_shop", "demo-store.myshopify.com");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const apiBase = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const basePath = "/app";
  const searchParams = useSearchParams();
  const shopFromUrl = searchParams.get("shop") || "";

  useEffect(() => {
    if (shopFromUrl && shopFromUrl !== shop) setShop(shopFromUrl);
  }, [shopFromUrl, shop, setShop]);

  const fmtTs = (iso) => {
    const v = String(iso || "");
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!shop) return;
      setLoading(true);
      try {
        const url = `${apiBase}/api/products/list?shop=${encodeURIComponent(shop)}&limit=50`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setData({ ok: false, error: String(e?.message || e) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [apiBase, shop]);

  const products = data?.ok ? data.products || [] : [];

  const rows = products.map((p) => [
    <Button key={p.handle} url={`${basePath}/products/${encodeURIComponent(p.handle)}?shop=${encodeURIComponent(shop)}`} plain>
      {p.title}
    </Button>,
    p.vendor || "—",
    String(p.totalAvailableUnits || 0),
    fmtTs(p.lastInventoryUpdatedAt),
    String(p.demandCount || 0),
    String(p.waitingCount || 0),
    `₹${formatRsFromPaise(p.missedRevenuePaise || 0)}`
  ]);

  return (
    <Page
      title="Products"
      subtitle={shop ? `Store: ${shop}` : "Store: —"}
      primaryAction={{
        content: "Sync products",
        url: `${basePath}?shop=${encodeURIComponent(shop)}`
      }}
      secondaryActions={[{ content: "Settings", url: `${basePath}/settings` }]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Catalog
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {loading ? "Loading…" : data?.ok ? `Last 30 days` : "—"}
                </Text>
              </InlineStack>
              <Divider />
              {data && !data.ok ? (
                <Text as="p" tone="critical">
                  {data.error || "Failed to load products"}
                </Text>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text", "numeric", "numeric", "numeric"]}
                  headings={["Product", "Vendor", "Available", "Last Inventory", "Demand", "Waiting", "Missed Revenue"]}
                  rows={rows}
                  truncate
                />
              )}
              {!products.length && data?.ok ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  No products found. Install the app and run Sync.
                </Text>
              ) : null}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
