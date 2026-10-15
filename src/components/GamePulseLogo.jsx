import React from "react";

/**
 * GamePulse vector logo.
 * `variant="auto"` adapts to the current text color for the wordmark.
 * The emblem keeps the GamePulse mint/emerald brand colors in both themes.
 */
export default function GamePulseLogo({
  size = 42,
  showWordmark = true,
  variant = "auto",
  className = "",
}) {
  const wordColor =
    variant === "light"
      ? "#F8FAFC"
      : variant === "dark"
        ? "#111827"
        : "currentColor";

  return (
    <span
      className={`inline-flex items-center gap-3 ${className}`}
      style={{ color: wordColor }}
      role="img"
      aria-label="GamePulse"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="gamepulse-mint"
            x1="8"
            y1="7"
            x2="55"
            y2="57"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#69F0C2" />
            <stop offset="1" stopColor="#00D6A0" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="62" height="62" rx="18" fill="#071411" />
        <path
          d="M47.8 17.1A22 22 0 1 0 53.7 32"
          stroke="url(#gamepulse-mint)"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M32 17.5A14.5 14.5 0 1 0 46.5 32"
          stroke="#B8FFE7"
          strokeOpacity=".9"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M13.5 35.5H23L28 27L34 39L39 31.5H50"
          stroke="#69F0C2"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="31.5" r="3.1" fill="#00D6A0" />
      </svg>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[1.05rem] font-extrabold tracking-[-0.035em]">
            GamePulse<span style={{ color: "#00D6A0" }}>.</span>
          </span>
          <span className="mt-1 text-[0.68rem] font-medium tracking-wide opacity-65">
            Deal monitoring
          </span>
        </span>
      )}
    </span>
  );
}
