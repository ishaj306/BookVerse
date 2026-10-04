'use client';

/**
 * Underlined text tabs. Lighter than a row of chips, and the underline slides
 * in on the active one.
 *
 * @param {{ id: string, label: string, count?: number }[]} items
 */
export default function Tabs({ items, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={`tab ${value === item.id ? 'on' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count != null && <span className="tab-count num">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
