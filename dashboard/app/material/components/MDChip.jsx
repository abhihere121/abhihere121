import { mdTheme } from '../theme';

export function MDChip({ children, tone = 'default', size = 'medium', style, className = '' }) {
    const toneStyles = {
        default: {
            backgroundColor: mdTheme.colors.surfaceVariant,
            color: mdTheme.colors.onSurfaceVariant,
        },
        success: {
            backgroundColor: mdTheme.colors.successContainer,
            color: mdTheme.colors.onSuccessContainer,
        },
        error: {
            backgroundColor: mdTheme.colors.errorContainer,
            color: mdTheme.colors.onErrorContainer,
        },
        warning: {
            backgroundColor: mdTheme.colors.warningContainer,
            color: mdTheme.colors.onWarningContainer,
        },
        info: {
            backgroundColor: mdTheme.colors.primaryContainer,
            color: mdTheme.colors.onPrimaryContainer,
        },
        critical: {
            backgroundColor: mdTheme.colors.errorContainer,
            color: mdTheme.colors.onErrorContainer,
        },
        attention: {
            backgroundColor: mdTheme.colors.warningContainer,
            color: mdTheme.colors.onWarningContainer,
        },
        subdued: {
            backgroundColor: mdTheme.colors.surfaceVariant,
            color: mdTheme.colors.onSurfaceVariant,
        },
    };

    const baseStyles = {
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'small' ? '4px 12px' : '6px 16px',
        borderRadius: mdTheme.shape.small,
        fontSize: size === 'small' ? mdTheme.typography.labelSmall.fontSize : mdTheme.typography.labelLarge.fontSize,
        fontWeight: mdTheme.typography.labelLarge.fontWeight,
        fontFamily: 'Roboto, sans-serif',
        ...toneStyles[tone],
        ...style,
    };

    return (
        <span className={`md-chip md-chip-${tone} ${className}`} style={baseStyles}>
            {children}
        </span>
    );
}
