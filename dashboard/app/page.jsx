import { OverviewPage } from "./ui/OverviewPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OverviewPage />
    </Suspense>
  );
}
