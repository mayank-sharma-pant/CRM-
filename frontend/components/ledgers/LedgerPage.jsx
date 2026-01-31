'use client';

import LedgerActionBar from './LedgerActionBar';
import LedgerTable from './LedgerTable';

export default function LedgerPage({
    title,
    subtitle,
    columns,
    data,
    permissions = { can_view: true, can_edit: false },
    loading = false,
    onAddRow,
    onSaveRow,
    onDeleteRow,
    onSearch
}) {

    if (!permissions.can_view) {
        return (
            <div className="flex items-center justify-center p-12 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 h-96">
                <div className="text-center">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Access Denied</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">You do not have permission to view {title}.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full">
            <LedgerActionBar
                title={title}
                subtitle={subtitle}
                canEdit={permissions.can_edit}
                onSearch={onSearch}
                onAddRow={onAddRow}
            />

            <div className="flex-1 min-h-0">
                <LedgerTable
                    columns={columns}
                    data={data}
                    loading={loading}
                    canEdit={permissions.can_edit}
                    onSaveRow={onSaveRow}
                    onDeleteRow={onDeleteRow}
                    pagination={true}
                />
            </div>
        </div>
    );
}
