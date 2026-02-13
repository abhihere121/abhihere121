"use client";

import {
  MDCard,
  MDMetricCard,
  MDButton,
  MDChip,
  MDDataTable,
  mdTheme
} from "../material";
import { OnboardingWizard } from "./OnboardingWizard";
import { EmptyState } from "./EmptyState";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clamp, formatRsFromPaise } from "./format";
import { exportToCSV } from "./export";

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(raw);
    } catch { }
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch { }
  }, [key, value]);
  return [value, setValue];
}

function BarChart({ rows }) {
  const max = rows.reduce((m, r) => Math.max(m, r.demandCount), 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: mdTheme.spacing.sm }}>
      {rows.map((r) => {
        const w = clamp(Math.round((r.demandCount / max) * 100), 3, 100);
        return (
          <div key={`${r.productTitle}-${r.size}`} style={{ padding: mdTheme.spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: mdTheme.spacing.sm, marginBottom: mdTheme.spacing.sm }}>
              <span style={{ fontWeight: 500, fontSize: mdTheme.typography.bodyMedium.fontSize }}>
                {r.productTitle} · {r.size}
              </span>
              <span style={{ fontSize: mdTheme.typography.bodyMedium.fontSize, color: mdTheme.colors.onSurfaceVariant }}>
                {r.demandCount} demand · ₹{formatRsFromPaise(r.missedRevenuePaise)}
              </span>
            </div>
            <div style={{ height: 10, background: mdTheme.colors.surfaceVariant, borderRadius: mdTheme.shape.full }}>
              <div
                style={{
                  width: `${w}%`,
                  height: 10,
                  background: r.demandCount >= 200 ? mdTheme.colors.error : r.demandCount >= 80 ? mdTheme.colors.warning : mdTheme.colors.success,
                  borderRadius: mdTheme.shape.full
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
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
  const basePath = "/app";
  const searchParams = useSearchParams();
  const shopFromUrl = searchParams.get("shop") || "";

  useEffect(() => {
    if (shopFromUrl && shopFromUrl !== shop) setShop(shopFromUrl);
  }, [shopFromUrl, shop, setShop]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      try {
        const [statusRes, dataRes] = await Promise.all([
          fetch(`${apiBase}/api/store/status?shop=${encodeURIComponent(shop)}`, { signal: controller.signal, cache: "no-store" }),
          fetch(`${apiBase}/api/dashboard/overview?shop=${encodeURIComponent(shop)}`, { signal: controller.signal, cache: "no-store" })
        ]);

        const statusJson = await statusRes.json().catch(() => null);
        const dataJson = await dataRes.json().catch(() => null);

        if (!cancelled) {
          if (statusJson) setStatus(statusJson);
          if (dataJson) setData(dataJson);
        }
      } catch (e) {
        if (!cancelled) {
          setStatus({ ok: false, error: "Connection failed. Please check your shop domain." });
          setData({ ok: false, error: e.name === 'AbortError' ? "Request timed out" : String(e) });
        }
      } finally {
        clearTimeout(timeoutId);
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
  const inventory = data?.ok ? data.inventory : null;
  const demandRows = data?.ok ? data.demandByVariant || [] : [];
  const highRiskRows = data?.ok ? data.highRisk || [] : [];
  const restockSuggestionsByVendor = data?.ok ? data.restockSuggestionsByVendor || [] : [];

  const fmtTs = (iso) => {
    const v = String(iso || "");
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  const tableColumns = [
    { header: "Product", align: "left" },
    { header: "Vendor", align: "left" },
    { header: "Variant", align: "left" },
    { header: "Demand", align: "right" },
    { header: "Missed Revenue", align: "right" },
    { header: "Available", align: "right" },
    { header: "Last Inventory", align: "left" },
    { header: "Suggested Units", align: "right" },
    { header: "", align: "center" }
  ];

  const tableRows = highRiskRows.map((r) => [
    <MDButton
      key={`${r.productHandle || r.productTitle}-${r.size || ""}`}
      href={`${basePath}/products/${encodeURIComponent(r.productHandle || "")}?shop=${encodeURIComponent(shop)}`}
      variant="text"
    >
      {r.productTitle}
    </MDButton>,
    r.vendor || "—",
    r.size ? `Size ${r.size}` : "—",
    String(r.demandCount),
    `₹${formatRsFromPaise(r.missedRevenuePaise)}`,
    String(Number.isFinite(Number(r.availableUnits)) ? r.availableUnits : 0),
    fmtTs(r.lastInventoryUpdatedAt),
    String(Number.isFinite(Number(r.suggestedUnits)) ? r.suggestedUnits : Math.max(0, Math.round((r.demandCount || 0) * 0.35))),
    <MDButton
      key={`view-${r.productHandle || r.productTitle}-${r.size || ""}`}
      href={`${basePath}/products/${encodeURIComponent(r.productHandle || "")}?shop=${encodeURIComponent(shop)}`}
      variant="outlined"
      size="small"
    >
      View
    </MDButton>
  ]);

  const installed = Boolean(status?.ok && status?.installed);
  const installUrl = `${apiBase}/auth?shop=${encodeURIComponent(shop)}`;
  const counts = status?.ok && status?.counts ? status.counts : null;
  const widgetEnabled = Boolean(status?.ok && status?.widget?.enabled);
  const freshness = status?.ok ? status.freshness || null : null;
  const hasProducts = Boolean(counts?.products_count && Number(counts.products_count) > 0);

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
    <div style={{ padding: mdTheme.spacing.xl, maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: mdTheme.spacing.xl }}>
        <h1 style={{
          fontSize: mdTheme.typography.headlineLarge.fontSize,
          fontWeight: mdTheme.typography.headlineLarge.fontWeight,
          color: mdTheme.colors.onSurface,
          margin: 0,
          marginBottom: mdTheme.spacing.xs
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: mdTheme.typography.bodyLarge.fontSize,
          color: mdTheme.colors.onSurfaceVariant,
          margin: 0
        }}>
          Revenue-first. Actionable. Founder-speed.
        </p>
      </div>

      {/* Get Started + Store Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: mdTheme.spacing.lg, marginBottom: mdTheme.spacing.xl }}>
        <OnboardingWizard shop={shop} onComplete={() => setRefreshNonce(n => n + 1)} />

        <MDCard elevation={1} padding="lg">
          <h2 style={{ fontSize: mdTheme.typography.titleLarge.fontSize, fontWeight: 500, margin: 0, marginBottom: mdTheme.spacing.md }}>
            Store status
          </h2>
          <div style={{ height: '1px', backgroundColor: mdTheme.colors.outlineVariant, margin: `${mdTheme.spacing.md} 0` }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: mdTheme.spacing.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>Shopify store</span>
              <MDButton href={`${basePath}/settings`} variant="text" size="small">Edit</MDButton>
            </div>
            <p style={{ margin: 0 }}>{shop || "—"}</p>

            <div style={{ display: 'flex', gap: mdTheme.spacing.sm }}>
              <MDChip tone={installed ? "success" : "error"} size="small">
                {installed ? "Installed" : "Not installed"}
              </MDChip>
              <MDChip tone={widgetEnabled ? "success" : "warning"} size="small">
                {widgetEnabled ? "Widget on" : "Widget off"}
              </MDChip>
            </div>

            {counts && (
              <p style={{ fontSize: mdTheme.typography.bodySmall.fontSize, color: mdTheme.colors.onSurfaceVariant, margin: 0 }}>
                {counts.products_count} products · {counts.variants_count} variants · {counts.demand_events_count} events
              </p>
            )}

            <div style={{ height: '1px', backgroundColor: mdTheme.colors.outlineVariant }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: mdTheme.typography.bodySmall.fontSize }}>
              <span style={{ color: mdTheme.colors.onSurfaceVariant }}>Inventory last update</span>
              <span>{fmtTs(freshness?.lastInventoryUpdatedAt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: mdTheme.typography.bodySmall.fontSize }}>
              <span style={{ color: mdTheme.colors.onSurfaceVariant }}>Webhook last received</span>
              <span>{fmtTs(freshness?.lastWebhookReceivedAt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: mdTheme.typography.bodySmall.fontSize }}>
              <span style={{ color: mdTheme.colors.onSurfaceVariant }}>Products last updated</span>
              <span>{fmtTs(freshness?.lastProductsUpdatedAt)}</span>
            </div>

            <p style={{ fontSize: mdTheme.typography.bodySmall.fontSize, color: mdTheme.colors.onSurfaceVariant, margin: 0, paddingTop: mdTheme.spacing.sm }}>
              Status: {loading ? "Loading…" : installed ? "Ready" : "Action required"}
            </p>
          </div>
        </MDCard>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: mdTheme.spacing.lg, marginBottom: mdTheme.spacing.xl }}>
        <MDMetricCard
          title="₹ Recovered Revenue"
          value={kpis ? `₹${formatRsFromPaise(kpis.recoveredRevenuePaise)}` : "—"}
          subtitle="Sales attributed to restock alerts."
          tone="success"
        />
        <MDMetricCard
          title="Customers Waiting"
          value={kpis ? String(kpis.customersWaiting) : "—"}
          subtitle="Auto-notified on restock."
        />
        <MDMetricCard
          title="₹ Missed Revenue"
          value={kpis ? `₹${formatRsFromPaise(kpis.missedRevenuePaise)}` : "—"}
          subtitle="Value of OOS visit demand."
          tone="error"
        />
        <MDMetricCard
          title="Total Inventory"
          value={inventory ? String(inventory.totalUnits || 0) : "—"}
          subtitle={inventory?.lastInventoryUpdatedAt ? `Last update: ${fmtTs(inventory.lastInventoryUpdatedAt)}` : "Last update: —"}
        />
      </div>

      {/* Demand by Variant */}
      <MDCard elevation={1} padding="lg" style={{ marginBottom: mdTheme.spacing.xl }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mdTheme.spacing.md }}>
          <h2 style={{ fontSize: mdTheme.typography.titleLarge.fontSize, fontWeight: 500, margin: 0 }}>
            Demand by Variant
          </h2>
          <MDButton
            variant="text"
            size="small"
            onClick={() => exportToCSV(`restiq-demand-${shop}-${new Date().toISOString().split('T')[0]}.csv`, demandRows)}
            disabled={!demandRows.length}
          >
            Export CSV
          </MDButton>
        </div>
        <div style={{ height: '1px', backgroundColor: mdTheme.colors.outlineVariant, marginBottom: mdTheme.spacing.md }} />
        {demandRows.length ? (
          <BarChart rows={demandRows} />
        ) : (
          <EmptyState
            title="No demand captured yet"
            message="We haven't seen any customers click 'Notify Me' yet. Try keeping some products out of stock to test."
            icon="📉"
            actionLabel="Verify on Demo Store"
            onAction={() => window.open(`${apiBase}/demo`, '_blank')}
          />
        )}
      </MDCard>

      {/* Highlighted Products Table */}
      <MDCard elevation={1} padding="lg" style={{ marginBottom: mdTheme.spacing.xl }}>
        <h2 style={{ fontSize: mdTheme.typography.titleLarge.fontSize, fontWeight: 500, margin: 0, marginBottom: mdTheme.spacing.md }}>
          Highlighted Products
        </h2>
        <div style={{ height: '1px', backgroundColor: mdTheme.colors.outlineVariant, marginBottom: mdTheme.spacing.md }} />
        <MDDataTable columns={tableColumns} rows={tableRows} />
      </MDCard>

      {/* Restock Suggestions */}
      {restockSuggestionsByVendor.length > 0 && (
        <MDCard elevation={1} padding="lg">
          <h2 style={{ fontSize: mdTheme.typography.titleLarge.fontSize, fontWeight: 500, margin: 0, marginBottom: mdTheme.spacing.md }}>
            Restock Suggestions
          </h2>
          <div style={{ height: '1px', backgroundColor: mdTheme.colors.outlineVariant, marginBottom: mdTheme.spacing.md }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: mdTheme.spacing.xl }}>
            {restockSuggestionsByVendor.map((g) => (
              <div key={g.vendor}>
                <h3 style={{ fontSize: mdTheme.typography.titleMedium.fontSize, fontWeight: 500, margin: 0, marginBottom: mdTheme.spacing.md }}>
                  {g.vendor}
                </h3>
                <MDDataTable
                  columns={[
                    { header: "Product", align: "left" },
                    { header: "Variant", align: "left" },
                    { header: "Demand", align: "right" },
                    { header: "Suggested Units", align: "right" },
                    { header: "Last Inventory", align: "left" }
                  ]}
                  rows={(g.items || []).map((it) => [
                    <MDButton
                      key={`${g.vendor}-${it.productHandle || it.productTitle}-${it.size || ""}`}
                      href={`${basePath}/products/${encodeURIComponent(it.productHandle || "")}?shop=${encodeURIComponent(shop)}`}
                      variant="text"
                    >
                      {it.productTitle}
                    </MDButton>,
                    it.size ? `Size ${it.size}` : "—",
                    String(it.demandCount || 0),
                    String(it.suggestedUnits || 0),
                    fmtTs(it.lastInventoryUpdatedAt)
                  ])}
                />
              </div>
            ))}
          </div>
        </MDCard>
      )}
    </div>
  );
}
