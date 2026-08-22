import { useState, useCallback, useEffect } from 'react';
import { TicketCard } from './TicketCard';
import { SpidermanHanging } from './SpidermanHanging';
import { Footer } from './Footer';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../api/client';
import type { TicketWithStudent, TicketStatus, TicketCategory, User } from '../api/client';

interface WardenDashboardProps {
  token: string;
  user: User;
  onLogout: () => void;
}

type SortKey = 'priority' | 'time' | 'reports';
type FilterStatus = 'all' | TicketStatus;
type FilterCategory = 'all' | TicketCategory;

export function WardenDashboard({ token, user, onLogout }: WardenDashboardProps) {
  const [tickets, setTickets] = useState<TicketWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [newTicketIds, setNewTicketIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [stats, setStats] = useState({ open: 0, flagged: 0, resolved: 0, duplicate: 0 });

  const loadTickets = useCallback(async () => {
    try {
      const params: Record<string, string> = { limit: '100' };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterCategory !== 'all') params.category = filterCategory;
      const { tickets: rows } = await api.getTickets(params);
      setTickets(rows);
      computeStats(rows);
    } catch (err: any) {
      console.error('Failed to load tickets:', err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  function computeStats(rows: TicketWithStudent[]) {
    const s = { open: 0, flagged: 0, resolved: 0, duplicate: 0 };
    rows.forEach(t => { s[t.status as keyof typeof s] = (s[t.status as keyof typeof s] || 0) + 1; });
    setStats(s);
  }

  useWebSocket({
    token,
    onConnected: () => setWsConnected(true),
    onDisconnected: () => setWsConnected(false),
    onMessage: useCallback((data: unknown) => {
      const msg = data as { type: string; data: any };
      if (msg.type === 'ticket:new') {
        setTickets(prev => {
          const updated = [msg.data, ...prev];
          computeStats(updated);
          return updated;
        });
        setNewTicketIds(prev => new Set([...prev, msg.data.id]));
        setTimeout(() => setNewTicketIds(prev => { const n = new Set(prev); n.delete(msg.data.id); return n; }), 3000);
        playNotificationSound();
      } else if (msg.type === 'ticket:duplicate') {
        setTickets(prev => prev.map(t =>
          t.id === msg.data.parentTicket.id ? { ...t, ...msg.data.parentTicket } : t
        ));
      } else if (msg.type === 'ticket:resolved') {
        setTickets(prev => prev.map(t =>
          t.id === msg.data.ticketId ? { ...t, status: 'resolved', resolvedAt: new Date().toISOString() } : t
        ));
      } else if (msg.type === 'ticket:deleted') {
        setTickets(prev => {
          const filtered = prev.filter(t => t.id !== msg.data.ticketId);
          computeStats(filtered);
          return filtered;
        });
      }
    }, []),
  });

  const handleResolve = useCallback(async (id: string) => {
    await api.updateTicketStatus(id, 'resolved');
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'resolved', resolvedAt: new Date().toISOString() } : t));
  }, []);

  const handleFlagToggle = useCallback(async (id: string, current: TicketStatus) => {
    const newStatus = current === 'flagged' ? 'open' : 'flagged';
    await api.updateTicketStatus(id, newStatus as TicketStatus);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as TicketStatus } : t));
  }, []);

  const displayed = tickets
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .filter(t => filterCategory === 'all' || t.category === filterCategory)
    .sort((a, b) => {
      if (sortKey === 'priority') return b.urgencyScore - a.urgencyScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === 'time') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return b.reportCount - a.reportCount;
    });

  const categories: TicketCategory[] = ['wifi', 'electricity', 'water', 'food', 'hygiene', 'security', 'maintenance', 'other'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--clr-bg)', position: 'relative', zIndex: 1 }}>
      {/* ── Hanging Scroll Interactive Spider-Man ──────────────────────────── */}
      <SpidermanHanging />

      {/* ── Light Warden Header ────────────────────────────────────────────── */}
      <header style={{
        height: 76,
        padding: '0 2.5rem 0 5.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.85)',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.1rem', color: '#ffffff',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
          }}>
            C
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#0f172a' }}>
              Complain<span className="grad-text">KARO</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Warden Triage Control
            </div>
          </div>
        </div>

        {/* WebSocket Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 'var(--r-full)',
            background: '#ffffff', border: '1px solid #e2e8f0',
            fontSize: '0.8rem', color: '#475569', fontWeight: 600,
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
          }}>
            <span className={`status-dot ${wsConnected ? 'status-online' : 'status-offline'}`} />
            <span>{wsConnected ? 'WebSocket Live Push' : 'Reconnecting...'}</span>
          </div>

          <span style={{ color: '#0f172a', fontSize: '0.875rem', fontWeight: 600 }}>
            👋 {user.name} ({user.hostelBlock})
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '3rem 2rem 5rem' }}>
        {/* ── Metric Stat Cards ────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Open Tickets', value: stats.open, color: '#0284c7', icon: '📬' },
            { label: 'Needs Review', value: stats.flagged, color: '#db2777', icon: '⚠️' },
            { label: 'Clustered Duplicates', value: stats.duplicate, color: '#d97706', icon: '🔁' },
            { label: 'Resolved Tickets', value: stats.resolved, color: '#059669', icon: '✅' },
          ].map(s => (
            <div key={s.label} className="card" style={{ borderTop: `3px solid ${s.color}`, background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, color: s.color, marginTop: 4 }}>
                    {s.value}
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Controls Bar ────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center',
          background: '#ffffff', border: '1px solid #e2e8f0',
          borderRadius: 'var(--r-lg)', padding: '1rem', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}>
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'open', 'flagged', 'duplicate', 'resolved'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}>
                {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as FilterCategory)}
            style={{
              background: '#f8fafc', border: '1px solid #cbd5e1',
              borderRadius: 'var(--r-full)', color: '#0f172a', padding: '6px 16px',
              fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>

          {/* Sort Pills */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Sort by:</span>
            {(['priority', 'time', 'reports'] as const).map(s => (
              <button key={s} onClick={() => setSortKey(s)}
                className={`btn btn-sm ${sortKey === s ? 'btn-primary' : 'btn-ghost'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Ticket Grid ──────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
          </div>
        ) : displayed.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontSize: '1.1rem', color: '#334155' }}>No tickets match your filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.25rem' }}>
            {displayed.map(ticket => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                showActions
                onResolve={handleResolve}
                onFlagToggle={handleFlagToggle}
                isNew={newTicketIds.has(ticket.id)}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}
