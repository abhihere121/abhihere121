import { mdTheme } from '../theme';

export function MDDataTable({ columns, rows, style, className = '' }) {
    const tableStyle = {
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'Roboto, sans-serif',
        ...style,
    };

    const headerCellStyle = {
        padding: mdTheme.spacing.md,
        textAlign: 'left',
        fontSize: mdTheme.typography.labelLarge.fontSize,
        fontWeight: mdTheme.typography.labelLarge.fontWeight,
        color: mdTheme.colors.onSurface,
        borderBottom: `1px solid ${mdTheme.colors.outlineVariant}`,
        backgroundColor: mdTheme.colors.surfaceVariant,
    };

    const bodyCellStyle = {
        padding: mdTheme.spacing.md,
        fontSize: mdTheme.typography.bodyMedium.fontSize,
        color: mdTheme.colors.onSurface,
        borderBottom: `1px solid ${mdTheme.colors.outlineVariant}`,
    };

    const rowStyle = {
        transition: 'background-color 150ms',
    };

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className={`md-data-table ${className}`} style={tableStyle}>
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                style={{
                                    ...headerCellStyle,
                                    textAlign: col.align || 'left',
                                }}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIdx) => (
                        <tr
                            key={rowIdx}
                            style={rowStyle}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = mdTheme.colors.surfaceVariant + '40'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {row.map((cell, cellIdx) => (
                                <td
                                    key={cellIdx}
                                    style={{
                                        ...bodyCellStyle,
                                        textAlign: columns[cellIdx]?.align || 'left',
                                    }}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
