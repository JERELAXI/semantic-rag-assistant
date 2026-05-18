export const darkTokens = {
  bg: '#111113',
  surface: '#1A1A1E',
  surfaceAlt: '#202026',
  border: '#2A2A32',
  borderSubtle: '#232328',
  text: '#E4E4DC',
  textSec: '#9C9C92',
  textTri: '#6B6B63',
  accent: '#6ACD8E',
  accentSoft: '#6ACD8E14',
  accentBorder: '#6ACD8E30',
  danger: '#E5534B',
  dangerSoft: '#E5534B18',
  userBub: '#26262B',
  citBg: '#6ACD8E18',
  citText: '#6ACD8E',
  inputBg: '#1A1A1E',
  scrollThumb: '#3C3C42',
  statusReady: '#6ACD8E',
  statusProc: '#F0B429',
  statusFail: '#E5534B',
  cardHover: '#22222A',
} as const;

export const lightTokens = {
  bg: '#F5F5F2',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAF8',
  border: '#E4E4DE',
  borderSubtle: '#ECECEA',
  text: '#1A1A18',
  textSec: '#6B6B63',
  textTri: '#9C9C92',
  accent: '#2D6A4F',
  accentSoft: '#2D6A4F10',
  accentBorder: '#2D6A4F28',
  danger: '#D32F2F',
  dangerSoft: '#D32F2F10',
  userBub: '#F0F0EC',
  citBg: '#2D6A4F14',
  citText: '#2D6A4F',
  inputBg: '#FFFFFF',
  scrollThumb: '#D4D4CC',
  statusReady: '#2D6A4F',
  statusProc: '#C68A05',
  statusFail: '#D32F2F',
  cardHover: '#F8F8F6',
} as const;

export type Tokens = { readonly [K in keyof typeof darkTokens]: string };

export const FONT = "'Outfit', system-ui, sans-serif";
export const MONO = "'IBM Plex Mono', 'SF Mono', monospace";
