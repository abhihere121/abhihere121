"use client";

import { mdTheme, MDButton } from "../material";

export function EmptyState({ title, message, actionLabel, onAction, icon }) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: mdTheme.spacing.xxl,
            textAlign: "center",
            background: mdTheme.colors.surface,
            borderRadius: mdTheme.shape.medium,
            border: `1px dashed ${mdTheme.colors.outlineVariant}`
        }}>
            <div style={{ fontSize: 48, marginBottom: mdTheme.spacing.md }}>
                {icon || "🕸️"}
            </div>
            <h3 style={{
                fontSize: mdTheme.typography.titleLarge.fontSize,
                fontWeight: 500,
                margin: 0,
                marginBottom: mdTheme.spacing.sm,
                color: mdTheme.colors.onSurface
            }}>
                {title}
            </h3>
            <p style={{
                fontSize: mdTheme.typography.bodyMedium.fontSize,
                color: mdTheme.colors.onSurfaceVariant,
                maxWidth: 400,
                marginBottom: mdTheme.spacing.lg
            }}>
                {message}
            </p>
            {actionLabel && (
                <MDButton onClick={onAction}>
                    {actionLabel}
                </MDButton>
            )}
        </div>
    );
}
