/**
 * Accessible button — always meets 44×44px WCAG touch target.
 * @param {{ children: React.ReactNode, onClick?: Function, disabled?: boolean,
 *           variant?: 'primary'|'ghost', className?: string, ariaLabel?: string,
 *           type?: string }} props
 */
export default function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  ariaLabel,
  type = 'button',
}) {
  const cls = variant === 'ghost' ? 'btn-ghost' : 'btn-primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${cls} ${className}`}
    >
      {children}
    </button>
  )
}
