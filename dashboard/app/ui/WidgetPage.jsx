"use client";

import { BlockStack, Box, Button, Card, Checkbox, InlineGrid, InlineStack, Layout, Page, Select, Text, TextField } from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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

export function WidgetPage() {
  const [shop, setShop] = useLocalStorageState("ss_shop", "demo-store.myshopify.com");
  const [snippet, setSnippet] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
  const searchParams = useSearchParams();
  const shopFromUrl = searchParams.get("shop") || "";

  useEffect(() => {
    if (shopFromUrl && shopFromUrl !== shop) setShop(shopFromUrl);
  }, [shopFromUrl, shop, setShop]);

  const load = async () => {
    try {
      const s = await fetch(`${apiBase}/api/widget/snippet?shop=${encodeURIComponent(shop)}`, { cache: "no-store" }).then((r) =>
        r.json().catch(() => null)
      );
      setSnippet(s);
    } catch {
      setSnippet({ ok: false, error: "Failed to load snippet" });
    }
    try {
      const r = await fetch(`${apiBase}/api/widget/settings?shop=${encodeURIComponent(shop)}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      setSettings(j?.ok ? j.settings : null);
    } catch {
      setSettings(null);
    }
  };

  useEffect(() => {
    if (!shop) return;
    load();
  }, [shop]);

  const title = useMemo(() => `Widget — ${shop}`, [shop]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/widget/settings?shop=${encodeURIComponent(shop)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: Boolean(settings.enabled),
          placement: settings.placement,
          selector: settings.selector,
          primaryColor: settings.primary_color,
          headingText: settings.heading_text,
          buttonText: settings.button_text,
          consentText: settings.consent_text,
          customCss: settings.custom_css
        })
      });
      const json = await res.json().catch(() => null);
      if (json?.ok) setSettings(json.settings);
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      await fetch(`${apiBase}/api/dev/seed?shop=${encodeURIComponent(shop)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop })
      }).then((r) => r.json().catch(() => null));
      await load();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Page title={title} subtitle="Storefront widget + manual theme installation">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                <TextField label="Shop domain" value={shop} onChange={setShop} autoComplete="off" />
                <Box paddingBlockStart={{ xs: "0", md: "600" }}>
                  <Button onClick={load}>Refresh</Button>
                </Box>
              </InlineGrid>
              <Text as="p" variant="bodySm" tone="subdued">
                Automatic mode uses a Shopify ScriptTag (already created during install). Manual mode is for themes where you want to place the widget on the product page.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Widget Settings
              </Text>
              {settings ? (
                <BlockStack gap="300">
                  <Checkbox
                    label="Enable widget UI (still tracks events even if off)"
                    checked={Boolean(settings.enabled)}
                    onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
                  />
                  <Select
                    label="Placement"
                    options={[
                      { label: "Floating (bottom-right)", value: "floating" },
                      { label: "Inline (inside theme element)", value: "inline" }
                    ]}
                    value={settings.placement === "inline" ? "inline" : "floating"}
                    onChange={(v) => setSettings((s) => ({ ...s, placement: v }))}
                  />
                  <TextField
                    label="Inline selector (CSS selector)"
                    value={settings.selector || ""}
                    onChange={(v) => setSettings((s) => ({ ...s, selector: v }))}
                    helpText="Used only for inline mode. Default: #ss-embed-inline"
                    autoComplete="off"
                  />
                  <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                    <TextField
                      label="Primary color"
                      value={settings.primary_color || "#111827"}
                      onChange={(v) => setSettings((s) => ({ ...s, primary_color: v }))}
                      autoComplete="off"
                    />
                    <TextField
                      label="Button text"
                      value={settings.button_text || "Notify me"}
                      onChange={(v) => setSettings((s) => ({ ...s, button_text: v }))}
                      autoComplete="off"
                    />
                  </InlineGrid>
                  <TextField
                    label="Heading text"
                    value={settings.heading_text || ""}
                    onChange={(v) => setSettings((s) => ({ ...s, heading_text: v }))}
                    autoComplete="off"
                  />
                  <TextField
                    label="Consent text"
                    value={settings.consent_text || ""}
                    onChange={(v) => setSettings((s) => ({ ...s, consent_text: v }))}
                    autoComplete="off"
                  />
                  <TextField
                    label="Custom CSS (optional)"
                    value={settings.custom_css || ""}
                    onChange={(v) => setSettings((s) => ({ ...s, custom_css: v }))}
                    multiline={6}
                    autoComplete="off"
                  />
                  <InlineStack gap="200">
                    <Button onClick={save} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button onClick={seed} disabled={seeding} variant="secondary">
                      {seeding ? "Seeding…" : "Seed mock orders + demand"}
                    </Button>
                  </InlineStack>
                </BlockStack>
              ) : (
                <Text as="p" tone="subdued">
                  Install the app for this shop, then refresh.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Manual Theme Snippet
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Paste this into your product template where you want the widget (inline mode). For floating mode, you can paste only the script tag.
              </Text>
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {snippet?.ok ? snippet.manualInlineSnippet : "—"}
                </pre>
              </Box>
              {snippet?.ok ? (
                <InlineStack gap="200">
                  <Button
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(snippet.manualInlineSnippet);
                      } catch {}
                    }}
                  >
                    Copy snippet
                  </Button>
                </InlineStack>
              ) : null}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
