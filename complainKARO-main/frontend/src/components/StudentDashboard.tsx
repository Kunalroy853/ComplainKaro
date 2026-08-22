import { useState, useEffect, useCallback } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { TicketCard } from './TicketCard';
import { SpidermanHanging } from './SpidermanHanging';
import { Footer } from './Footer';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../api/client';
import type { Ticket, PipelineInfo, User } from '../api/client';

interface StudentDashboardProps {
  token: string;
  user: User;
  onLogout: () => void;
}

export function StudentDashboard({ token, user, onLogout }: StudentDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPipeline, setLastPipeline] = useState<PipelineInfo | null>(null);
  const [activeNav, setActiveNav] = useState('product');

  const loadMyTickets = useCallback(async () => {
    try {
      const { tickets: rows } = await api.getMyTickets();
      setTickets(rows);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMyTickets(); }, [loadMyTickets]);

  // WebSocket to receive live updates
  useWebSocket({
    token,
    onMessage: useCallback((data: unknown) => {
      const msg = data as { type: string; data: any };
      if (msg.type === 'ticket:resolved') {
        setTickets(prev => prev.map(t => t.id === msg.data.ticketId ? { ...t, status: 'resolved' } : t));
      } else if (msg.type === 'ticket:deleted') {
        setTickets(prev => prev.filter(t => t.id !== msg.data.ticketId));
      }
    }, []),
  });

  function handleTicketCreated(ticket: Ticket, _isDuplicate: boolean, pipeline: PipelineInfo) {
    setTickets(prev => [ticket, ...prev]);
    setLastPipeline(pipeline);
  }

  const handleDeleteTicket = useCallback(async (id: string) => {
    try {
      await api.deleteTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete ticket');
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--clr-bg)', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* ── Hanging Scroll Interactive Spider-Man ──────────────────────────── */}
      <SpidermanHanging />

      {/* ── Nexora Animated Navigation Header ──────────────────────────────────────── */}
      <header style={{
        height: 76,
        padding: '0 2.5rem 0 5.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--clr-border)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(6, 8, 19, 0.85)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)',
        animation: 'slide-down 0.4s cubic-bezier(0.4, 0, 0.2, 1) both',
      }}>
        {/* Brand Logo with Pulsing Glow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.15rem', color: '#ffffff',
            boxShadow: 'var(--shadow-glow)',
            animation: 'logo-pulse 3s infinite alternate',
          }}>
            C
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
            Complain<span className="grad-text">KARO</span>
          </div>
        </div>

        {/* Center Animated Nav Links */}
        <nav style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(15, 20, 43, 0.6)', padding: '4px 8px',
          borderRadius: 'var(--r-full)', border: '1px solid var(--clr-border)',
        }}>
          {[
            { id: 'product', label: 'Product', href: '#hero' },
            { id: 'features', label: 'How it works', href: '#features' },
            { id: 'tickets', label: 'My Tickets', href: '#my-complaints' },
          ].map(item => (
            <a
              key={item.id}
              href={item.href}
              onClick={() => setActiveNav(item.id)}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--r-full)',
                color: activeNav === item.id ? '#ffffff' : 'var(--txt-secondary)',
                background: activeNav === item.id ? 'var(--grad-btn)' : 'transparent',
                fontWeight: activeNav === item.id ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                textDecoration: 'none',
                boxShadow: activeNav === item.id ? 'var(--shadow-btn)' : 'none',
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right User Profile & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            fontSize: '0.825rem', color: 'var(--txt-secondary)',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 'var(--r-full)',
            background: 'rgba(15, 20, 43, 0.8)', border: '1px solid var(--clr-border)'
          }}>
            <span className="status-dot status-online" />
            <span>{user.name} (Room {user.roomNumber})</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      {/* ── Nexora Hero Section ───────────────────────────────────────────── */}
      <section id="hero" style={{
        maxWidth: 1320,
        margin: '0 auto',
        padding: '4rem 2rem 3rem',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: '4rem',
        alignItems: 'center',
      }}>
        {/* Left Hero Column */}
        <div>
          <div className="eyebrow">
            HOSTEL COMPLAINT TRIAGE, REIMAGINED
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 4.5vw, 3.75rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
            color: '#ffffff',
          }}>
            Voice the complaint.<br />
            <span className="grad-text">Not just the typing.</span>
          </h1>

          <p style={{
            fontSize: '1.1rem',
            color: 'var(--txt-secondary)',
            lineHeight: 1.6,
            marginBottom: '2.5rem',
            maxWidth: 520,
          }}>
            ComplainKARO gives you instant voice complaint logging, code-mixed Hinglish speech-to-text, AI category & urgency triage, and smart pgvector duplicate detection.
          </p>

          {/* Action Button Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '3.5rem' }}>
            <a href="#recorder-box" className="btn btn-primary btn-lg">
              Start recording →
            </a>
            <a href="#my-complaints" className="btn btn-ghost btn-lg" style={{ border: 'none' }}>
              View my tickets ›
            </a>
          </div>

          <div style={{ height: 1, background: 'var(--clr-border)', width: '100%', marginBottom: '2.5rem' }} />

          {/* Bottom 3-Column Feature Specs */}
          <div id="features" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>7 categories</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', marginTop: 2 }}>Auto AI Triage</div>
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>Hinglish STT</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', marginTop: 2 }}>Offline Resilience</div>
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>pgvector Dedup</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', marginTop: 2 }}>Cosine Search</div>
            </div>
          </div>
        </div>

        {/* Right Hero Column: Interactive Mac Recorder Window */}
        <div id="recorder-box">
          <VoiceRecorder token={token} onTicketCreated={handleTicketCreated} />
        </div>
      </section>

      {/* ── Pipeline Triage Banner ─────────────────────────────── */}
      {lastPipeline && (
        <section style={{ maxWidth: 1320, margin: '0 auto 1.5rem', padding: '0 2rem' }}>
          <div className="card" style={{ background: 'rgba(15, 20, 43, 0.9)', border: '1px solid #38bdf8' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
              ⚙ LAST SUBMISSION PIPELINE METRICS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: '0.8rem' }}>
              <div><span style={{ color: 'var(--txt-muted)' }}>STT Engine:</span> <strong style={{ color: '#fff' }}>{lastPipeline.transcriptSource}</strong></div>
              <div><span style={{ color: 'var(--txt-muted)' }}>Classifier:</span> <strong style={{ color: '#fff' }}>{lastPipeline.classificationSource}</strong></div>
              <div><span style={{ color: 'var(--txt-muted)' }}>Embedding:</span> <strong style={{ color: lastPipeline.embeddingGenerated ? '#10b981' : '#f59e0b' }}>{lastPipeline.embeddingGenerated ? '✓ Generated' : 'Skipped'}</strong></div>
              <div><span style={{ color: 'var(--txt-muted)' }}>pgvector Dedup:</span> <strong style={{ color: lastPipeline.dedupChecked ? '#10b981' : '#f59e0b' }}>{lastPipeline.dedupChecked ? '✓ Checked' : 'Skipped'}</strong></div>
            </div>
          </div>
        </section>
      )}

      {/* ── My Tickets Section ───────────────────────────────────────────── */}
      <section id="my-complaints" style={{ maxWidth: 1320, margin: '0 auto', padding: '2rem 2rem 6rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <div className="eyebrow">TICKET HISTORY</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              My Complaints ({tickets.length})
            </h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={loadMyTickets}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--txt-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📝</div>
            <p style={{ fontSize: '1.1rem', color: 'var(--txt-secondary)' }}>No complaints submitted yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: 4 }}>Use the interactive recorder above to lodge your first complaint.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.25rem' }}>
            {tickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} onDelete={handleDeleteTicket} />
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <Footer />

      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes logo-pulse {
          0% { box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
          100% { box-shadow: 0 0 30px rgba(56, 189, 248, 0.7); }
        }
      `}</style>
    </div>
  );
}
