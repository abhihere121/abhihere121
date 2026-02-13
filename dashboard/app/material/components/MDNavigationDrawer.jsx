'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mdTheme } from '../theme';

export function MDNavigationDrawer({ items = [], children }) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(true);

    const drawerStyle = {
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: isOpen ? '260px' : '0',
        backgroundColor: mdTheme.colors.surfaceVariant,
        boxShadow: mdTheme.elevation[1],
        transition: 'all 300ms cubic-bezier(0.2, 0, 0, 1)',
        overflow: 'hidden',
        zIndex: 100,
        borderRight: `1px solid ${mdTheme.colors.outlineVariant}`,
    };

    const contentStyle = {
        marginLeft: isOpen ? '260px' : '0',
        transition: 'all 300ms cubic-bezier(0.2, 0, 0, 1)',
        minHeight: '100vh',
        width: isOpen ? 'calc(100% - 260px)' : '100%',
        backgroundColor: mdTheme.colors.surface,
    };

    const navItemStyle = (isActive) => ({
        display: 'block',
        padding: `${mdTheme.spacing.md} ${mdTheme.spacing.lg}`,
        textDecoration: 'none',
        color: isActive ? mdTheme.colors.onSecondaryContainer : mdTheme.colors.onSurfaceVariant,
        backgroundColor: isActive ? mdTheme.colors.secondaryContainer : 'transparent',
        fontSize: mdTheme.typography.labelLarge.fontSize,
        fontWeight: mdTheme.typography.labelLarge.fontWeight,
        borderRadius: mdTheme.shape.full,
        margin: `${mdTheme.spacing.xs} ${mdTheme.spacing.md}`,
        transition: 'all 200ms ease',
        fontFamily: 'Inter, Roboto, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: mdTheme.spacing.md,
    });

    return (
        <>
            <div style={drawerStyle}>
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: `1px solid ${mdTheme.colors.outlineVariant}` }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: mdTheme.colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: mdTheme.elevation[2]
                    }}>
                        <span style={{ color: mdTheme.colors.onPrimary, fontWeight: 'bold', fontSize: '20px' }}>R</span>
                    </div>
                    <span style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '0.5px', color: mdTheme.colors.onSurfaceVariant }}>RESTIQ</span>
                </div>
                <nav style={{ padding: `${mdTheme.spacing.md} 0` }}>
                    {items.map((item, idx) => {
                        const isActive = pathname === item.url || pathname?.startsWith(item.url + '/');
                        return (
                            <Link
                                key={idx}
                                href={item.url}
                                style={navItemStyle(isActive)}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = mdTheme.colors.primaryContainer;
                                        e.currentTarget.style.color = mdTheme.colors.onPrimaryContainer;
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = mdTheme.colors.onSurfaceVariant;
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }
                                }}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div style={contentStyle}>
                {children}
            </div>
        </>
    );
}
