import Nav from '@/components/Nav';

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Nav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>
      <footer className="footer">
        <span className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--rose-deep)' }}>BookVerse</span>
        <span>© MMXXVI · Kept with care</span>
      </footer>
    </div>
  );
}
