"use client";

import { BlockStack, Card, Layout, Page, Text, TextField } from "@shopify/polaris";
import { useEffect, useState } from "react";

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

export function SettingsPage() {
  const [shop, setShop] = useLocalStorageState("ss_shop", "demo-store.myshopify.com");

  return (
    <Page title="Settings" subtitle="Store connection preferences">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd" tone="subdued">
                Set the Shopify store domain you installed this app on.
              </Text>
              <TextField
                label="Shop domain (*.myshopify.com)"
                value={shop}
                onChange={setShop}
                autoComplete="off"
              />
              <Text as="p" variant="bodySm" tone="subdued">
                Example: chatalytix.myshopify.com
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
