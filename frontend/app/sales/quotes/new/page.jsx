'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import QuotationWizard from '../../../../components/quotes/QuotationWizard';
import { useNotification } from '../../../../contexts/NotificationContext';
import api from '../../../../services/api';

function NewQuoteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useNotification();
  const clientId = searchParams.get('client_id');
  const dealId = searchParams.get('deal_id');

  return (
    <div className="min-h-full bg-page pb-10">
      <div className="bg-surface border-b border-border px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/sales/quotes')}
            className="p-2 -ml-2 rounded-full text-muted hover:bg-surface-elevated"
            aria-label="Back to quotations"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary">New quotation</h1>
            <p className="text-sm text-muted mt-1">Pick a plan, set the price, and generate a client PDF.</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <QuotationWizard
            initialClientId={clientId}
            initialDealId={dealId}
            lockClient={Boolean(clientId)}
            lockDeal={Boolean(dealId)}
            onCancel={() => router.push('/sales/quotes')}
            onCreated={async (quote) => {
              showToast('Quotation created', 'success');
              try {
                const res = await api.get(`/quotes/${quote.id}/pdf`, { responseType: 'blob' });
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${quote.quote_number || 'quote'}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                /* list page still has download */
              }
              router.push('/sales/quotes');
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function NewSalesQuotePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20 text-muted">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <NewQuoteInner />
    </Suspense>
  );
}
