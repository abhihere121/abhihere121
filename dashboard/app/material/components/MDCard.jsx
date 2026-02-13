import { useState } from 'react';
import { mdTheme } from '../theme';

export function MDCard({ children, elevation = 1, padding = 'lg', style, className = '', hoverEffect = false }) {
    const [isHovered, setIsHovered] = useState(false);

    const styles = {
        backgroundColor: mdTheme.colors.surface,
        borderRadius: mdTheme.shape.medium,
        boxShadow: isHovered && hoverEffect ? mdTheme.elevation[3] : mdTheme.elevation[elevation],
        padding: mdTheme.spacing[padding],
        transition: 'all 250ms cubic-bezier(0.2, 0, 0, 1)',
        transform: isHovered && hoverEffect ? 'translateY(-4px)' : 'none',
        ...style,
    };

    return (
        <div
            className={`md-card ${className}`}
            style={styles}
            onMouseEnter={() => hoverEffect && setIsHovered(true)}
            onMouseLeave={() => hoverEffect && setIsHovered(false)}
        >
            {children}
        </div>
    );
}

export function MDMetricCard({ title, value, subtitle, icon, tone = 'default' }) {
    const toneColors = {
        default: mdTheme.colors.onSurface,
        success: mdTheme.colors.success,
        error: mdTheme.colors.error,
        warning: mdTheme.colors.warning,
    };

    return (
        <MDCard elevation={1} padding="lg" hoverEffect={true}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: mdTheme.spacing.sm }}>
                <div style={{
                    fontSize: mdTheme.typography.labelLarge.fontSize,
                    color: mdTheme.colors.onSurfaceVariant,
                    fontWeight: mdTheme.typography.labelLarge.fontWeight,
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: mdTheme.typography.displaySmall.fontSize,
                    fontWeight: 700,
                    color: toneColors[tone],
                    lineHeight: mdTheme.typography.displaySmall.lineHeight,
                }}>
                    {value}
                </div>
                {subtitle && (
                    <div style={{
                        fontSize: mdTheme.typography.bodySmall.fontSize,
                        color: mdTheme.colors.onSurfaceVariant,
                    }}>
                        {subtitle}
                    </div>
                )}
            </div>
        </MDCard>
    );
}
