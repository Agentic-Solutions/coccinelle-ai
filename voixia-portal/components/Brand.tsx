// Marque VoixIA — reprise exacte de la landing : carré accent avec « V » + wordmark.
export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const mark = size === "lg" ? 32 : size === "sm" ? 24 : 28;
  const markFont = size === "lg" ? 18 : size === "sm" ? 14 : 16;
  const wordFont = size === "lg" ? 20 : size === "sm" ? 15 : 18;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span
        className="vx-mark"
        style={{ width: mark, height: mark, fontSize: markFont }}
      >
        V
      </span>
      <span
        style={{
          fontWeight: 600,
          fontSize: wordFont,
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}
      >
        VoixIA
      </span>
    </span>
  );
}
