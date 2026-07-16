import { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle, XCircle, Clock, Users, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { getReservations, updateReservationStatus } from '@/lib/api';

const STATUS_COLORS = {
  pending:   { bg: 'rgba(250,204,21,0.1)',  text: '#facc15' },
  confirmed: { bg: 'rgba(74,222,128,0.1)',  text: '#4ade80' },
  cancelled: { bg: 'rgba(248,113,113,0.1)', text: '#f87171' },
  no_show:   { bg: 'rgba(255,255,255,0.05)',text: 'rgba(245,230,211,0.4)' },
};

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchResList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReservations();
      setReservations(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch reservations list.');
    } finally {
      setActionError(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResList();
  }, []);

  const update = async (id, status) => {
    try {
      await updateReservationStatus(id, status);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      setActionError(null);
    } catch (err) {
      setActionError('Failed to update reservation: ' + err.message);
    }
  };

  const filtered = filter === 'all' ? reservations : reservations.filter((r) => r.status === filter);

  if (loading && reservations.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', color: 'rgba(245,230,211,0.6)' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-amber)' }} />
        <p>Loading reservations…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', marginBottom: '0.2rem' }}>Reservations</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(245,230,211,0.5)' }}>
            {reservations.filter((r) => r.status === 'pending').length} pending · {reservations.filter((r) => r.status === 'confirmed').length} confirmed
          </p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={fetchResList}>
          Refresh List
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {actionError && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['all', 'pending', 'confirmed', 'cancelled'].map((f) => (
          <button key={f} id={`res-filter-${f}`}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', textTransform: 'capitalize' }}
            onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(44,24,16,0.5)', borderBottom: '1px solid rgba(212,134,11,0.12)' }}>
                  {['Guest', 'Date & Time', 'Party Size', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'rgba(245,230,211,0.6)', fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((res, i) => {
                  const sc = STATUS_COLORS[res.status] || { bg: 'rgba(255,255,255,0.05)', text: '#fff' };
                  return (
                    <tr key={res.id}
                      onClick={() => setSelected(res.id === selected ? null : res.id)}
                      style={{ borderBottom: '1px solid rgba(212,134,11,0.07)', background: res.id === selected ? 'rgba(212,134,11,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(44,24,16,0.2)', cursor: 'pointer', transition: 'background 0.15s' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <p style={{ margin: '0 0 0.15rem', fontWeight: 600 }}>{res.guest_name}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(245,230,211,0.45)' }}>{res.guest_email}</p>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                          <CalendarDays size={13} style={{ color: 'var(--color-amber)', flexShrink: 0 }} />{res.date}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'rgba(245,230,211,0.5)', marginTop: '0.2rem' }}>
                          <Clock size={12} style={{ flexShrink: 0 }} />{res.time_slot}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Users size={14} style={{ color: 'var(--color-amber)' }} />{res.guest_count}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.text, textTransform: 'capitalize' }}>
                          {res.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                          {res.status === 'pending' && (
                            <>
                              <button id={`confirm-${res.id}`} className="btn" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 'var(--radius-sm)' }}
                                onClick={() => update(res.id, 'confirmed')}>
                                <CheckCircle size={13} /> Confirm
                              </button>
                              <button id={`cancel-${res.id}`} className="btn" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-sm)' }}
                                onClick={() => update(res.id, 'cancelled')}>
                                <XCircle size={13} /> Cancel
                              </button>
                            </>
                          )}
                          {res.status !== 'pending' && (
                            <span style={{ fontSize: '0.78rem', color: 'rgba(245,230,211,0.3)' }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const res = reservations.find((r) => r.id === selected);
          if (!res) return null;
          return (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Guest Details</h3>
              {[
                { label: 'Name',    value: res.guest_name },
                { label: 'Email',   value: res.guest_email },
                { label: 'Phone',   value: res.guest_phone },
                { label: 'Date',    value: res.date },
                { label: 'Time',    value: res.time_slot },
                { label: 'Guests',  value: res.guest_count },
              ].map(({ label, value }) => (
                <div key={label} style={{ marginBottom: '0.7rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(245,230,211,0.45)', display: 'block', marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              {res.special_request && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(212,134,11,0.07)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-amber)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--color-amber)', fontWeight: 600 }}>
                    <MessageSquare size={13} /> Special Request
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(245,230,211,0.7)', lineHeight: 1.5 }}>{res.special_request}</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
