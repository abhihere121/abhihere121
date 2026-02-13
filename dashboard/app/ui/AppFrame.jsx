"use client";

import { MDNavigationDrawer } from "../material";
import { usePathname } from "next/navigation";

export function AppFrame({ children }) {
  const pathname = usePathname() || "/";
  const navItems = [
    { label: "Home", url: "/" },
    { label: "Products", url: "/products" },
    { label: "Reports", url: "/reports" },
    { label: "Integrations", url: "/integrations" },
    { label: "Widget", url: "/widget" },
    { label: "Settings", url: "/settings" }
  ];

  return (
    <MDNavigationDrawer items={navItems}>
      {children}
    </MDNavigationDrawer>
  );
}
