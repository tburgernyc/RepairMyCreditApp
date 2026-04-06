/**
 * Base glassmorphism card surface.
 * @param {{ children: React.ReactNode, className?: string, as?: string }} props
 */
export default function Card({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`glass-surface card-radius p-6 ${className}`}>
      {children}
    </Tag>
  )
}
