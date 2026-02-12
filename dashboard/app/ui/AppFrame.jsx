"use client";

import { Frame, Navigation } from "@shopify/polaris";
import { usePathname } from "next/navigation";

export function AppFrame({ children }) {
  const pathname = usePathname() || "/";
  const basePath = "/app";
  const location = (typeof window !== "undefined" ? window.location.pathname : `${basePath}${pathname}`)
    .replace(/\/$/, "") || basePath;

  return (
    <Frame
      navigation={
        <Navigation location={location}>
          <Navigation.Section
            items={[
              { label: "Home", url: `${basePath}` },
              { label: "Products", url: `${basePath}/products` },
              { label: "Reports", url: `${basePath}/reports` },
              { label: "Widget", url: `${basePath}/widget` },
              { label: "Settings", url: `${basePath}/settings` }
            ]}
          />
        </Navigation>
      }
    >
      {children}
    </Frame>
  );
}
