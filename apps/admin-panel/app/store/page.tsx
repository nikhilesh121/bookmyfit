'use client';
import { useCallback, useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { Plus } from 'lucide-react';
import Pagination from '../../components/Pagination';

type Product = { id: string; name: string; category: string; price: number; mrp: number; stock: number; isActive: boolean };
type Order = { id: string; user: string; items: number; amount: number; status: string; createdAt: string };
type EditForm = { name: string; category: string; price: string; mrp: string; stock: string };

const EMPTY_FORM = { name: '', category: 'supplements', price: '', mrp: '', stock: '' };
const CATEGORIES = ['supplements', 'equipment', 'apparel', 'accessories', 'wellness'];

function statusBadge(status: string, stock?: number, isActive?: boolean) {
  if (stock !== undefined) {
    if (!isActive) return 'badge-danger';
    if (stock < 20) return 'badge-pending';
    return 'badge-active';
  }
  if (status === 'delivered') return 'badge-active';
  if (status === 'cancelled') return 'badge-danger';
  return 'badge-pending';
}

function statusLabel(status: string, isActive?: boolean) {
  if (isActive !== undefined) {
    if (!isActive) return 'Inactive';
    return 'Active';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function StorePage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [productLimit, setProductLimit] = useState(20);
  const [productTotal, setProductTotal] = useState(0);
  const [productPages, setProductPages] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [orderLimit, setOrderLimit] = useState(20);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPages, setOrderPages] = useState(1);

  const loadProducts = useCallback(async () => {
    try {
      const res = await api.get<any>(`/store/products?page=${productPage}&limit=${productLimit}`);
      const rows: Product[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setProducts(rows);
      setProductTotal((res as any)?.total ?? rows.length);
      setProductPages((res as any)?.pages ?? 1);
    } catch { setProducts([]); }
  }, [productPage, productLimit]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get<any>(`/store/orders?all=true&page=${orderPage}&limit=${orderLimit}`);
      const raw: any[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      const rows: Order[] = raw.map((o: any) => ({
        id: o.id,
        user: o.userId ? `User-${String(o.userId).slice(0, 6).toUpperCase()}` : 'Unknown',
        items: Array.isArray(o.items) ? o.items.length : (o.itemCount ?? o.items ?? 0),
        amount: Number(o.totalAmount ?? o.amount ?? 0),
        status: o.status ?? 'pending',
        createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—',
      }));
      setOrders(rows);
      setOrderTotal((res as any)?.total ?? rows.length);
      setOrderPages((res as any)?.pages ?? 1);
    } catch { setOrders([]); }
  }, [orderPage, orderLimit]);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadProducts(), loadOrders()]);
    setLoading(false);
  }, [loadProducts, loadOrders]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/store/products', { ...form, price: Number(form.price), mrp: Number(form.mrp), stock: Number(form.stock) });
      toast('Product added successfully');
    } catch (err: any) {
      toast(err.message || 'Failed to add product', 'error');
    }
    setShowAddForm(false);
    setForm(EMPTY_FORM);
    load();
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    try {
      await api.put(`/store/products/${editProduct.id}`, {
        name: editForm.name, category: editForm.category,
        price: Number(editForm.price), mrp: Number(editForm.mrp), stock: Number(editForm.stock),
      });
      toast('Product updated');
    } catch (err: any) {
      toast(err.message || 'Failed to update product', 'error');
    }
    setEditProduct(null);
    setEditForm(EMPTY_FORM);
    loadProducts();
  };

  const handleDeleteProduct = async () => {
    if (!confirmDelete) return;
    try {
      await api.del(`/store/products/${confirmDelete.id}`);
      toast('Product deleted');
    } catch {
      setProducts((prev) => prev.filter((x) => x.id !== confirmDelete.id));
      toast('Product removed');
    }
    setConfirmDelete(null);
    loadProducts();
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({ name: p.name, category: p.category, price: String(p.price), mrp: String(p.mrp), stock: String(p.stock) });
  };

  const stats = {
    totalProducts: productTotal || products.length,
    activeOrders: orders.filter((o) => o.status === 'pending' || o.status === 'processing').length,
    totalRevenue: orders.reduce((a, o) => a + Number(o.amount), 0),
    lowStock: products.filter((p) => p.stock < 20).length,
  };

  return (
    <Shell title="Store Management">
      {/* Edit Product Modal */}
      {editProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass p-6 rounded-2xl" style={{ maxWidth: 480, width: '90%' }}>
            <h3 className="serif text-lg mb-4" style={{ color: 'var(--t)' }}>Edit Product</h3>
            <form onSubmit={handleEditProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="glass-input" placeholder="Product Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
              <select className="glass-input" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <input className="glass-input" placeholder="Price ₹" type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} required />
                <input className="glass-input" placeholder="MRP ₹" type="number" value={editForm.mrp} onChange={e => setEditForm(f => ({ ...f, mrp: e.target.value }))} />
                <input className="glass-input" placeholder="Stock" type="number" value={editForm.stock} onChange={e => setEditForm(f => ({ ...f, stock: e.target.value }))} required />
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button type="button" className="btn btn-ghost text-sm" onClick={() => setEditProduct(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary text-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass p-6 rounded-2xl" style={{ maxWidth: 380, width: '90%' }}>
            <p className="mb-5 text-sm" style={{ color: 'var(--t)' }}>Delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className="btn btn-ghost text-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn text-sm" style={{ background: '#ef4444', color: '#fff' }} onClick={handleDeleteProduct}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['products', 'orders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background: tab === t ? 'var(--accent)' : 'var(--surface)',
              color: tab === t ? 'var(--bg)' : 'var(--t2)',
              border: '1px solid var(--border)',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="animate-pulse h-8 rounded mb-2" style={{ background: 'var(--surface)' }} />
                <div className="animate-pulse h-4 rounded" style={{ background: 'var(--surface)' }} />
              </div>
            ))
          : [
              { label: 'Total Products', value: stats.totalProducts },
              { label: 'Active Orders', value: stats.activeOrders },
              { label: 'Total Revenue', value: `₹${(stats.totalRevenue / 100).toLocaleString()}` },
              { label: 'Low Stock Items', value: stats.lowStock },
            ].map((s) => (
              <div key={s.label} className="card stat-glow p-5">
                <div className="text-2xl font-bold mb-1">{s.value}</div>
                <div className="text-xs" style={{ color: 'var(--t2)' }}>{s.label}</div>
              </div>
            ))}
      </div>

      {tab === 'products' && (
        <>
          <div className="flex justify-end mb-4">
            <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddForm((v) => !v)}>
              <Plus size={14} /> Add Product
            </button>
          </div>

          {showAddForm && (
            <div className="glass p-6 mb-4">
              <h3 className="serif text-base mb-4">New Product</h3>
              <form onSubmit={handleAddProduct}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="kicker block mb-1">Name</label>
                    <input className="glass-input w-full" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="kicker block mb-1">Category</label>
                    <select className="glass-input w-full" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                      <option value="supplements">Supplements</option>
                      <option value="equipment">Equipment</option>
                      <option value="apparel">Apparel</option>
                      <option value="accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="kicker block mb-1">Price (₹)</label>
                    <input className="glass-input w-full" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="kicker block mb-1">MRP (₹)</label>
                    <input className="glass-input w-full" type="number" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="kicker block mb-1">Stock</label>
                    <input className="glass-input w-full" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary">Add Product</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="glass overflow-hidden">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j}><div className="animate-pulse h-4 rounded" style={{ background: 'var(--surface)' }} /></td>
                        ))}
                      </tr>
                    ))
                  : products.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold text-white">{p.name}</td>
                        <td><span className="accent-pill capitalize">{p.category}</span></td>
                        <td>₹{p.price.toLocaleString()}</td>
                        <td>{p.stock}</td>
                        <td>
                          <span className={statusBadge('', p.stock, p.isActive)}>
                            {statusLabel('', p.isActive)}
                          </span>
                        </td>
                        <td className="flex gap-2">
                          <button className="btn btn-ghost text-xs" onClick={() => openEdit(p)}>Edit</button>
                          <button className="btn btn-ghost text-xs" style={{ color: 'var(--error)' }} onClick={() => setConfirmDelete(p)}>Delete</button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <Pagination page={productPage} pages={productPages} total={productTotal} limit={productLimit} onPage={setProductPage} onLimit={(l) => { setProductLimit(l); setProductPage(1); }} />
        </>
      )}

      {tab === 'orders' && (
        <>
          <div className="glass overflow-hidden">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>User</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j}><div className="animate-pulse h-4 rounded" style={{ background: 'var(--surface)' }} /></td>
                        ))}
                      </tr>
                    ))
                  : orders.map((o) => (
                      <tr key={o.id}>
                        <td className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{o.id}</td>
                        <td className="font-semibold text-white">{o.user}</td>
                        <td>{o.items}</td>
                        <td>₹{(o.amount || 0).toLocaleString()}</td>
                        <td><span className={statusBadge(o.status)}>{statusLabel(o.status)}</span></td>
                        <td style={{ color: 'var(--t2)' }}>{o.createdAt}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <Pagination page={orderPage} pages={orderPages} total={orderTotal} limit={orderLimit} onPage={setOrderPage} onLimit={(l) => { setOrderLimit(l); setOrderPage(1); }} />
        </>
      )}
    </Shell>
  );
}
