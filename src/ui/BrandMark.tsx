/** The wordmark glyph — a branching lineage (small form → larger form). Inherits
 *  `currentColor`, so it takes on the chromatic accent wherever it's placed. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path d="M31 64 L60 38" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <circle cx="31" cy="64" r="11" fill="currentColor" />
      <circle cx="63" cy="34" r="15.5" fill="currentColor" />
    </svg>
  );
}
