import React from 'react'
import focusForgeMark from '../assets/focusforge-mark.png'

export function ForgeMark({ size = 38, ring = false, className = '' }) {
  return (
    <div
      className={`forge-mark-shell ${ring ? 'forge-mark-ring' : ''} ${className}`}
      style={{ width: size, height: size, padding: ring ? size * 0.14 : undefined }}
      aria-hidden="true"
    >
      <img src={focusForgeMark} alt="" className="forge-mark-image" />
    </div>
  )
}

export function ForgeWordmark({ compact = false, className = '' }) {
  return (
    <div className={`forge-wordmark ${compact ? 'forge-wordmark-compact' : ''} ${className}`}>
      <ForgeMark size={compact ? 26 : 34} />
      <div className="leading-none">
        <div className="forge-wordmark-text">
          <span>FOCUS</span><span className="forge-wordmark-accent">FORGE</span>
        </div>
        {!compact && <div className="forge-wordmark-tagline">TURN DISTRACTIONS INTO DISCIPLINE</div>}
      </div>
    </div>
  )
}
