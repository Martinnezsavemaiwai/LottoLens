/**
 * Skeleton UI — Shimmer loading component to prevent layout shifts.
 * @param {Object} props
 * @param {'box' | 'circle' | 'text'} [props.variant='box']
 * @param {string|number} [props.width='100%']
 * @param {string|number} [props.height='100%']
 * @param {string} [props.className='']
 * @param {Object} [props.style={}]
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
