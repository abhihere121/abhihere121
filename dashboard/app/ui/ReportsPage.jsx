"use client";

import { MDCard, MDButton, MDDataTable, mdTheme } from "../material";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatRsFromPaise } from "./format";

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

  const columns = [
    { header: "Product", align: "left" },
    { header: "Variant", align: "left" },
    { header: "OOS Visits", align: "right" },
    { header: "Notify", align: "right" },
    { header: "Missed Revenue", align: "right" }
  ];

  const tableRows = rows.map((r) => [
    r.productTitle,
    `Size ${r.size || "—"}`,
    String(r.oosVisits),
    String(r.notifyIntents),
    `₹${formatRsFromPaise(r.missedRevenuePaise)}`
  ]);

  const total = data?.ok ? data.totalMissedRevenuePaise : null;

  return (
    <div style={{ padding: mdTheme.spacing.xl, maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: mdTheme.spacing.xl }}>
        <h1 style={{ fontSize: mdTheme.typography.headlineLarge.fontSize, fontWeight: 400, color: mdTheme.colors.onSurface, margin: 0, marginBottom: mdTheme.spacing.xs }}>
          {title}
        </h1>
        <p style={{ fontSize: mdTheme.typography.bodyLarge.fontSize, color: mdTheme.colors.onSurfaceVariant, margin: 0 }}>
          Weekly missed revenue + demand breakdown
        </p>
      </div>

      <MDCard elevation={1} padding="lg" style={{ marginBottom: mdTheme.spacing.lg }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: mdTheme.spacing.md, marginBottom: mdTheme.spacing.md }}>
          <div>
            <label style={{ display: 'block', fontSize: mdTheme.typography.labelSmall.fontSize, marginBottom: mdTheme.spacing.xs, color: mdTheme.colors.onSurfaceVariant }}>Shop domain</label>
            <input
              type="text"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${mdTheme.colors.outline}`,
                borderRadius: mdTheme.shape.extraSmall,
                fontSize: mdTheme.typography.bodyMedium.fontSize,
                fontFamily: 'Roboto, sans-serif'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: mdTheme.typography.labelSmall.fontSize, marginBottom: mdTheme.spacing.xs, color: mdTheme.colors.onSurfaceVariant }}>From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${mdTheme.colors.outline}`,
                borderRadius: mdTheme.shape.extraSmall,
                fontSize: mdTheme.typography.bodyMedium.fontSize,
                fontFamily: 'Roboto, sans-serif'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: mdTheme.typography.labelSmall.fontSize, marginBottom: mdTheme.spacing.xs, color: mdTheme.colors.onSurfaceVariant }}>To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${mdTheme.colors.outline}`,
                borderRadius: mdTheme.shape.extraSmall,
                fontSize: mdTheme.typography.bodyMedium.fontSize,
                fontFamily: 'Roboto, sans-serif'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <MDButton onClick={fetchReport} disabled={loading} variant="filled">
              {loading ? "Loading…" : "Refresh"}
            </MDButton>
          </div>
        </div>
        <div style={{ display: 'flex', gap: mdTheme.spacing.md, alignItems: 'center' }}>
          <span style={{ fontSize: mdTheme.typography.bodyMedium.fontSize }}>
            Total missed: {total !== null ? `₹${formatRsFromPaise(total)}` : "—"}
          </span>
          {data?.ok ? null : (
            <span style={{ fontSize: mdTheme.typography.bodySmall.fontSize, color: mdTheme.colors.error }}>
              {data?.error || "Unable to load report."}
            </span>
          )}
        </div>
      </MDCard>

      <MDCard elevation={1} padding="lg" style={{ marginBottom: mdTheme.spacing.lg }}>
        <h2 style={{ fontSize: mdTheme.typography.titleMedium.fontSize, fontWeight: 500, margin: 0, marginBottom: mdTheme.spacing.md }}>
          Founder Message Preview
        </h2>
        <div style={{ padding: mdTheme.spacing.md, backgroundColor: mdTheme.colors.surfaceVariant, borderRadius: mdTheme.shape.small }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: 'monospace', fontSize: mdTheme.typography.bodySmall.fontSize }}>
            {data?.ok ? data.message : "—"}
          </pre>
        </div>
      </MDCard>

      <MDCard elevation={1} padding="lg">
        <h2 style={{ fontSize: mdTheme.typography.titleLarge.fontSize, fontWeight: 500, margin: 0, marginBottom: mdTheme.spacing.md }}>
          Top Variants (Weekly)
        </h2>
        <div style={{ height: '1px', backgroundColor: mdTheme.colors.outlineVariant, marginBottom: mdTheme.spacing.md }} />
        <MDDataTable columns={columns} rows={tableRows} />
      </MDCard>
    </div>
  );
}
