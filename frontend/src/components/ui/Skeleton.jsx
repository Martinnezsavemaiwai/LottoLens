/**
 * Skeleton UI — Shimmer loading component to prevent Layout Shift
 * @param {{ variant: 'box' | 'circle' | 'text', width: string|number, height: string|number, className: string, style: Object }} props
 */
export default function Skeleton({ 
  variant = 'box', 
  width = '100%', 
  height = '100%', 
  className = '', 
  style = {} 
}) {
  const baseStyle = {
    width,
    height,
    borderRadius: variant === 'circle' ? '50%' : '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    ...style
  };

  return (
    <div 
      className={`shimmer ${className}`} 
      style={baseStyle}
      aria-hidden="true"
    />
  );
}
