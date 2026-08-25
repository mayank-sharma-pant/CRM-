export default function InvoiceGstSummary({ invoice }) {
    const mode = invoice.taxMode;
    const rows =
        mode === 'intra'
            ? [
                { label: 'CGST', value: invoice.cgst },
                { label: 'SGST', value: invoice.sgst },
            ]
            : mode === 'inter'
                ? [{ label: 'IGST', value: invoice.igst }]
                : [{ label: 'Tax', value: invoice.tax }];

    return (
        <>
            {rows.map((row) => (
                <div key={row.label} className="flex justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
                    <span className="text-slate-800 dark:text-slate-200">{row.value}</span>
                </div>
            ))}
        </>
    );
}
