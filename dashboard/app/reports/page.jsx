import { ReportsPage } from "../ui/ReportsPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReportsPage />
    </Suspense>
  );
}
