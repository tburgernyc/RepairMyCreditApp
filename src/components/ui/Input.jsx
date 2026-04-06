/**
 * Accessible text input with inset glass styling.
 * @param {{ id: string, label: string, hideLabel?: boolean, className?: string }} props
 */
export default function Input({
  id,
  label,
  hideLabel = false,
  className = '',
  ...rest
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'text-subheader'}
      >
        {label}
      </label>
      <input
        id={id}
        className={`surface-inset rounded-xl px-4 py-3 text-sm text-slate-800
                    placeholder-slate-400 w-full
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50
                    ${className}`}
        {...rest}
      />
    </div>
  )
}
