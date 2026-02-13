"use client";

import { MDCard, MDButton, MDDataTable, mdTheme } from "../material";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatRsFromPaise } from "./format";
import { useShop } from "../context/ShopContext";



export function ProductsPage() {
  const { shop, setShop } = useShop();
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

  const columns = [
    { header: "Product", align: "left" },
    { header: "Vendor", align: "left" },
    { header: "Available", align: "right" },
    { header: "Last Inventory", align: "left" },
    { header: "Demand", align: "right" },
    { header: "Waiting", align: "right" },
    { header: "Missed Revenue", align: "right" }
  ];

  const rows = products.map((p) => [
    <MDButton key={p.handle} href={`${basePath}/products/${encodeURIComponent(p.handle)}?shop=${encodeURIComponent(shop)}`} variant="text">
      {p.title}
    </MDButton>,
    p.vendor || "—",
    String(p.totalAvailableUnits || 0),
    fmtTs(p.lastInventoryUpdatedAt),
    String(p.demandCount || 0),
    String(p.waitingCount || 0),
    `₹${formatRsFromPaise(p.missedRevenuePaise || 0)}`
  ]);

  return (
    <div style={{ padding: mdTheme.spacing.xl, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: mdTheme.spacing.xl }}>
        <h1 style={{ fontSize: mdTheme.typography.headlineLarge.fontSize, fontWeight: 400, color: mdTheme.colors.onSurface, margin: 0, marginBottom: mdTheme.spacing.xs }}>
          Products
        </h1>
        <p style={{ fontSize: mdTheme.typography.bodyLarge.fontSize, color: mdTheme.colors.onSurfaceVariant, margin: 0 }}>
          {shop ? `Store: ${shop}` : "Store: —"}
        </p>
      </div>

      <MDCard elevation={1} padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mdTheme.spacing.md }}>
          <h2 style={{ fontSize: mdTheme.typography.titleLarge.fontSize, fontWeight: 500, margin: 0 }}>
            Catalog
          </h2>
          <span style={{ fontSize: mdTheme.typography.bodySmall.fontSize, color: mdTheme.colors.onSurfaceVariant }}>
            {loading ? "Loading…" : data?.ok ? `Last 30 days` : "—"}
          </span>
        </div>
        <div style={{ height: '1px', backgroundColor: mdTheme.colors.outlineVariant, marginBottom: mdTheme.spacing.md }} />
        {data && !data.ok ? (
          <p style={{ color: mdTheme.colors.error }}>
            {data.error || "Failed to load products"}
          </p>
        ) : (
          <MDDataTable columns={columns} rows={rows} />
        )}
        {!products.length && data?.ok && (
          <p style={{ fontSize: mdTheme.typography.bodySmall.fontSize, color: mdTheme.colors.onSurfaceVariant, marginTop: mdTheme.spacing.md }}>
            No products found. Install the app and run Sync.
          </p>
        )}
      </MDCard>
    </div>
  );
}
