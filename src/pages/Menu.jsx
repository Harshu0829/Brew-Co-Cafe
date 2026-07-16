import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Star, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { getMenuItems, getCategories } from '@/lib/api';

const DIETARY = ['Vegan', 'Gluten-Free'];

const getEmoji = (item) => {
  if (item.emoji) return item.emoji;
  const slug = item.category?.slug || '';
  const name = item.name?.toLowerCase() || '';
  if (slug === 'coffee') return '☕';
  if (slug === 'cold-drinks') {
    if (name.includes('tea')) return '🍹';
    return '🧋';
  }
  if (slug === 'food') {
    if (name.includes('bagel')) return '🥯';
    return '🥑';
  }
  if (slug === 'pastries') {
    if (name.includes('muffin')) return '🫐';
    return '🥐';
  }
  return '🍽️';
};

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDietary, setActiveDietary] = useState([]);
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    async function loadMenuData() {
      try {
        setLoading(true);
        const [itemsData, catsData] = await Promise.all([
          getMenuItems(),
          getCategories()
        ]);
        setMenuItems(itemsData);
        setCategories(catsData);
      } catch (err) {
        console.error('Error fetching menu:', err);
        setError(err.message || 'Failed to load menu data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadMenuData();
  }, []);

  const filtered = menuItems.filter((item) => {
    const matchCat = activeCategory === 'All' || (item.category && item.category.name === activeCategory);
    const matchDiet = activeDietary.length === 0 || activeDietary.every((d) => item.dietary_tags?.includes(d));
    const matchSearch = (item.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchDiet && matchSearch;
  });

  const handleAdd = (item) => {
    const itemWithEmoji = { ...item, emoji: getEmoji(item) };
    addItem(itemWithEmoji);
    setAdded((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAdded((prev) => ({ ...prev, [item.id]: false })), 1200);
  };

  const toggleDietary = (tag) =>
    setActiveDietary((prev) => prev.includes(tag) ? prev.filter((d) => d !== tag) : [...prev, tag]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'rgba(245,230,211,0.6)' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-amber)' }} />
        <p>Loading fresh ingredients…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#f87171', fontSize: '1.1rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="section" style={{ paddingTop: '1.5rem' }}>
      <div className="container">
        <h1 className="font-display" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.4rem' }}>Our Menu</h1>
        <p style={{ color: 'rgba(245,230,211,0.6)', marginBottom: '2rem' }}>Fresh ingredients, crafted with love — every single day.</p>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,230,211,0.4)' }} />
            <input id="menu-search" className="input" placeholder="Search items…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem' }} />
          </div>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {['All', ...categories.map((c) => c.name)].map((cat) => (
              <button key={cat} id={`cat-${cat.toLowerCase().replace(/\s/g,'-')}`}
                className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                onClick={() => setActiveCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
          {/* Dietary */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {DIETARY.map((tag) => (
              <button key={tag} id={`diet-${tag.toLowerCase()}`}
                className="btn"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', border: '1.5px solid', borderColor: activeDietary.includes(tag) ? 'var(--color-amber)' : 'rgba(212,134,11,0.25)', color: activeDietary.includes(tag) ? 'var(--color-amber)' : 'rgba(245,230,211,0.6)', background: activeDietary.includes(tag) ? 'rgba(212,134,11,0.1)' : 'transparent', borderRadius: 'var(--radius-full)' }}
                onClick={() => toggleDietary(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(245,230,211,0.4)' }}>
            <Search size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p>No items match your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((item) => (
              <div key={item.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '3rem', textAlign: 'center', lineHeight: 1 }}>{getEmoji(item)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    {item.dietary_tags?.map((t) => (
                      <span key={t} className="badge badge-green" style={{ fontSize: '0.68rem' }}>{t}</span>
                    ))}
                  </div>
                  <h3 style={{ fontSize: '1rem', margin: '0 0 0.3rem' }}>{item.name}</h3>
                  <p style={{ fontSize: '0.83rem', color: 'rgba(245,230,211,0.55)', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{item.description}</p>
                  <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-amber)', margin: 0 }}>₹{item.price}</p>
                </div>
                <button id={`add-${item.id}`} className="btn btn-primary" style={{ width: '100%', fontSize: '0.875rem' }}
                  onClick={() => handleAdd(item)} disabled={!item.is_available}>
                  {added[item.id] ? '✓ Added!' : <><Plus size={15} /> Add to Cart</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
