/** Round avatar: the user's photo if they have one, else their initial. */
export default function Avatar({ user, size = 44, className = '', style }) {
  const initial = (user?.name || 'B').trim().charAt(0).toUpperCase();
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.45), ...style }}>
      {user?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar_url} alt="" />
      ) : (
        initial
      )}
    </span>
  );
}
