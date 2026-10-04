/** Re-mounts on every navigation, so each page eases in. */
export default function Template({ children }) {
  return <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>{children}</div>;
}
