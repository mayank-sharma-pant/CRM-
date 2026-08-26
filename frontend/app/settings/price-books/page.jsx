'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookMarked, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md' || role === 'purchase';
}

export default function PriceBooksSettingsPage() {
  const { user } = useAuth();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [books, setBooks] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [newName, setNewName] = useState('');
  const [entryPrices, setEntryPrices] = useState({});
  const [saving, setSaving] = useState(false);

  const loadBooks = useCallback(async () => {
    const res = await api.get('/price-books', { params: { active_only: false } });
    setBooks(res.data?.items || []);
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await api.get('/products', { params: { active_only: true, limit: 500 } });
    setProducts(res.data?.items || []);
  }, []);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadBooks(), loadProducts()]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load price books.');
    } finally {
      setLoading(false);
    }
  }, [allowed, loadBooks, loadProducts]);

  useEffect(() => {
    load();
  }, [load]);

  const loadBookDetail = useCallback(async (bookId) => {
    if (!bookId) {
      setSelectedBook(null);
      setEntryPrices({});
      return;
    }
    const res = await api.get(`/price-books/${bookId}`);
    setSelectedBook(res.data);
    const map = {};
    (res.data.entries || []).forEach((e) => {
      map[e.product_id] = e.unit_price;
    });
    setEntryPrices(map);
  }, []);

  useEffect(() => {
    if (selectedId) loadBookDetail(selectedId);
  }, [selectedId, loadBookDetail]);

  const createBook = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/price-books', { name, is_default: books.length === 0 });
      setNewName('');
      await loadBooks();
      setSelectedId(String(res.data.id));
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create book.');
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (bookId) => {
    setSaving(true);
    try {
      await api.patch(`/price-books/${bookId}`, { is_default: true });
      await loadBooks();
      if (String(bookId) === selectedId) await loadBookDetail(bookId);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not set default.');
    } finally {
      setSaving(false);
    }
  };

  const saveEntries = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    try {
      const entries = Object.entries(entryPrices)
        .filter(([, price]) => price !== '' && price != null)
        .map(([product_id, unit_price]) => ({
          product_id: parseInt(product_id, 10),
          unit_price: Number(unit_price),
        }));
      await api.put(`/price-books/${selectedId}/entries`, { entries });
      await loadBookDetail(selectedId);
      await loadBooks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save entries.');
    } finally {
      setSaving(false);
    }
  };

  const deleteBook = async (bookId) => {
    if (!window.confirm('Delete this price book?')) return;
    setSaving(true);
    try {
      await api.delete(`/price-books/${bookId}`);
      if (String(bookId) === selectedId) {
        setSelectedId('');
        setSelectedBook(null);
        setEntryPrices({});
      }
      await loadBooks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete book.');
    } finally {
      setSaving(false);
    }
  };

  const productRows = useMemo(
    () => products.map((p) => ({
      ...p,
      bookPrice: entryPrices[p.id] ?? '',
      listPrice: p.unit_price,
    })),
    [products, entryPrices],
  );

  if (!allowed) {
    return (
      <div className="p-8 text-sm text-slate-500">Only admin, MD, or purchase can manage price books.</div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-slate-400 mb-1">
            <Link href="/settings" className="hover:underline">Settings</Link>
            {' / Price books'}
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Price books</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Named price lists per product. The default book applies to new quotes and invoices when no book is chosen.
          </p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-8 space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <form onSubmit={createBook} className="flex flex-wrap gap-2 items-end p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <label className="text-xs flex-1 min-w-[200px]">
                New book name
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600"
                />
              </label>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg disabled:opacity-50">
                <Plus size={12} /> Add book
              </button>
            </form>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Books</p>
                {books.length === 0 && <p className="text-xs text-slate-400">No books yet.</p>}
                {books.map((b) => (
                  <div key={b.id} className={`rounded-lg border p-2 ${selectedId === String(b.id) ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <button type="button" onClick={() => setSelectedId(String(b.id))} className="text-left w-full text-sm font-medium text-slate-900 dark:text-white">
                      {b.name}
                      {b.is_default && <span className="ml-1 text-[10px] text-emerald-600">default</span>}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">{b.entry_count || 0} prices</p>
                    <div className="flex gap-2 mt-2">
                      {!b.is_default && (
                        <button type="button" onClick={() => setDefault(b.id)} className="text-[10px] text-blue-600 hover:underline">Set default</button>
                      )}
                      <button type="button" onClick={() => deleteBook(b.id)} className="text-[10px] text-red-600 hover:underline inline-flex items-center gap-0.5">
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {!selectedBook ? (
                  <p className="text-sm text-slate-500">Select a book to edit product prices.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedBook.name}</h2>
                      <button type="button" onClick={saveEntries} disabled={saving} className="px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg disabled:opacity-50">
                        Save prices
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2 pr-2">Product</th>
                            <th className="py-2 pr-2">List price</th>
                            <th className="py-2">Book price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productRows.map((p) => (
                            <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="py-2 pr-2">{p.name}</td>
                              <td className="py-2 pr-2 text-slate-500">{p.listPrice}</td>
                              <td className="py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={entryPrices[p.id] ?? ''}
                                  placeholder={String(p.listPrice)}
                                  onChange={(e) => setEntryPrices((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                  className="w-24 px-2 py-1 border rounded bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
