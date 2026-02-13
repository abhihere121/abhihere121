import { IntegrationsPage } from "../../ui/IntegrationsPage";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={null}>
            <IntegrationsPage />
        </Suspense>
    );
}
