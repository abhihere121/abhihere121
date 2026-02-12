"use client";

import { Suspense } from "react";
import { SettingsPage } from "../ui/SettingsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
