import React from 'react';

/**
 * Logotipo Vetorial Oficial JHE Engenharia
 * Tipografia serifada clássica JHE com arco ciano e subtítulo "engenharia"
 */
export default function JheLogo({ className = "h-9 w-auto", variant = "default" }) {
  const isDark = variant === "dark";
  const textColor = isDark ? "#F8FAFC" : "#0E284E";
  const arcColor = isDark ? "#61CBE8" : "#0284C7";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 435 270"
      className={className}
      fill="none"
      role="img"
      aria-label="JHE Engenharia"
    >
      {/* Tipografia Serifada Clássica JHE */}
      <text
        x="32"
        y="170"
        fontFamily="'Times New Roman', 'Baskerville', 'Georgia', serif"
        fontSize="195"
        fontWeight="bold"
        fill={textColor}
      >
        J
      </text>
      <text
        x="135"
        y="170"
        fontFamily="'Times New Roman', 'Baskerville', 'Georgia', serif"
        fontSize="195"
        fontWeight="bold"
        fill={textColor}
      >
        H
      </text>
      <text
        x="330"
        y="170"
        fontFamily="'Times New Roman', 'Baskerville', 'Georgia', serif"
        fontSize="195"
        fontWeight="bold"
        fill={textColor}
      >
        E
      </text>

      {/* Arco Curvo Celeste */}
      <path
        d="M 60 220 Q 217 175 410 220"
        fill="none"
        stroke={arcColor}
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Subtítulo engenharia */}
      <text
        x="217"
        y="246"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
        fontSize="28"
        fontWeight="500"
        letterSpacing="7"
        fill={textColor}
      >
        engenharia
      </text>
    </svg>
  );
}
