import { motion } from 'framer-motion'
import SectionRobot from './SectionRobot'

const SEVERITY_CONFIG = {
  HIGH:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
  MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
  LOW:    { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.3)'   },
  INFO:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.3)'  },
}

function ScoreBadge({ score, max = 100 }) {
  const pct = (score / max) * 100
  const color = pct >= 85 ? '#10b981' : pct >= 70 ? '#06b6d4' : pct >= 55 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-2xl font-black" style={{ color }}>{score}</span>
      <div className="w-20 progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color, transition: 'width 1.2s ease' }} />
      </div>
    </div>
  )
}

// ── Security Card ──────────────────────────────────────────────────────────
export function SecurityCard({ data }) {
  const { score, issues = [] } = data
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  issues.forEach((i) => { if (counts[i.severity] !== undefined) counts[i.severity]++ })

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card robot-card section-hover p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl moving-icon">🔒</span>
            <h3 className="text-white font-bold text-lg">Security</h3>
          </div>
          <p className="text-slate-400 text-xs">Vulnerability & SAST analysis</p>
        </div>
        <ScoreBadge score={score} />
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(counts).map(([sev, count]) => (
          <div key={sev} className="rounded-lg p-2 text-center"
            style={{ background: SEVERITY_CONFIG[sev].bg, border: `1px solid ${SEVERITY_CONFIG[sev].border}` }}>
            <div className="text-xl font-black" style={{ color: SEVERITY_CONFIG[sev].color }}>{count}</div>
            <div className="text-xs text-slate-400 uppercase">{sev}</div>
          </div>
        ))}
      </div>

      {/* Issues list */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {issues.slice(0, 4).map((issue, i) => {
          const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.LOW
          return (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded mt-0.5"
                style={{ color: cfg.color, background: cfg.bg }}>{issue.severity}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-slate-200 text-xs font-medium leading-tight">{issue.title}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)' }}>
                    {issue.owasp || 'OWASP A03'}
                  </span>
                </div>
                {issue.file && (
                  <p className="text-slate-500 text-xs font-mono truncate mt-0.5">{issue.file}{issue.line ? `:${issue.line}` : ''}</p>
                )}
                <p className="text-emerald-400 text-xs mt-1">Suggested Fix: {issue.suggested_fix || 'Address this finding with secure coding best practices and input validation.'}</p>
              </div>
            </div>
          )
        })}
        {issues.length > 4 && (
          <p className="text-slate-500 text-xs text-center">+{issues.length - 4} more issues</p>
        )}
      </div>
      <SectionRobot accentColor="#f97316" robotType="guard" size={185} />
    </motion.div>
  )
}

