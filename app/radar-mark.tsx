export function RadarMark({ size }: { size: number }) {
  const s = size;
  return (
    <div style={{ width: s, height: s, background: "#141C2B", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s * 0.78} height={s * 0.78} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="none" stroke="#3A4760" strokeWidth="1.5" />
        <circle cx="22" cy="22" r="12" fill="none" stroke="#3A4760" strokeWidth="1.5" />
        <path d="M22 22 L22 2 A20 20 0 0 1 39.3 12 Z" fill="#7D9DF5" fillOpacity="0.35" />
        <line x1="22" y1="22" x2="22" y2="2" stroke="#7D9DF5" strokeWidth="2" />
        <circle cx="31" cy="11" r="2.6" fill="#F0B04D" />
        <circle cx="13" cy="28" r="2" fill="#4CC7B3" />
      </svg>
    </div>
  );
}
