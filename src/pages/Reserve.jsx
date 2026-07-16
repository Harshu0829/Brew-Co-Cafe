import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, Clock, Users, MessageSquare, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { createReservation } from '@/lib/api';

const schema = z.object({
  guest_name:      z.string().min(2, 'Name must be at least 2 characters'),
  guest_email:     z.string().email('Invalid email address'),
  guest_phone:     z.string().min(10, 'Enter a valid phone number'),
  date:            z.string().min(1, 'Please select a date'),
  time_slot:       z.string().min(1, 'Please select a time'),
  guest_count:     z.number({ coerce: true }).min(1).max(12),
  special_request: z.string().optional(),
});

const TIME_SLOTS = ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM'];

const Field = ({ label, icon: Icon, error, children }) => (
  <div>
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: 'rgba(245,230,211,0.85)' }}>
      {Icon && <Icon size={14} style={{ color: 'var(--color-amber)' }} />}
      {label}
    </label>
    {children}
    {error && <p style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.3rem' }}>{error}</p>}
  </div>
);

export default function ReservePage() {
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState(null);
  const { user } = useAuthStore();

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      guest_name: user?.name || '',
      guest_email: user?.email || '',
      guest_phone: user?.phone || '',
      guest_count: 2,
      special_request: ''
    }
  });

  const hasPrefilled = useRef(false);

  useEffect(() => {
    if (user && !hasPrefilled.current) {
      if (user.name) setValue('guest_name', user.name);
      if (user.email) setValue('guest_email', user.email);
      if (user.phone) setValue('guest_phone', user.phone);
      hasPrefilled.current = true;
    }
  }, [user, setValue]);

  const onSubmit = async (data) => {
    try {
      setApiError(null);
      await createReservation(data);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setApiError(err.message || 'Failed to submit reservation. This slot might be fully booked.');
    }
  };

  if (submitted) {
    return (
      <div className="section container" style={{ maxWidth: 520, textAlign: 'center', paddingTop: '2rem' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(26,127,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <CheckCircle size={36} style={{ color: '#4ade80' }} />
        </div>
        <h1 className="font-display" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>You're all booked!</h1>
        <p style={{ color: 'rgba(245,230,211,0.65)', marginBottom: '1.5rem' }}>Your reservation is confirmed! We look forward to hosting you at Brew & Co.</p>
        <button className="btn btn-primary" onClick={() => setSubmitted(false)}>Make Another Reservation</button>
      </div>
    );
  }

  return (
    <div className="section container" style={{ maxWidth: 600, paddingTop: '1.5rem' }}>
      <h1 className="font-display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '0.4rem' }}>Reserve a Table</h1>
      <p style={{ color: 'rgba(245,230,211,0.6)', marginBottom: '2rem' }}>Book your perfect spot — we'll hold it for 15 minutes past your time.</p>

      {apiError && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Full Name" error={errors.guest_name?.message}>
            <input id="reserve-name" className="input" placeholder="Rohan Mehta" {...register('guest_name')} />
          </Field>
          <Field label="Phone" icon={null} error={errors.guest_phone?.message}>
            <input id="reserve-phone" className="input" placeholder="9876543210" {...register('guest_phone')} />
          </Field>
        </div>

        <Field label="Email" error={errors.guest_email?.message}>
          <input id="reserve-email" className="input" type="email" placeholder="you@example.com" {...register('guest_email')} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Date" icon={CalendarDays} error={errors.date?.message}>
            <input id="reserve-date" className="input" type="date" {...register('date')}
              min={new Date().toISOString().split('T')[0]} />
          </Field>
          <Field label="Guests" icon={Users} error={errors.guest_count?.message}>
            <select id="reserve-guests" className="input" {...register('guest_count', { valueAsNumber: true })}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Time Slot" icon={Clock} error={errors.time_slot?.message}>
          <select id="reserve-time" className="input" {...register('time_slot')}>
            <option value="">Choose a time…</option>
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Special Requests" icon={MessageSquare} error={errors.special_request?.message}>
          <textarea id="reserve-notes" className="input" rows={3} placeholder="Dietary needs, occasion, seating preference…"
            style={{ resize: 'vertical', fontFamily: 'inherit' }} {...register('special_request')} />
        </Field>

        <button id="reserve-submit" type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1rem', padding: '0.8rem' }} disabled={isSubmitting}>
          {isSubmitting ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Loader2 className="animate-spin" size={16} /> Booking…
            </div>
          ) : 'Confirm Reservation'}
        </button>
      </form>
    </div>
  );
}
