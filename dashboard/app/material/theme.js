// Material Design 3 Theme Configuration (Midnight Sapphire)
export const mdTheme = {
    colors: {
        primary: '#0F172A', // Midnight Navy
        onPrimary: '#FFFFFF',
        primaryContainer: '#E0E7FF',
        onPrimaryContainer: '#0F172A',

        secondary: '#3B82F6', // Sapphire Blue
        onSecondary: '#FFFFFF',
        secondaryContainer: '#DBEAFE',
        onSecondaryContainer: '#1E3A8A',

        tertiary: '#94A3B8', // Slate
        onTertiary: '#FFFFFF',
        tertiaryContainer: '#F1F5F9',
        onTertiaryContainer: '#1E293B',

        error: '#EF4444',
        onError: '#FFFFFF',
        errorContainer: '#FEE2E2',
        onErrorContainer: '#7F1D1D',

        success: '#10B981',
        onSuccess: '#FFFFFF',
        successContainer: '#D1FAE5',
        onSuccessContainer: '#064E3B',

        warning: '#F59E0B',
        onWarning: '#FFFFFF',
        warningContainer: '#FEF3C7',
        onWarningContainer: '#78350F',

        surface: '#FFFFFF',
        onSurface: '#0F172A',
        surfaceVariant: '#F8FAFC',
        onSurfaceVariant: '#64748B',

        outline: '#CBD5E1',
        outlineVariant: '#E2E8F0',
        shadow: '#0F172A',
    },

    elevation: {
        0: 'none',
        1: '0px 1px 3px 0px rgba(15, 23, 42, 0.08), 0px 1px 2px 0px rgba(15, 23, 42, 0.04)',
        2: '0px 4px 6px -1px rgba(15, 23, 42, 0.1), 0px 2px 4px -1px rgba(15, 23, 42, 0.06)',
        3: '0px 10px 15px -3px rgba(15, 23, 42, 0.1), 0px 4px 6px -2px rgba(15, 23, 42, 0.05)',
        4: '0px 20px 25px -5px rgba(15, 23, 42, 0.1), 0px 10px 10px -5px rgba(15, 23, 42, 0.04)',
        5: '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
    },

    shape: {
        none: '0px',
        extraSmall: '4px',
        small: '8px',
        medium: '12px',
        large: '16px',
        extraLarge: '24px',
        full: '9999px',
    },

    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
    },

    typography: {
        displayLarge: { fontSize: '57px', lineHeight: '64px', fontWeight: 400 },
        displayMedium: { fontSize: '45px', lineHeight: '52px', fontWeight: 400 },
        displaySmall: { fontSize: '36px', lineHeight: '44px', fontWeight: 400 },

        headlineLarge: { fontSize: '30px', lineHeight: '36px', fontWeight: 600 },
        headlineMedium: { fontSize: '24px', lineHeight: '32px', fontWeight: 600 },
        headlineSmall: { fontSize: '20px', lineHeight: '28px', fontWeight: 600 },

        titleLarge: { fontSize: '18px', lineHeight: '24px', fontWeight: 600 },
        titleMedium: { fontSize: '16px', lineHeight: '22px', fontWeight: 600 },
        titleSmall: { fontSize: '14px', lineHeight: '20px', fontWeight: 600 },

        bodyLarge: { fontSize: '16px', lineHeight: '24px', fontWeight: 400 },
        bodyMedium: { fontSize: '14px', lineHeight: '20px', fontWeight: 400 },
        bodySmall: { fontSize: '12px', lineHeight: '16px', fontWeight: 400 },

        labelLarge: { fontSize: '14px', lineHeight: '20px', fontWeight: 600 },
        labelMedium: { fontSize: '12px', lineHeight: '16px', fontWeight: 600 },
        labelSmall: { fontSize: '11px', lineHeight: '16px', fontWeight: 600 },
    },
};
