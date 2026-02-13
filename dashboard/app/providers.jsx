"use client";

import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { ShopProvider } from "./context/ShopContext";

export function Providers({ children }) {
  return (
    <AppProvider i18n={enTranslations}>
      <ShopProvider>
        {children}
      </ShopProvider>
    </AppProvider>
  );
}

