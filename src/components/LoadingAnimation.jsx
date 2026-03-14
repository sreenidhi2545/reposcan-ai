import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const AGENT_STEPS = [
  { id: 1, agent: 'Orchestrator', task: 'Initializing multi-agent pipeline…', icon: '🧠', duration: 1200 },
  { id: 2, agent: 'Cloner Agent', task: 'Cloning repository & scanning file tree…', icon: '📂', duration: 1800 },
  { id: 3, agent: 'Security Agent', task: 'Running SAST checks & CVE lookups…', icon: '🔒', duration: 2200 },
  { id: 4, agent: 'Code Quality Agent', task: 'Detecting code smells & complexity metrics…', icon: '🧹', duration: 1900 },
  { id: 5, agent: 'Documentation Agent', task: 'Evaluating README & inline docs…', icon: '📚', duration: 1400 },
  { id: 6, agent: 'Dependency Agent', task: 'Auditing packages for outdated & vulnerable versions…', icon: '📦', duration: 1600 },
  { id: 7, agent: 'Reputation Agent', task: 'Analyzing contributor history & commit patterns…', icon: '👤', duration: 1500 },
  { id: 8, agent: 'Scoring Agent', task: 'Computing composite health score…', icon: '📊', duration: 1000 },
  { id: 9, agent: 'Report Agent', task: 'Generating insights & recommendations…', icon: '✨', duration: 800 },
]

function MatrixRain() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i}
          className="absolute top-0 text-green-400 text-xs font-mono select-none"
          style={{
            left: `${(i / 18) * 100}%`,
            animationName: 'matrix-fall',
            animationDuration: `${2 + Math.random() * 3}s`,
            animationDelay: `${Math.random() * 2}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}>
          {'01アイウエ10BX#@!'.split('').map(() =>
            String.fromCharCode(33 + Math.floor(Math.random() * 93))
          ).join('\n')}
        </div>
      ))}
    </div>
  )
}

export default function LoadingAnimation({ repoUrl }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let stepIndex = 0
    const totalDuration = AGENT_STEPS.reduce((s, a) => s + a.duration, 0)
    let elapsed = 0

    const runStep = () => {
      if (stepIndex >= AGENT_STEPS.length) return
      setCurrentStep(stepIndex)
      const step = AGENT_STEPS[stepIndex]

      const timer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepIndex])
        elapsed += step.duration
        setProgress(Math.round((elapsed / totalDuration) * 100))
        stepIndex++
        runStep()
      }, step.duration)

      return timer
    }

    const t = runStep()
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: '#0a0e1a' }}>
      <MatrixRain />

      {/* Central glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-6">

        {/* Spinner rings */}
        <div className="relative w-32 h-32 mb-10">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border-2 border-t-indigo-500 border-r-cyan-400 border-b-purple-500 border-l-transparent rounded-full animate-spin-slow" />
          <div className="absolute inset-5 rounded-full border-2 border-t-transparent border-r-transparent border-b-cyan-400 border-l-indigo-400 animate-spin-reverse" />
          {/* Core */}
          <div className="absolute inset-8 rounded-full flex items-center justify-center animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="opacity-90">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <motion.h2 className="text-white text-2xl font-bold mb-1 text-center">
          Analyzing Repository
        </motion.h2>
        <p className="text-slate-400 text-sm mb-8 text-center font-mono truncate max-w-sm">{repoUrl}</p>

        {/* Global progress bar */}
        <div className="w-full progress-bar mb-8">
          <motion.div
            className="progress-fill"
            style={{ background: 'linear-gradient(90deg, #6366f1, #06b6d4)', width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="text-indigo-400 font-mono text-sm mb-8">{progress}% complete</div>

        {/* Agent steps list */}
        <div className="w-full space-y-2">
          {AGENT_STEPS.map((step, idx) => {
            const isDone = completedSteps.includes(idx)
            const isActive = currentStep === idx && !isDone
            return (
              <motion.div key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: idx <= currentStep ? 1 : 0.3, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: isActive
                    ? 'rgba(99,102,241,0.12)'
                    : isDone
                    ? 'rgba(16,185,129,0.06)'
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.35)' : isDone ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  transition: 'all 0.3s ease',
                }}>

                {/* Status icon */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: isDone ? 'rgba(16,185,129,0.2)' : isActive ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                  }}>
                  {isDone
                    ? <span className="text-emerald-400 text-sm">✓</span>
                    : isActive
                    ? <span className="text-lg" style={{ animation: 'spin-slow 1s linear infinite', display: 'inline-block' }}>⚙</span>
                    : <span className="text-slate-600 text-xs">○</span>
                  }
                </div>

                {/* Agent label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{step.icon}</span>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDone ? 'text-emerald-400' : isActive ? 'text-indigo-300' : 'text-slate-600'}`}>
                      {step.agent}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${isDone ? 'text-slate-500' : isActive ? 'text-slate-300' : 'text-slate-700'}`}>
                    {step.task}
                  </p>
                </div>

                {/* Active pulse */}
                {isActive && (
                  <div className="flex gap-1 shrink-0">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                        style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
