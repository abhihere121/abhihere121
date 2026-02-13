/**
 * Utility for exporting JSON data to CSV and triggering a download.
 */
export function exportToCSV(filename, rows) {
    if (!rows || !rows.length) return;

    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(","), // header row
        ...rows.map(row => headers.map(fieldName => {
            let value = row[fieldName];
            if (typeof value === "string") {
                // Escape quotes and wrap in quotes
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
