import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useT, useLang } from '../contexts/LangContext';
import { FONT } from '../styles/theme';

const FEATURES = [
  { emoji: '📄', titleKey: 'landing.features.docs.title',      descKey: 'landing.features.docs.desc' },
  { emoji: '🔍', titleKey: 'landing.features.search.title',    descKey: 'landing.features.search.desc' },
  { emoji: '💬', titleKey: 'landing.features.chat.title',      descKey: 'landing.features.chat.desc' },
  { emoji: '🔌', titleKey: 'landing.features.extension.title', descKey: 'landing.features.extension.desc' },
] as const;

const STEPS = [
  { num: 1, labelKey: 'landing.how.step1.label', descKey: 'landing.how.step1.desc' },
  { num: 2, labelKey: 'landing.how.step2.label', descKey: 'landing.how.step2.desc' },
  { num: 3, labelKey: 'landing.how.step3.label', descKey: 'landing.how.step3.desc' },
] as const;

export function LandingPage() {
  const t = useTheme();
  const tx = useT();
  const { lang, setLang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ background: t.bg, minHeight: '100vh', fontFamily: FONT }}>

      {/* ── Sticky nav ───────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: `${t.bg}F0`,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${t.borderSubtle}`,
        }}
      >
        <div
          style={{
            maxWidth: 1000, margin: '0 auto', padding: '0 32px',
            height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Semantic RAG</span>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* UA / EN toggle */}
            <div
              style={{
                display: 'flex', gap: 2, padding: 3,
                borderRadius: 7, background: t.surfaceAlt,
                border: `1px solid ${t.borderSubtle}`,
              }}
            >
              {(['uk', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: '3px 9px', borderRadius: 4, border: 'none',
                    background: lang === l ? t.accent : 'transparent',
                    color: lang === l ? '#fff' : t.textTri,
                    fontSize: 10, fontWeight: 700, fontFamily: FONT,
                    cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s',
                  }}
                >
                  {l === 'uk' ? 'UA' : 'EN'}
                </button>
              ))}
            </div>

            {/* Увійти */}
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '7px 16px', borderRadius: 8,
                border: `1px solid ${t.border}`, background: 'transparent',
                color: t.textSec, fontSize: 13, fontFamily: FONT, cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSec; }}
            >
              {tx('landing.cta.login')}
            </button>

            {/* Почати */}
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none',
                background: t.accent, color: '#fff',
                fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {tx('landing.cta.start')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 32px 88px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Radial accent glow */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 75% 55% at 50% -5%, ${t.accent}18, transparent)`,
          }}
        />

        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          {/* Big logo icon */}
          <div
            style={{
              width: 72, height: 72, borderRadius: 20,
              background: t.accentSoft, border: `1.5px solid ${t.accentBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="1.75">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 46, fontWeight: 800, color: t.text,
              margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.02em',
            }}
          >
            Semantic RAG Assistant
          </h1>

          <p style={{ fontSize: 19, color: t.accent, fontWeight: 500, margin: '0 0 14px', lineHeight: 1.45 }}>
            {tx('landing.tagline')}
          </p>

          <p
            style={{
              fontSize: 15, color: t.textSec, lineHeight: 1.75,
              margin: '0 auto 44px', maxWidth: 520,
            }}
          >
            {tx('landing.description')}
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '12px 28px', borderRadius: 10, border: 'none',
                background: t.accent, color: '#fff',
                fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {tx('landing.cta.start')} →
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '12px 28px', borderRadius: 10,
                border: `1px solid ${t.border}`, background: 'transparent',
                color: t.textSec, fontSize: 14, fontFamily: FONT, cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSec; }}
            >
              {tx('landing.cta.login')}
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px', background: t.surface, borderTop: `1px solid ${t.borderSubtle}`, borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <SectionHeading label={tx('landing.features.heading')} t={t} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.titleKey}
                style={{
                  padding: '24px 22px', borderRadius: 12,
                  border: `1px solid ${t.border}`, background: t.surfaceAlt,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = t.accentBorder;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${t.accent}0E`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = t.border;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, marginBottom: 14,
                  }}
                >
                  {f.emoji}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT, margin: '0 0 6px' }}>
                  {tx(f.titleKey)}
                </p>
                <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, margin: 0, lineHeight: 1.6 }}>
                  {tx(f.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <SectionHeading label={tx('landing.how.heading')} t={t} />
          <div
            style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'center', gap: 0, flexWrap: 'wrap',
            }}
          >
            {STEPS.map((step, i) => (
              <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start' }}>
                {/* Step card */}
                <div
                  style={{
                    width: 210, textAlign: 'center', padding: '0 16px',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: t.accentSoft, border: `1.5px solid ${t.accentBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 14px',
                      fontSize: 18, fontWeight: 800, color: t.accent, fontFamily: FONT,
                    }}
                  >
                    {step.num}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT, margin: '0 0 6px' }}>
                    {tx(step.labelKey)}
                  </p>
                  <p style={{ fontSize: 12, color: t.textSec, fontFamily: FONT, margin: 0, lineHeight: 1.65 }}>
                    {tx(step.descKey)}
                  </p>
                </div>

                {/* Arrow connector (not after last step) */}
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      alignSelf: 'flex-start', paddingTop: 10,
                      fontSize: 20, color: t.textTri, flexShrink: 0, userSelect: 'none',
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '28px 32px',
          borderTop: `1px solid ${t.borderSubtle}`,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, color: t.textTri, fontFamily: FONT, margin: 0 }}>
          {tx('landing.footer')}
        </p>
      </footer>
    </div>
  );
}

function SectionHeading({ label, t }: { label: string; t: any }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <h2
        style={{
          fontSize: 22, fontWeight: 700, color: t.text,
          fontFamily: FONT, margin: 0,
        }}
      >
        {label}
      </h2>
      <div
        style={{
          width: 32, height: 3, borderRadius: 2,
          background: t.accent, margin: '10px auto 0',
        }}
      />
    </div>
  );
}
