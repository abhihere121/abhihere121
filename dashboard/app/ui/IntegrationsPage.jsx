"use client";

import { MDCard, MDButton, mdTheme, MDChip } from "../material";
import { useState } from "react";

export function IntegrationsPage() {
    const [integrations, setIntegrations] = useState([
        {
            id: "whatsapp",
            name: "WhatsApp Business",
            description: "Direct alerts to customer phones.",
            status: "connected",
            icon: "📱",
            color: "#25D366"
        },
        {
            id: "klaviyo",
            name: "Klaviyo",
            description: "Sync waitlists to email segments.",
            status: "disconnected",
            icon: "✉️",
            color: "#111827"
        },
        {
            id: "smtp",
            name: "Custom Email (SMTP)",
            description: "Send alerts from your own domain.",
            status: "disconnected",
            icon: "💻",
            color: "#3B82F6"
        }
    ]);

    const toggleIntegration = (id) => {
        setIntegrations(prev => prev.map(int =>
            int.id === id
                ? { ...int, status: int.status === "connected" ? "disconnected" : "connected" }
                : int
        ));
    };

    const containerStyle = {
        padding: "32px",
        width: "100%",
        boxSizing: "border-box",
        margin: "0",
        display: "flex",
        flexDirection: "column",
        gap: "32px"
    };

    const gridStyle = {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px"
    };

    const cardHeaderStyle = {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px"
    };

    const iconStyle = (color) => ({
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        background: `${color}1A`, // 10% opacity
        color: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        marginBottom: "16px"
    });

    return (
        <div style={containerStyle}>
            <div>
                <h1 style={{ ...mdTheme.typography.headlineMedium, color: mdTheme.colors.onSurface, marginBottom: "8px" }}>
                    Growth Integrations
                </h1>
                <p style={{ ...mdTheme.typography.bodyLarge, color: mdTheme.colors.onSurfaceVariant }}>
                    Connect RESTIQ to your favorite marketing tools to recover more revenue.
                </p>
            </div>

            <div style={gridStyle}>
                {integrations.map((int) => (
                    <MDCard key={int.id} hoverEffect padding="lg">
                        <div style={iconStyle(int.color)}>
                            {int.icon}
                        </div>
                        <div style={cardHeaderStyle}>
                            <h3 style={{ ...mdTheme.typography.titleMedium, margin: 0 }}>{int.name}</h3>
                            <MDChip
                                label={int.status.toUpperCase()}
                                variant={int.status === "connected" ? "success" : "assist"}
                            />
                        </div>
                        <p style={{ ...mdTheme.typography.bodyMedium, color: mdTheme.colors.onSurfaceVariant, marginBottom: "24px", minHeight: "40px" }}>
                            {int.description}
                        </p>
                        <MDButton
                            variant={int.status === "connected" ? "outlined" : "filled"}
                            onClick={() => toggleIntegration(int.id)}
                            style={{ width: "100%" }}
                        >
                            {int.status === "connected" ? "Disconnect" : "Connect Now"}
                        </MDButton>
                    </MDCard>
                ))}
            </div>

            <MDCard padding="lg">
                <h3 style={{ ...mdTheme.typography.titleMedium, marginBottom: "16px" }}>Integration Logs</h3>
                <div style={{ background: mdTheme.colors.surfaceVariant, borderRadius: "8px", padding: "16px", fontFamily: "monospace", fontSize: "12px", color: mdTheme.colors.onSurfaceVariant }}>
                    [INFO] {new Date().toISOString()} - Klaviyo segment "Out of Stock Demand" synced (mock).<br />
                    [INFO] {new Date().toISOString()} - WhatsApp status check: OK (Twilio provider active).<br />
                    [INFO] {new Date().toISOString()} - Test email sent to dev@example.com: Completed.
                </div>
            </MDCard>
        </div>
    );
}
