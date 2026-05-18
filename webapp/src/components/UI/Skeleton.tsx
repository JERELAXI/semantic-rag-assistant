import { useTheme } from '../../hooks/useTheme';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const t = useTheme();
  return (
    <>
      <style>{`@keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
      <div
        style={{
          width,
          height,
          borderRadius,
          background: t.border,
          animation: 'skeletonPulse 1.6s ease-in-out infinite',
          flexShrink: 0,
          ...style,
        }}
      />
    </>
  );
}
