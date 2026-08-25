'use client';

import ProductsPage from '@/components/products/ProductsPage';

export default function AdminProductsPage() {
    return <ProductsPage canManage roleLabel="Admin" />;
}
