import { Icon } from './Icons'

export function Stat({ title, value, icon }) {
  return (
    <article className="stat-card">
      <span className="stat-head">
        {icon && (
          <span className="stat-icon">
            <Icon name={icon} size={18} />
          </span>
        )}
        <span>{title}</span>
      </span>
      <strong>{value}</strong>
    </article>
  )
}
