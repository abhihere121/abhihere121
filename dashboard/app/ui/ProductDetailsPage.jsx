"use client";

import { BlockStack, Button, Card, DataTable, Divider, Layout, Page, Text } from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { formatRsFromPaise } from "./format";

export function ProductDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const handle = String(params?.handle || "");
  const shop = String(searchParams.get("shop") || "");
  const apiBase = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const basePath = "/app";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

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
      if (!shop || !handle) return;
      setLoading(true);
      try {
        const url = `${apiBase}/api/products/details?shop=${encodeURIComponent(shop)}&handle=${encodeURIComponent(handle)}`;
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
  }, [apiBase, shop, handle]);

  const product = data?.ok ? data.product : null;
  const variants = data?.ok ? data.variants || [] : [];

  const rows = variants.map((v) => [
    v.size ? `Size ${v.size}` : "—",
    v.sku || "—",
    `₹${formatRsFromPaise(v.pricePaise || 0)}`,
    String(v.availableUnits || 0),
    fmtTs(v.lastInventoryUpdatedAt),
    String(v.demandCount || 0),
    `₹${formatRsFromPaise(v.missedRevenuePaise || 0)}`,
    String(v.waitingCount || 0)
  ]);

  const title = product?.title ? `Product — ${product.title}` : "Product";
  const subtitle = product?.vendor ? `Vendor: ${product.vendor}` : "Vendor: —";

  return (
    <Page
      title={title}
      subtitle={subtitle}
      backAction={{ content: "Back", url: `${basePath}${shop ? `?shop=${encodeURIComponent(shop)}` : ""}` }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="p" variant="bodySm" tone="subdued">
                {shop ? `Shop: ${shop}` : "Shop: —"}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {product?.handle ? `Handle: ${product.handle}` : "Handle: —"}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {data?.ok ? `Total available units: ${String(data.inventory?.totalAvailableUnits || 0)}` : "Total available units: —"}
              </Text>
              {!shop ? (
                <Button url={`${basePath}/settings`} plain>
                  Set shop domain in Settings
                </Button>
              ) : null}
              {loading ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  Loading…
                </Text>
              ) : data && !data.ok ? (
                <Text as="p" variant="bodySm" tone="critical">
                  {data.error || "Failed to load product"}
                </Text>
              ) : null}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Variants (last {String(data?.windowDays || 30)} days)
              </Text>
              <Divider />
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "text", "numeric", "numeric", "numeric"]}
                headings={["Variant", "SKU", "Price", "Available", "Last Inventory", "Demand", "Missed Revenue", "Waiting"]}
                rows={rows}
                truncate
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
