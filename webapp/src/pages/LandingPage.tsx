import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FileText, Globe, MessageSquare, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useT, useLang } from '../contexts/LangContext';
import { FONT } from '../styles/theme';

function GraphIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="16" y2="5.1" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="8" y2="5.1" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="4" y2="12" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="8" y2="18.9" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="12" y1="12" x2="16" y2="18.9" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <circle cx="20" cy="12" r="2" fill={color} opacity="0.7"/>
      <circle cx="16" cy="5.1" r="2" fill={color} opacity="0.7"/>
      <circle cx="8" cy="5.1" r="2" fill={color} opacity="0.7"/>
      <circle cx="4" cy="12" r="2" fill={color} opacity="0.7"/>
      <circle cx="8" cy="18.9" r="2" fill={color} opacity="0.7"/>
      <circle cx="16" cy="18.9" r="2" fill={color} opacity="0.7"/>
      <circle cx="12" cy="12" r="3.5" fill={color}/>
    </svg>
  );
}

const FEATURES = [
  { Icon: FileText,     titleKey: 'landing.features.docs.title',      descKey: 'landing.features.docs.desc' },
  { Icon: Search,       titleKey: 'landing.features.search.title',    descKey: 'landing.features.search.desc' },
  { Icon: MessageSquare, titleKey: 'landing.features.chat.title',     descKey: 'landing.features.chat.desc' },
  { Icon: Globe,        titleKey: 'landing.features.extension.title', descKey: 'landing.features.extension.desc' },
];

const STEPS = [
  { num: 1, labelKey: 'landing.how.step1.label', descKey: 'landing.how.step1.desc' },
  { num: 2, labelKey: 'landing.how.step2.label', descKey: 'landing.how.step2.desc' },
  { num: 3, labelKey: 'landing.how.step3.label', descKey: 'landing.how.step3.desc' },
];

const STATS = [
  { num: '4',   labelKey: 'landing.stats.formats.label',     subKey: 'landing.stats.formats.sub' },
  { num: '3',   labelKey: 'landing.stats.searchModes.label', subKey: 'landing.stats.searchModes.sub' },
  { num: 'SSE', labelKey: 'landing.stats.streaming.label',   subKey: 'landing.stats.streaming.sub' },
  { num: '2',   labelKey: 'landing.stats.providers.label',   subKey: 'landing.stats.providers.sub' },
];

const TECH = ['Python', 'FastAPI', 'PostgreSQL', 'pgvector', 'React', 'TypeScript', 'OpenAI', 'NVIDIA NIM'];

