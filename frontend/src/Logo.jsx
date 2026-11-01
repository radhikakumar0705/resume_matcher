import React from "react";

// Brand mark (document + check) drawn as line art in the palette, so it sits
// directly on the background with no box.
export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M7 5.5A2.5 2.5 0 0 1 9.5 3H19l6 6v17.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 7 26.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M19 3v4.5A1.5 1.5 0 0 0 20.5 9H25" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11.5 17.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Lowercase wordmark + mark, like the reference's "ventriloc" logo
function Logo() {
  return (
    <span className="logo">
      <span className="logo-word">resume matcher</span>
      <LogoMark size={26} />
    </span>
  );
}

export default Logo;
