import { useState } from 'react';
import { mdTheme } from '../theme';

export function MDButton({
    children,
    variant = 'filled',
    onClick,
    disabled = false,
    href,
    size = 'medium',
    style,
    className = ''
}) {
    const [isHovered, setIsHovered] = useState(false);

    const baseStyles = {
        padding: size === 'small' ? '6px 16px' : size === 'large' ? '14px 28px' : '10px 24px',
        borderRadius: mdTheme.shape.full,
        border: 'none',
        fontSize: mdTheme.typography.labelLarge.fontSize,
        fontWeight: mdTheme.typography.labelLarge.fontWeight,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: mdTheme.spacing.sm,
        fontFamily: 'Roboto, sans-serif',
        opacity: disabled ? 0.38 : 1,
        transform: (!disabled && isHovered) ? 'translateY(-2px)' : 'none',
        ...style,
    };

    const variantStyles = {
        filled: {
            backgroundColor: disabled ? mdTheme.colors.onSurface + '1F' : (isHovered ? mdTheme.colors.tertiary : mdTheme.colors.primary),
            color: disabled ? mdTheme.colors.onSurface + '61' : mdTheme.colors.onPrimary,
            boxShadow: disabled ? 'none' : (isHovered ? mdTheme.elevation[2] : mdTheme.elevation[1]),
        },
        outlined: {
            backgroundColor: isHovered ? mdTheme.colors.primary + '0A' : 'transparent',
            color: disabled ? mdTheme.colors.onSurface + '61' : mdTheme.colors.primary,
            border: `1px solid ${disabled ? mdTheme.colors.onSurface + '1F' : mdTheme.colors.primary}`,
        },
        text: {
            backgroundColor: isHovered ? mdTheme.colors.primary + '0A' : 'transparent',
            color: disabled ? mdTheme.colors.onSurface + '61' : mdTheme.colors.primary,
            padding: size === 'small' ? '6px 12px' : size === 'large' ? '14px 24px' : '10px 12px',
        },
    };

    const combinedStyles = {
        ...baseStyles,
        ...variantStyles[variant],
    };

    const handleClick = (e) => {
        if (disabled) {
            e.preventDefault();
            return;
        }
        if (onClick) onClick(e);
    };

    const commonProps = {
        className: `md-button md-button-${variant} ${className}`,
        style: combinedStyles,
        onClick: handleClick,
        onMouseEnter: () => !disabled && setIsHovered(true),
        onMouseLeave: () => !disabled && setIsHovered(false),
    };

    if (href) {
        return (
            <a
                href={disabled ? undefined : href}
                {...commonProps}
                aria-disabled={disabled}
            >
                {children}
            </a>
        );
    }

    return (
        <button
            {...commonProps}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
