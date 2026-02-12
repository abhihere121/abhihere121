"use client";

import { Suspense } from "react";
import { ProductsPage } from "../ui/ProductsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductsPage />
    </Suspense>
  );
}
