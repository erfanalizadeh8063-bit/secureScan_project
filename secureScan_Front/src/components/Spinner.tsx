export default function Spinner({ size = 16 }: { size?: number }) {
  const s = `${size}px`;
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-300"
      style={{ width: s, height: s }}
      aria-label="loading"
    />
  );
}