export function LandingPage() {
  const t = useTheme();
  const tx = useT();
  const { lang, setLang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ background: t.bg, minHeight: '100vh', fontFamily: FONT }}>
      <style>{`
        @keyframes heroGlow1 {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50%       { opacity: 0.24; transform: scale(1.1); }
        }
        @keyframes heroGlow2 {
          0%, 100% { opacity: 0.07; transform: scale(1.1); }
          50%       { opacity: 0.16; transform: scale(0.97); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes dashScroll {
          to { background-position: 18px 0; }
        }
      `}</style>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <GraphIcon size={14} color={t.accent} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Semantic RAG</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
      <section style={{ padding: '80px 32px 72px', position: 'relative', overflow: 'hidden' }}>
        {/* Animated gradient blobs */}
        <div
          style={{
            position: 'absolute', top: '-30%', left: '35%', right: '-10%', bottom: '-30%',
            pointerEvents: 'none',
            background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${t.accent}22, transparent)`,
            animation: 'heroGlow1 8s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute', top: '-20%', left: '-20%', right: '45%', bottom: '-20%',
            pointerEvents: 'none',
            background: `radial-gradient(ellipse 55% 55% at 50% 50%, ${t.accent}14, transparent)`,
            animation: 'heroGlow2 8s ease-in-out infinite',
          }}
        />

        <div
          style={{
            maxWidth: 1000, margin: '0 auto', position: 'relative',
            display: 'flex', alignItems: 'center', gap: 56, flexWrap: 'wrap',
          }}
        >
          {/* Left: heading + CTAs */}
          <div style={{ flex: '1 1 380px', minWidth: 280 }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: 18,
                background: t.accentSoft, border: `1.5px solid ${t.accentBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 28,
              }}
            >
              <GraphIcon size={32} color={t.accent} />
            </div>

            <h1
              style={{
                fontSize: 44, fontWeight: 800, color: t.text,
                margin: '0 0 14px', lineHeight: 1.15, letterSpacing: '-0.02em',
              }}
            >
              Semantic RAG{' '}
              <span style={{ color: t.accent }}>Assistant</span>
            </h1>

            <p style={{ fontSize: 18, color: t.accent, fontWeight: 500, margin: '0 0 12px', lineHeight: 1.45 }}>
              {tx('landing.tagline')}
            </p>

            <p
              style={{
                fontSize: 15, color: t.textSec, lineHeight: 1.75,
                margin: '0 0 36px', maxWidth: 440,
              }}
            >
              {tx('landing.description')}
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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

          {/* Right: chat mockup illustration */}
          <div
            style={{
              flex: '0 1 290px', minWidth: 240,
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 16,
                padding: '16px',
                boxShadow: `0 24px 64px ${t.accent}18`,
              }}
            >
              {/* KB header */}
              <div
                style={{
                  borderBottom: `1px solid ${t.borderSubtle}`,
                  paddingBottom: 10, marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.accent }}/>
                <span style={{ fontSize: 11, color: t.textSec, fontFamily: FONT }}>Research Notes.pdf</span>
              </div>

              {/* User bubble */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <div
                  style={{
                    background: t.accent, color: '#fff',
                    borderRadius: '10px 10px 2px 10px',
                    padding: '8px 12px', fontSize: 12, maxWidth: 180, lineHeight: 1.5,
                  }}
                >
                  {tx('landing.mockup.userMsg')}
                </div>
              </div>

              {/* Assistant bubble */}
              <div
                style={{
                  background: t.surfaceAlt, border: `1px solid ${t.borderSubtle}`,
                  borderRadius: '2px 10px 10px 10px',
                  padding: '10px 12px', fontSize: 12, color: t.text, lineHeight: 1.65,
                  marginBottom: 8,
                }}
              >
                {tx('landing.mockup.aiMsg')}
                {' '}
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 16, height: 16,
                    background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                    borderRadius: 4, fontSize: 9, color: t.accent, fontWeight: 700,
                    marginLeft: 2, verticalAlign: 'middle', cursor: 'pointer',
                  }}
                >
                  1
                </span>
              </div>

              {/* Citation */}
              <div
                style={{
                  padding: '6px 10px',
                  background: t.accentSoft, borderRadius: 6,
                  border: `1px solid ${t.accentBorder}`,
                  display: 'flex', gap: 6, alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: 10, color: t.accent, fontWeight: 700, fontFamily: FONT, flexShrink: 0 }}>[1]</span>
                <span style={{ fontSize: 10, color: t.textSec, fontFamily: FONT, lineHeight: 1.4 }}>
                  {tx('landing.mockup.citation')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '48px 32px 56px',
          borderTop: `1px solid ${t.borderSubtle}`,
          borderBottom: `1px solid ${t.borderSubtle}`,
        }}
      >
        <div
          style={{
            maxWidth: 1000, margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16,
          }}
        >
          {STATS.map((s) => (
            <div
              key={s.labelKey}
              style={{
                padding: '20px 22px', borderRadius: 12,
                border: `1px solid ${t.border}`, background: t.surfaceAlt,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = t.accentBorder;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${t.accent}12`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = t.border;
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  fontSize: s.num.length > 2 ? 22 : 28,
                  fontWeight: 800, color: t.accent,
                  fontFamily: FONT, lineHeight: 1, marginBottom: 6,
                }}
              >
                {s.num}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT, marginBottom: 3 }}>
                {tx(s.labelKey)}
              </div>
              <div style={{ fontSize: 11, color: t.textTri, fontFamily: FONT }}>
                {tx(s.subKey)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '72px 32px',
          background: t.surface,
          borderBottom: `1px solid ${t.borderSubtle}`,
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <SectionHeading label={tx('landing.features.heading')} t={t} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEATURES.map(({ Icon, titleKey, descKey }, i) => {
              const hovered = hoveredFeature === i;
              return (
                <div
                  key={titleKey}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 20,
                    padding: '20px 24px', borderRadius: 12,
                    border: `1px solid ${hovered ? t.accentBorder : t.border}`,
                    background: hovered ? t.surfaceAlt : 'transparent',
                    transform: hovered ? 'translateY(-2px)' : 'none',
                    boxShadow: hovered ? `0 8px 28px ${t.accent}10` : 'none',
                    transition: 'all 0.18s ease',
                    cursor: 'default',
                    marginLeft: i % 2 === 1 ? 24 : 0,
                    marginRight: i % 2 === 0 ? 24 : 0,
                  }}
                >
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon size={22} color={t.accent} />
                  </div>
                  <div style={{ paddingTop: 2 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: t.text, fontFamily: FONT, margin: '0 0 6px' }}>
                      {tx(titleKey)}
                    </p>
                    <p style={{ fontSize: 13, color: t.textSec, fontFamily: FONT, margin: 0, lineHeight: 1.65 }}>
                      {tx(descKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <SectionHeading label={tx('landing.how.heading')} t={t} />
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap',
            }}
          >
            {STEPS.map((step, i) => (
              <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 220, textAlign: 'center', padding: '0 12px', flexShrink: 0 }}>
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: t.accent, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 800, fontFamily: FONT,
                      margin: '0 auto 16px',
                      boxShadow: `0 4px 20px ${t.accent}35`,
                    }}
                  >
                    {step.num}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT, margin: '0 0 8px' }}>
                    {tx(step.labelKey)}
                  </p>
                  <p style={{ fontSize: 12, color: t.textSec, fontFamily: FONT, margin: 0, lineHeight: 1.65 }}>
                    {tx(step.descKey)}
                  </p>
                </div>

                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 56, height: 2, flexShrink: 0, marginBottom: 48,
                      background: `repeating-linear-gradient(to right, ${t.accent} 0, ${t.accent} 6px, transparent 6px, transparent 12px)`,
                      backgroundSize: '18px 2px',
                      animation: 'dashScroll 0.8s linear infinite',
                      opacity: 0.45,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ───────────────────────────────────────────────── */}
      <section
        style={{
          padding: '40px 32px 56px',
          borderTop: `1px solid ${t.borderSubtle}`,
          background: t.surface,
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 11, fontWeight: 700, color: t.textTri,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 20, fontFamily: FONT,
            }}
          >
            {tx('landing.tech.heading')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {TECH.map((badge) => (
              <span
                key={badge}
                style={{
                  padding: '5px 14px', borderRadius: 6,
                  border: `1px solid ${t.borderSubtle}`,
                  background: t.surfaceAlt,
                  fontSize: 12, color: t.textSec,
                  fontFamily: FONT, fontWeight: 500,
                }}
              >
                {badge}
              </span>
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
