/** Editorial page header: a small label, a large title, and actions on the right. */
export default function PageHead({ eyebrow, title, children }) {
  return (
    <header className="page-head">
      <div className="stack" style={{ gap: 8 }}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="h-page">{title}</h1>
      </div>
      {children && <div className="page-head-actions">{children}</div>}
    </header>
  );
}
