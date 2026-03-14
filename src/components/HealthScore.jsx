import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

function getScoreColor(score) {
  if (score >= 85) return { color: '#10b981', label: 'Excellent', glow: 'rgba(16,185,129,0.4)' }
  if (score >= 70) return { color: '#06b6d4', label: 'Good',      glow: 'rgba(6,182,212,0.4)' }
  if (score >= 55) return { color: '#f59e0b', label: 'Fair',      glow: 'rgba(245,158,11,0.4)' }
  return                  { color: '#ef4444', label: 'Poor',      glow: 'rgba(239,68,68,0.4)' }
}

export default function HealthScore({ score }) {
  const [displayScore, setDisplayScore] = useState(0)
  const animRef = useRef()
  const { color, label, glow } = getScoreColor(score)

  // Animate counter
  useEffect(() => {
    let start = 0
    const duration = 1800
    const startTime = performance.now()
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animRef.current)
  }, [score])

  // SVG ring
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, type: 'spring', stiffness: 120 }}
      className="glass-card holo-border flex flex-col items-center justify-center p-10 text-center"
      style={{ gridArea: 'score', boxShadow: `0 0 60px ${glow}, 0 20px 60px rgba(0,0,0,0.5)` }}>

      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
        Repository Health Score
      </h2>

      {/* SVG Ring */}
      <div className="relative" style={{ filter: `drop-shadow(0 0 20px ${glow})` }}>
        <svg width="220" height="220" viewBox="0 0 220 220">
          {/* Track */}
          <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
          {/* Progress */}
          <circle cx="110" cy="110" r={radius} fill="none"
            stroke={color} strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 110 110)"
            style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Glow ring */}
          <circle cx="110" cy="110" r={radius} fill="none"
            stroke={color} strokeWidth="4" opacity="0.3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 110 110)"
            style={{ filter: 'blur(4px)', transition: 'stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black leading-none" style={{ fontSize: '4.5rem', color }}>
            {displayScore}
          </span>
          <span className="text-slate-400 text-sm font-semibold">/ 100</span>
        </div>
      </div>

      {/* Label badge */}
      <div className="mt-5 px-5 py-1.5 rounded-full text-sm font-bold"
        style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}>
        {label}
      </div>

      <p className="text-slate-500 text-xs mt-3 max-w-xs leading-relaxed">
        Composite score across security, code quality, documentation, dependencies & developer activity.
      </p>
    </motion.div>
  )
}
