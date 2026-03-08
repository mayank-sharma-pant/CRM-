import SalesClientsDetailPage from '@/app/sales/clients/[id]/page';

export default function MDClientDetailRoute({ params }) {
    return <SalesClientsDetailPage params={params} />;
}
