import { useState } from 'react';

import type { Ticket, TicketCategory, TicketStatus } from '../api/client';

// ─── Category Metadata ────────────────────────────────────────────────────────
const CATEGORY_META: Record<TicketCategory, { icon: string; label: string; color: string; bg: string }> = {
  wifi:        { icon: '📶', label: 'WiFi & Network',  color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
  electricity: { icon: '⚡', label: 'Electricity',    color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  water:       { icon: '💧', label: 'Water Supply',   color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
  food:        { icon: '🍽️', label: 'Mess & Food',    color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  hygiene:     { icon: '🧹', label: 'Hygiene & Wash', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  security:    { icon: '🔒', label: 'Security & Lock',color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  maintenance: { icon: '🔧', label: 'Maintenance',   color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
  other:       { icon: '📋', label: 'General / Other',color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; badgeClass: string }> = {
  open: { label: 'Open', badgeClass: 'badge-open' },
  duplicate: { label: 'Duplicate', badgeClass: 'badge-dup' },
  flagged: { label: 'Needs Review', badgeClass: 'badge-flagged' },
  resolved: { label: 'Resolved', badgeClass: 'badge-resolved' },
};

// ─── Urgency Pill Indicator ───────────────────────────────────────────────────
function UrgencyPill({ score }: { score: number }) {
  const labels = ['', 'U1 - Low', 'U2 - Minor', 'U3 - Moderate', 'U4 - High', 'U5 - Critical'];
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 'var(--r-full)',
      background: 'rgba(15, 20, 43, 0.9)',
      border: '1px solid var(--clr-border)',
      fontSize: '0.75rem',
      fontWeight: 700,
      color: 'var(--txt-primary)',
    }}>
      <span className={`urgency-dot urgency-${score}`} />
      <span>{labels[score] || `U${score}`}</span>
    </div>
  );
}

// ─── Confidence Bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ec4899';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <span style={{ fontSize: '0.725rem', color: 'var(--txt-muted)', fontWeight: 600, minWidth: 85 }}>
        AI Confidence
      </span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '0.75rem', color, fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── TicketCard Component ─────────────────────────────────────────────────────
interface TicketCardProps {
  ticket: Ticket & { studentName?: string | null; roomNumber?: string | null };
  showActions?: boolean;
  onResolve?: (id: string) => void;
  onFlagToggle?: (id: string, current: TicketStatus) => void;
  onDelete?: (id: string) => void;
  isNew?: boolean;
}

export function TicketCard({ ticket, showActions, onResolve, onFlagToggle, onDelete, isNew }: TicketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const meta = CATEGORY_META[ticket.category] || CATEGORY_META.other;
  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const isResolved = ticket.status === 'resolved';
  const timeAgo = formatTimeAgo(ticket.createdAt);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000); // Auto-reset after 4s
      return;
    }
    setIsDeleting(true);
    onDelete?.(ticket.id);
  };

  return (
    <div
      className={`card ${isNew ? 'slide-up' : ''}`}
      style={{
        background: 'rgba(15, 20, 43, 0.85)',
        border: '1px solid var(--clr-border)',
        borderRadius: 'var(--r-lg)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        opacity: isDeleting ? 0.3 : isResolved ? 0.65 : 1,
        transition: 'all 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Category color top border accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: meta.color,
      }} />

      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {/* Left Category info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: meta.bg, border: `1px solid ${meta.color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', flexShrink: 0
          }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: meta.color }}>
              {meta.label}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--txt-muted)', marginTop: 1 }}>
              {ticket.studentName ? `${ticket.studentName} (Room ${ticket.roomNumber})` : 'Student Ticket'} · {timeAgo}
            </div>
          </div>
        </div>

        {/* Right Urgency Pill */}
        <UrgencyPill score={ticket.urgencyScore} />
      </div>

      {/* Status & Feature Badges Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className={`badge ${statusCfg.badgeClass}`}>
          {statusCfg.label}
        </span>

        {ticket.needsManualReview === 1 && (
          <span className="badge badge-review">
            ⚠ Manual Review
          </span>
        )}

        {ticket.reportCount > 1 && (
          <span className="badge badge-dup">
            ×{ticket.reportCount} Reports Clustered
          </span>
        )}

        {ticket.classificationSource === 'keyword' && (
          <span style={{
            fontSize: '0.65rem',
            padding: '2px 8px',
            borderRadius: 'var(--r-full)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--clr-border)',
            color: 'var(--txt-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            keyword-fallback
          </span>
        )}
      </div>

      {/* Transcript Text Quote Box */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          background: 'rgba(6, 8, 19, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 'var(--r-md)',
          padding: '0.875rem 1rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        title="Click to expand/collapse full transcript"
      >
        <p style={{
          fontSize: '0.875rem',
          color: '#ffffff',
          lineHeight: 1.5,
          margin: 0,
          fontStyle: 'italic',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 'unset' : 3,
          WebkitBoxOrient: 'vertical',
        }}>
          "{ticket.transcript}"
        </p>
      </div>

      {/* Bottom Audio & Confidence Footer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
        <ConfidenceBar score={ticket.confidenceScore} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {onDelete ? (
            <button
              className="btn btn-sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              style={{
                background: confirmDelete ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: confirmDelete ? '#f87171' : '#ef4444',
                border: `1px solid ${confirmDelete ? '#ef4444' : 'rgba(239, 68, 68, 0.25)'}`,
                borderRadius: 'var(--r-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 12px',
                transition: 'all 0.2s ease',
              }}
            >
              {isDeleting ? '⏳ Deleting...' : confirmDelete ? '⚠️ Click to Confirm Delete' : '🗑 Delete'}
            </button>
          ) : <div />}


        </div>
      </div>

      {/* Warden Action Buttons */}
      {showActions && !isResolved && (
        <div style={{ display: 'flex', gap: 10, paddingTop: 6, borderTop: '1px solid var(--clr-border)' }}>
          <button
            className="btn btn-sm"
            onClick={(e) => { e.stopPropagation(); onResolve?.(ticket.id); }}
            style={{
              flex: 1,
              background: 'linear-gradient(90deg, #10b981, #059669)',
              color: '#ffffff',
              borderRadius: 'var(--r-full)',
              fontWeight: 700,
            }}
          >
            ✓ Mark Resolved
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => { e.stopPropagation(); onFlagToggle?.(ticket.id, ticket.status); }}
            style={{ borderRadius: 'var(--r-full)' }}
          >
            {ticket.status === 'flagged' ? '↩ Re-open' : '⚑ Flag Review'}
          </button>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
