import SalesLeadsDetailPage from '@/app/sales/leads/[id]/page';

export default function MDLeadDetailRoute({ params }) {
    return <SalesLeadsDetailPage params={params} />;
}
