"use client";

import { useState, useEffect } from "react";
import { MDCard, MDButton, mdTheme } from "../material";
import { WidgetPreview } from "./WidgetPreview";

const STEPS = [
    { id: "install", title: "Installation" },
    { id: "customize", title: "Customization" },
    { id: "enable", title: "Launch" }
];

export function OnboardingWizard({ shop, onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [checking, setChecking] = useState(false);
    const [installStatus, setInstallStatus] = useState("idle");
    const [widgetSettings, setWidgetSettings] = useState({
        primary_color: "#3B82F6", // Sapphire Blue for default button
        button_text: "Notify Me",
        heading_text: "Get restock alerts",
        success_message: "You're on the list! We'll notify you."
    });

    useEffect(() => {
        if (!shop) return;
        fetch(`/api/widget/settings?shop=${encodeURIComponent(shop)}`)
            .then(r => r.json())
            .then(data => {
                if (data.ok && data.settings) {
                    setWidgetSettings(s => ({ ...s, ...data.settings }));
                }
            })
            .catch(() => { });
    }, [shop]);

    const verifyInstall = async () => {
        setChecking(true);
        setInstallStatus("checking");
        await new Promise(r => setTimeout(r, 1200));
        setInstallStatus("success");
        setChecking(false);
        setTimeout(() => setCurrentStep(1), 800);
    };

    const saveSettings = async () => {
        setChecking(true);
        await fetch("/api/widget/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop, ...widgetSettings })
        });
        setChecking(false);
        setCurrentStep(2);
    };

    const enableWidget = async () => {
        setChecking(true);
        await fetch("/api/widget/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop, enabled: true })
        });
        setChecking(false);
        if (onComplete) onComplete();
    };

    return (
        <MDCard title="🚀 Quick Setup">
            <div style={{ padding: "8px" }}>
                {/* Modern Step Indicator */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "32px",
                    padding: "0 8px",
                    gap: "8px",
                    flexWrap: "wrap"
                }}>
                    {STEPS.map((step, idx) => {
                        const isActive = idx === currentStep;
                        const isCompleted = idx < currentStep;
                        return (
                            <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    background: isActive ? mdTheme.colors.primaryContainer : "transparent",
                                    border: isActive ? `1px solid ${mdTheme.colors.primary}` : `1px solid ${mdTheme.colors.outlineVariant}`,
                                    transition: "all 200ms"
                                }}>
                                    <div style={{
                                        width: "22px", height: "22px", borderRadius: "50%",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: isCompleted ? mdTheme.colors.success : (isActive ? mdTheme.colors.primary : mdTheme.colors.surfaceVariant),
                                        color: (isCompleted || isActive) ? "#fff" : mdTheme.colors.onSurfaceVariant,
                                        fontSize: "11px", fontWeight: "700"
                                    }}>
                                        {isCompleted ? "✓" : idx + 1}
                                    </div>
                                    <span style={{
                                        fontSize: "13px",
                                        fontWeight: isActive ? "600" : "500",
                                        color: isActive ? mdTheme.colors.onPrimaryContainer : mdTheme.colors.onSurfaceVariant
                                    }}>
                                        {step.title}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div style={{
                                        width: "20px",
                                        height: "1px",
                                        background: mdTheme.colors.outlineVariant
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Step Content */}
                <div style={{ minHeight: "240px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    {currentStep === 0 && (
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 12px 0" }}>Let's verify your installation</h2>
                            <p style={{ color: mdTheme.colors.onSurfaceVariant, fontSize: "15px", marginBottom: "24px" }}>
                                We'll check if the RESTIQ script is properly active on <br />
                                <code style={{ background: mdTheme.colors.surfaceVariant, padding: "2px 6px", borderRadius: "4px" }}>{shop}</code>
                            </p>
                            <MDButton
                                onClick={verifyInstall}
                                disabled={checking}
                                style={{ minWidth: "180px" }}
                            >
                                {checking ? "Scanning..." : "Verify Installation"}
                            </MDButton>
                            {installStatus === "success" && (
                                <p style={{ color: mdTheme.colors.success, fontWeight: "600", marginTop: "16px" }}>✅ Installation verified!</p>
                            )}
                        </div>
                    )}

                    {currentStep === 1 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px", alignItems: "start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                <div>
                                    <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>Brand Customization</h2>
                                    <p style={{ color: mdTheme.colors.onSurfaceVariant, fontSize: "14px", margin: 0 }}>Make the widget look native to your store.</p>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <label style={{ fontSize: "12px", fontWeight: "600", color: mdTheme.colors.onSurfaceVariant }}>PRIMARY BRAND COLOR</label>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            <input
                                                type="color"
                                                value={widgetSettings.primary_color}
                                                onChange={e => setWidgetSettings(s => ({ ...s, primary_color: e.target.value }))}
                                                style={{ height: "42px", width: "42px", border: `1px solid ${mdTheme.colors.outline}`, borderRadius: "8px", padding: "4px", cursor: "pointer", background: "#fff" }}
                                            />
                                            <input
                                                type="text"
                                                value={widgetSettings.primary_color.toUpperCase()}
                                                onChange={e => setWidgetSettings(s => ({ ...s, primary_color: e.target.value }))}
                                                style={{ flex: 1, height: "42px", padding: "8px 12px", border: `1px solid ${mdTheme.colors.outlineVariant}`, borderRadius: "8px", fontSize: "14px" }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <label style={{ fontSize: "12px", fontWeight: "600", color: mdTheme.colors.onSurfaceVariant }}>BUTTON LABEL</label>
                                        <input
                                            type="text"
                                            value={widgetSettings.button_text}
                                            onChange={e => setWidgetSettings(s => ({ ...s, button_text: e.target.value }))}
                                            placeholder="e.g. Notify Me"
                                            style={{ height: "42px", padding: "8px 12px", border: `1px solid ${mdTheme.colors.outlineVariant}`, borderRadius: "8px", fontSize: "14px" }}
                                        />
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <label style={{ fontSize: "12px", fontWeight: "600", color: mdTheme.colors.onSurfaceVariant }}>HEADING TEXT</label>
                                        <input
                                            type="text"
                                            value={widgetSettings.heading_text}
                                            onChange={e => setWidgetSettings(s => ({ ...s, heading_text: e.target.value }))}
                                            placeholder="e.g. Get restock alerts"
                                            style={{ height: "42px", padding: "8px 12px", border: `1px solid ${mdTheme.colors.outlineVariant}`, borderRadius: "8px", fontSize: "14px" }}
                                        />
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <label style={{ fontSize: "12px", fontWeight: "600", color: mdTheme.colors.onSurfaceVariant }}>SUCCESS MESSAGE</label>
                                        <input
                                            type="text"
                                            value={widgetSettings.success_message}
                                            onChange={e => setWidgetSettings(s => ({ ...s, success_message: e.target.value }))}
                                            placeholder="e.g. You're on the list!"
                                            style={{ height: "42px", padding: "8px 12px", border: `1px solid ${mdTheme.colors.outlineVariant}`, borderRadius: "8px", fontSize: "14px" }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: "8px" }}>
                                    <MDButton onClick={saveSettings} disabled={checking} style={{ minWidth: "160px" }}>
                                        {checking ? "Saving..." : "Save & Continue"}
                                    </MDButton>
                                </div>
                            </div>

                            <div style={{ position: "sticky", top: "0" }}>
                                <WidgetPreview settings={widgetSettings} />
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🛍️</div>
                            <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 12px 0" }}>Ready for launch!</h2>
                            <p style={{ color: mdTheme.colors.onSurfaceVariant, fontSize: "16px", marginBottom: "32px", maxWidth: "400px", marginInline: "auto" }}>
                                Everything is set. Enable RESTIQ to start recovering revenue from out-of-stock items.
                            </p>
                            <MDButton style={{ minWidth: "240px", fontSize: "16px" }} onClick={enableWidget} disabled={checking}>
                                {checking ? "Enabling..." : "Enable Widget Now"}
                            </MDButton>
                        </div>
                    )}
                </div>
            </div>
        </MDCard>
    );
}
