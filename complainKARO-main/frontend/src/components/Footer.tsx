export function Footer() {
  return (
    <footer style={{
      background: 'rgba(6, 8, 19, 0.95)',
      borderTop: '1px solid var(--clr-border)',
      padding: '4rem 2.5rem 2.5rem',
      marginTop: 'auto',
      position: 'relative',
      zIndex: 10,
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '2.5rem',
          marginBottom: '3rem',
        }}>
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--grad-brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.1rem', color: '#ffffff',
                boxShadow: 'var(--shadow-glow)',
              }}>
                C
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Complain<span className="grad-text">KARO</span>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--txt-secondary)', lineHeight: 1.6, maxWidth: 300 }}>
              AI-Powered Hostel Complaint Triage System with code-mixed Hinglish Speech-to-Text, pgvector deduplication, and automated routing.
            </p>
          </div>

          {/* Quick Links Col */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1rem' }}>
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <li><a href="#hero" style={{ color: 'var(--txt-secondary)' }}>Home</a></li>
              <li><a href="#recorder-box" style={{ color: 'var(--txt-secondary)' }}>Voice Complaint Recorder</a></li>
              <li><a href="#my-complaints" style={{ color: 'var(--txt-secondary)' }}>My Complaints & History</a></li>
            </ul>
          </div>

          {/* Technology Col */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1rem' }}>
              Architecture
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--txt-secondary)' }}>
              <li>🎤 Browser Speech-to-Text</li>
              <li>🤖 Gemini AI Classification</li>
              <li>🔍 pgvector Cosine Search</li>
              <li>⚡ Real-time WebSocket Push</li>
            </ul>
          </div>

          {/* Credits Col */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1rem' }}>
              Created By
            </h4>
            <div style={{
              background: 'rgba(15, 20, 43, 0.8)',
              border: '1px solid var(--clr-border)',
              borderRadius: 14,
              padding: '1rem 1.1rem',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                PROJECT DEVELOPERS
              </div>
              <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                KUNAL ROY & SIDDHARTH SINGH
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--txt-secondary)', marginTop: 4 }}>
                ComplainKARO Hostel Triage System
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid var(--clr-border)',
          paddingTop: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.825rem',
          color: 'var(--txt-muted)',
        }}>
          <div>© 2026 ComplainKARO. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
