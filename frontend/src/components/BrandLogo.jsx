import React from 'react';

export default function BrandLogo({ height = 34, showText = true, textColor }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        fontWeight: 800,
        letterSpacing: '-0.025em',
        color: textColor || 'inherit'
      }}
    >
      <img
        src="/eventease-logo.png"
        alt="EventEase logo"
        className="brand-logo-img"
        style={{
          height: `${height}px`,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
      {showText && <span>EventEase</span>}
    </span>
  );
}
