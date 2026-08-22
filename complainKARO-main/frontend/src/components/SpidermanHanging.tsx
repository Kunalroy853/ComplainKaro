import { useState, useEffect } from 'react';

export function SpidermanHanging() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
          const currentScroll = window.scrollY;
          const progress = totalScroll > 0 ? Math.min(Math.max(currentScroll / totalScroll, 0), 1) : 0;
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Web length extends continuously as user scrolls down the page simultaneously
  const baseWebLength = 76; // Starts right below sticky header
  const viewportTravel = typeof window !== 'undefined' ? Math.max(window.innerHeight - 150, 400) : 500;
  const currentWebHeight = baseWebLength + scrollProgress * viewportTravel;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 24, // Positioned on far left margin
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 
        Unbroken Web Line:
        Extends smoothly and simultaneously as user scrolls down the page.
      */}
      <div
        style={{
          width: 2,
          height: currentWebHeight,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(186,230,253,0.8) 100%)',
          boxShadow: '0 0 10px rgba(56, 189, 248, 0.9), 0 0 4px rgba(255, 255, 255, 1)',
          willChange: 'height',
        }}
      />

      {/* Spider-Man Avatar Hanging at bottom end of web */}
      <div
        style={{
          width: 48,
          height: 62,
          animation: 'spidey-bob 2.2s ease-in-out infinite alternate',
          transformOrigin: 'top center',
          filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.7))',
          marginTop: -2,
        }}
      >
        <svg
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', transform: 'rotate(180deg)' }}
        >
          {/* Head */}
          <ellipse cx="50" cy="85" rx="24" ry="30" fill="#e11d48" stroke="#9f1239" strokeWidth="3" />
          
          {/* Spider Lenses */}
          <path d="M 32 78 Q 42 70 48 84 Q 38 90 32 78 Z" fill="#ffffff" stroke="#000000" strokeWidth="3" />
          <path d="M 68 78 Q 58 70 52 84 Q 62 90 68 78 Z" fill="#ffffff" stroke="#000000" strokeWidth="3" />

          {/* Web Lines on Mask */}
          <path d="M 50 55 L 50 115 M 26 85 L 74 85 M 34 68 L 66 102 M 34 102 L 66 68" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />

          {/* Torso */}
          <path d="M 35 55 L 65 55 L 58 20 L 42 20 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="2" />

          {/* Blue Suit Details */}
          <path d="M 25 50 Q 35 30 42 20 L 30 10 Z" fill="#2563eb" />
          <path d="M 75 50 Q 65 30 58 20 L 70 10 Z" fill="#2563eb" />

          {/* Spider Chest Emblem */}
          <path d="M 50 35 L 46 42 L 50 46 L 54 42 Z" fill="#000000" />

          {/* Arms Holding Web Line */}
          <path d="M 35 50 L 20 20 L 48 2" stroke="#e11d48" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 65 50 L 80 20 L 52 2" stroke="#e11d48" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <style>{`
        @keyframes spidey-bob {
          0% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
          100% { transform: rotate(-4deg); }
        }
      `}</style>
    </div>
  );
}
