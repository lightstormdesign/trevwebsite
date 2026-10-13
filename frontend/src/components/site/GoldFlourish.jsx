// Ornate gold divider in the TREV logo's metal: hairlines that taper out from a small sunburst diamond,
// with a bead and a tiny diamond along each arm. `width` in px (scales the whole ornament).
export const GoldFlourish = ({ width = 320, className = "", style }) => {
  const id = "gf" + Math.round(width);
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 28"
      width={width}
      height={(width * 28) / 400}
      className={className}
      style={{ overflow: "visible", filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.55))", ...style }}
    >
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.45" stopColor="#f2c66a" />
          <stop offset="1" stopColor="#b57a2c" />
        </linearGradient>
        <linearGradient id={`${id}-arm`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2c66a" stopOpacity="0" />
          <stop offset="0.55" stopColor="#f2c66a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff1cf" />
        </linearGradient>
      </defs>
      {[1, -1].map((dir) => (
        <g key={dir} transform={dir === 1 ? undefined : "translate(400 0) scale(-1 1)"}>
          {/* tapering arm */}
          <path d="M8 14 L170 12.9 L170 15.1 Z" fill={`url(#${id}-arm)`} />
          {/* scroll curl near the centre */}
          <path d="M150 14 C158 6, 168 6, 170 11" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M150 14 C158 22, 168 22, 170 17" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="118" cy="14" r="1.8" fill={`url(#${id}-metal)`} />
          <path d="M70 14 L74 11 L78 14 L74 17 Z" fill={`url(#${id}-metal)`} />
        </g>
      ))}
      {/* centre: diamond with short rays, a nod to the logo's sun */}
      <g fill={`url(#${id}-metal)`}>
        <path d="M200 3 L208 14 L200 25 L192 14 Z" />
        <path d="M200 7.5 L204.5 14 L200 20.5 L195.5 14 Z" fill="#fff8e6" />
        <path d="M181 14 L188 12.6 L188 15.4 Z" />
        <path d="M219 14 L212 12.6 L212 15.4 Z" />
      </g>
    </svg>
  );
};
