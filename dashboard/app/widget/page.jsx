import { WidgetPage } from "../ui/WidgetPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WidgetPage />
    </Suspense>
  );
}
