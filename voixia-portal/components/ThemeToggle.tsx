"use client";

import { useTheme } from "@/hooks/useTheme";

// Bouton de bascule de thème — reprend l'icône lune/soleil de la landing.
export function ThemeToggle() {
  const { toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Basculer le thème"
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 9,
        border: "1px solid var(--border-2)",
        background: "var(--surface)",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span className="theme-icon" />
    </button>
  );
}