// ── Code Smells Card ───────────────────────────────────────────────────────
export function CodeSmellsCard({ data }) {
  const { score, issues = [], bugs_detected = [] } = data
  const mediumCount =
    issues.filter((issue) => /medium|moderate/i.test(`${issue.type} ${issue.description}`)).length +
    bugs_detected.filter((bug) => /medium|moderate/i.test(`${bug.type} ${bug.description}`)).length

  const streamItems = [
    ...issues.map((issue, i) => ({
      id: `refactor-${i}`,
      itemType: 'REFACTOR',
      border: '#00d4ff',
      title: issue.type,
      description: issue.description,
      meta: issue.file,
      badge: issue.solid_tag || 'DRY/OCP',
      fix: issue.suggested_fix || 'Refactor into smaller units and remove duplicated logic.',
    })),
    ...bugs_detected.map((bug, i) => ({
      id: `bug-${i}`,
      itemType: 'BUG',
      border: '#f97316',
      title: bug.type,
      description: bug.description,
      meta: `${bug.file}:${bug.line}`,
      fix: bug.suggested_fix || 'Add defensive checks and tests for this path.',
    })),
  ]

  const marqueeItems = streamItems.length ? [...streamItems, ...streamItems] : []

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card robot-card section-hover p-5 flex flex-col gap-3">
      <div className="relative pr-56">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl moving-icon">🧹</span>
              <h3 className="text-white font-bold text-lg">Code Quality - Findings</h3>
            </div>
            <p className="text-slate-400 text-xs">Unified refactor and bug stream</p>
          </div>
          <ScoreBadge score={score} />
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-2">
          <span className="subtle-pill" style={{ color: '#67e8f9', background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.35)' }}>
            Smells {issues.length}
          </span>
          <span className="subtle-pill" style={{ color: '#fb923c', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.35)' }}>
            Bugs {bugs_detected.length}
          </span>
          <span className="subtle-pill" style={{ color: '#fcd34d', background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)' }}>
            Medium {mediumCount}
          </span>
        </div>

        <SectionRobot accentColor="#00d4ff" robotType="coder" size={240} anchor="top-right" robotVariant="code-quality-header" />
      </div>

      <div className="quality-horizontal-scroll">
        <div className="quality-scroll-track">
          {marqueeItems.map((item, i) => (
            <div key={`${item.id}-${i}`} className="quality-stream-item"
              style={{ borderLeft: `3px solid ${item.border}` }}>
              <span className="quality-chip"
                style={{
                  color: item.itemType === 'REFACTOR' ? '#67e8f9' : '#fdba74',
                  background: item.itemType === 'REFACTOR' ? 'rgba(0,212,255,0.12)' : 'rgba(249,115,22,0.12)',
                  border: item.itemType === 'REFACTOR' ? '1px solid rgba(0,212,255,0.35)' : '1px solid rgba(249,115,22,0.35)',
                }}>
                {item.itemType}
              </span>

              <div className="pr-16">
                <p className="text-slate-100 text-sm font-semibold leading-tight">{item.title}</p>
                {item.badge && (
                  <span className="inline-block text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded"
                    style={{ color: '#67e8f9', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.35)' }}>
                    {item.badge}
                  </span>
                )}
              </div>

              <p className="text-slate-300 text-xs leading-relaxed mt-2">{item.description}</p>
              {item.meta && <p className="text-slate-500 text-xs font-mono mt-2 truncate">{item.meta}</p>}
              <p className="text-emerald-400 text-xs mt-2">Suggested Fix: {item.fix}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Documentation Card ─────────────────────────────────────────────────────
export function DocumentationCard({ data }) {
  const { score, issues = [] } = data
  const pct = score
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card robot-card section-hover p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl moving-icon">📚</span>
            <h3 className="text-white font-bold text-lg">Documentation</h3>
          </div>
          <p className="text-slate-400 text-xs">README, JSDoc & inline docs</p>
        </div>
        <ScoreBadge score={score} />
      </div>

      {/* Radial meter */}
      <div className="flex items-center justify-center py-2">
        <div className="relative w-24 h-24">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle cx="48" cy="48" r="38" fill="none"
              stroke="#8b5cf6" strokeWidth="8"
              strokeDasharray={2 * Math.PI * 38}
              strokeDashoffset={2 * Math.PI * 38 * (1 - pct / 100)}
              strokeLinecap="round" transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 1.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-purple-300 font-bold text-lg">{pct}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {issues.map((issue, i) => (
          <div key={i} className="p-2 rounded-lg flex items-start gap-2"
            style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <span className="text-purple-400 text-xs mt-0.5">⚠</span>
            <div>
              <p className="text-slate-300 text-xs font-medium">{issue.type}</p>
              <p className="text-slate-500 text-xs">{issue.description}</p>
            </div>
          </div>
        ))}
      </div>
      <SectionRobot accentColor="#a855f7" robotType="reader" size={180} />
    </motion.div>
  )
}

// ── Dependency Risks Card ──────────────────────────────────────────────────
export function DependencyCard({ data }) {
  const { score, risks = [] } = data
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card robot-card section-hover p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl moving-icon">📦</span>
            <h3 className="text-white font-bold text-lg">Dependencies</h3>
          </div>
          <p className="text-slate-400 text-xs">Outdated & vulnerable packages</p>
        </div>
        <ScoreBadge score={score} />
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {risks.map((dep, i) => {
          const cfg = SEVERITY_CONFIG[dep.risk] || SEVERITY_CONFIG.LOW
          return (
            <div key={i} className="p-3 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${cfg.border}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-mono font-bold">{dep.package}</span>
                <span className="text-xs px-2 py-0.5 rounded font-bold"
                  style={{ color: cfg.color, background: cfg.bg }}>{dep.risk}</span>
              </div>
              <div className="flex gap-3 text-xs text-slate-400">
                <span>Current: <span className="text-slate-300 font-mono">{dep.current}</span></span>
                <span>Latest: <span className="text-emerald-400 font-mono">{dep.latest}</span></span>
              </div>
              {dep.note && <p className="text-slate-500 text-xs mt-1 italic">{dep.note}</p>}
            </div>
          )
        })}
      </div>
      <SectionRobot accentColor="#eab308" robotType="inspector" size={185} />
    </motion.div>
  )
}

export function ComplianceCard({ data }) {
  const checks = data?.checks || []
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="glass-card robot-card section-hover p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl moving-icon">✅</span>
        <h3 className="text-white font-bold text-lg">Compliance & Guidelines</h3>
      </div>
      <p className="text-slate-400 text-xs">Repo process and policy checks</p>
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-slate-200 text-sm">{check.label}</span>
            <span className={`text-sm font-bold ${check.passed ? 'text-emerald-400' : 'text-red-400'}`}>
              {check.passed ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
      <SectionRobot accentColor="#14b8a6" robotType="checker" size={185} />
    </motion.div>
  )
}

export function LearningInsightsCard({ insights = [] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="glass-card robot-card section-hover agent-insights-band p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl moving-icon">🧠</span>
        <h3 className="text-white font-bold text-lg">Learning Agent Insights</h3>
      </div>
      <ul className="space-y-1.5 text-sm text-slate-300">
        {insights.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-indigo-300 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <SectionRobot accentColor="#ec4899" robotType="thinker" size={205} />
    </motion.div>
  )
}
