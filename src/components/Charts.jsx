import { motion } from 'framer-motion'
import SectionRobot from './SectionRobot'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

function CustomRadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { subject, value } = payload[0].payload
  return (
    <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '8px 14px' }}>
      <p className="text-indigo-300 font-semibold text-sm">{subject}</p>
      <p className="text-white font-black text-xl">{value}</p>
    </div>
  )
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '8px 14px' }}>
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value} commits</p>
    </div>
  )
}

// ── Radar Chart ─────────────────────────────────────────────────────────────
export function RadarScoreChart({ categoryScores }) {
  const data = categoryScores.map((item) => ({
    subject: item.category,
    A: item.score,
    fullMark: 100,
  }))

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="glass-card p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-white font-bold text-lg">Score Breakdown</h3>
        <p className="text-slate-400 text-xs">Multi-dimensional quality radar</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="rgba(99,102,241,0.15)" />
          <PolarAngleAxis dataKey="subject"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false}
            tickCount={5} />
          <Radar name="Score" dataKey="A" stroke="#6366f1" fill="#6366f1"
            fillOpacity={0.18} strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// ── Bar Chart ────────────────────────────────────────────────────────────────
export function CommitActivityChart({ commitActivity }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="glass-card p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-white font-bold text-lg">Commit Activity</h3>
        <p className="text-slate-400 text-xs">Last 6 months</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={commitActivity} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
          <Bar dataKey="commits" radius={[6, 6, 0, 0]}>
            {commitActivity.map((_, i) => (
              <Cell key={i} fill={`url(#barGrad-${i})`} />
            ))}
          </Bar>
          <defs>
            {commitActivity.map((_, i) => (
              <linearGradient key={i} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// ── Category Score Bars ──────────────────────────────────────────────────────
export function CategoryScoreBars({ categoryScores }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="glass-card robot-card category-score-card p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-white font-bold text-lg">Category Scores</h3>
        <p className="text-slate-400 text-xs">Score per analysis dimension</p>
      </div>
      <div className="space-y-3">
        {categoryScores.map((item, i) => {
          const pct = item.score
          const color = pct >= 85 ? '#10b981' : pct >= 70 ? '#06b6d4' : pct >= 55 ? '#f59e0b' : '#ef4444'
          return (
            <div key={item.category}>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300 text-sm font-medium">{item.category}</span>
                <span className="text-sm font-bold" style={{ color }}>{item.score}/100</span>
              </div>
              <div className="progress-bar">
                <motion.div className="progress-fill" style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <SectionRobot accentColor="#22c55e" robotType="presenter" size={190} />
    </motion.div>
  )
}
