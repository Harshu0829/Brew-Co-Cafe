import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, Loader2, X } from 'lucide-react';
import { getMenuItems, getCategories } from '@/lib/api';
import api from '@/lib/api';

const DIETARY_OPTIONS = ['Vegan', 'Gluten-Free'];

const EMPTY_FORM = { name: '', description: '', price: '', category_id: '', dietary_tags: [], is_available: true };

export default function MenuManager() {
  const [items, setItems]       = useState([]);
  const [categories, setCats]   = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);  // null = add, object = edit
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, catsData] = await Promise.all([getMenuItems(), getCategories()]);
      setItems(itemsData || []);
      setCats(catsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const toggleAvailable = async (item) => {
    try {
      await api.patch(`/menu/items/${item.id}`, { is_available: !item.is_available });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Hide this item from the menu?')) return;
    try {
      await api.delete(`/menu/items/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name:         item.name,
      description:  item.description || '',
      price:        item.price,
      category_id:  item.category?.id || item.category_id || '',
      dietary_tags: item.dietary_tags || [],
      is_available: item.is_available,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.category_id) {
      setFormError('Name, price, and category are required.');
      return;
    }
    try {
      setSaving(true);
      setFormError('');
      const payload = { ...form, price: parseFloat(form.price) };
      if (editItem) {
        const updated = await api.patch(`/menu/items/${editItem.id}`, payload);
        setItems((prev) => prev.map((i) => i.id === editItem.id ? { ...i, ...updated } : i));
      } else {
        const created = await api.post('/menu/items', payload);
        setItems((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDietaryTag = (tag) =>
    setForm((f) => ({
      ...f,
      dietary_tags: f.dietary_tags.includes(tag)
        ? f.dietary_tags.filter((t) => t !== tag)
        : [...f.dietary_tags, tag],
    }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', marginBottom: '0.2rem' }}>Menu Manager</h1>
          <p style={{ color: 'rgba(245,230,211,0.5)', margin: 0, fontSize: '0.875rem' }}>{items.length} items · {items.filter(i => i.is_available).length} active</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={loadData}>Refresh</button>
          <button id="add-menu-item" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320, marginBottom: '1.25rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,230,211,0.4)' }} />
        <input className="input" placeholder="Search menu…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(245,230,211,0.4)' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-amber)', margin: '0 auto' }} />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(44,24,16,0.5)', borderBottom: '1px solid rgba(212,134,11,0.12)' }}>
                  {['Name', 'Category', 'Price', 'Dietary', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'rgba(245,230,211,0.6)', fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'rgba(245,230,211,0.35)' }}>No items found.</td></tr>
                )}
                {filtered.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(212,134,11,0.07)', background: i % 2 === 0 ? 'transparent' : 'rgba(44,24,16,0.2)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'rgba(245,230,211,0.6)' }}>{item.category?.name || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-amber)', fontWeight: 600 }}>₹{item.price}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {item.dietary_tags?.length > 0
                        ? item.dietary_tags.map((t) => <span key={t} className="badge badge-green" style={{ marginRight: 4, fontSize: '0.68rem' }}>{t}</span>)
                        : <span style={{ color: 'rgba(245,230,211,0.3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button id={`toggle-${item.id}`} onClick={() => toggleAvailable(item)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: item.is_available ? '#4ade80' : '#f87171', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}>
                        {item.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {item.is_available ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button id={`edit-${item.id}`} className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} onClick={() => openEdit(item)}><Edit2 size={14} /></button>
                        <button id={`delete-${item.id}`} className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', color: '#f87171' }} onClick={() => deleteItem(item.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>{editItem ? 'Edit Item' : 'Add Menu Item'}</h3>
              <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            {formError && <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{formError}</p>}

            {[
              { label: 'Name *', key: 'name', type: 'text', placeholder: 'e.g. Iced Latte' },
              { label: 'Price (₹) *', key: 'price', type: 'number', placeholder: '180' },
              { label: 'Description', key: 'description', type: 'text', placeholder: 'Short description…' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>{label}</label>
                <input className="input" type={type} placeholder={placeholder}
                  value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Category *</label>
              <select className="input" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Dietary Tags</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {DIETARY_OPTIONS.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleDietaryTag(tag)}
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1.5px solid', borderColor: form.dietary_tags.includes(tag) ? 'var(--color-amber)' : 'rgba(212,134,11,0.25)', color: form.dietary_tags.includes(tag) ? 'var(--color-amber)' : 'rgba(245,230,211,0.5)', background: form.dietary_tags.includes(tag) ? 'rgba(212,134,11,0.1)' : 'transparent', cursor: 'pointer' }}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : (editItem ? 'Save Changes' : 'Add Item')}
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

