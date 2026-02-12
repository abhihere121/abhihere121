"use client";

import { Suspense } from "react";
import { ProductDetailsPage } from "../../ui/ProductDetailsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductDetailsPage />
    </Suspense>
  );
}
