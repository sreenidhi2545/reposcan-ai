import { motion } from 'framer-motion'
import SectionRobot from './SectionRobot'

function getInitials(login) {
  return login.slice(0, 2).toUpperCase()
}

function ContributorAvatar({ login, index }) {
  const colors = [
    ['#6366f1', '#8b5cf6'],
    ['#06b6d4', '#6366f1'],
    ['#10b981', '#06b6d4'],
    ['#f59e0b', '#ef4444'],
  ]
  const [from, to] = colors[index % colors.length]
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      {getInitials(login)}
    </div>
  )
}

export default function DeveloperReputation({ data }) {
  const { score, contributors = [], metrics = {}, pr_analysis = {} } = data

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="glass-card robot-card section-hover p-5 flex flex-col gap-3">

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl moving-icon">👤</span>
            <h3 className="text-white font-bold text-lg">Developer Reputation</h3>
          </div>
          <p className="text-slate-400 text-xs">Contributor activity & collaboration quality</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{
            color: score >= 85 ? '#10b981' : score >= 70 ? '#06b6d4' : score >= 55 ? '#f59e0b' : '#ef4444'
          }}>{score}</div>
          <div className="text-slate-500 text-xs">/ 100</div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Commit Frequency', value: metrics.commit_frequency || 'N/A', icon: '📈' },
          { label: 'Avg PR Review',    value: metrics.avg_pr_review_time || 'N/A', icon: '⏱' },
          { label: 'Test Coverage',    value: metrics.test_coverage || 'N/A',     icon: '🧪' },
          { label: 'Bus Factor',       value: metrics.bus_factor || 'N/A',        icon: '🚌' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-lg mb-1">{icon}</div>
            <div className="text-white font-bold text-sm">{value}</div>
            <div className="text-slate-500 text-xs">{label}</div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Pull Request Analysis</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Open PRs', value: pr_analysis.total_open_prs ?? 'N/A' },
            { label: 'Avg PR Size', value: pr_analysis.avg_pr_size ?? 'N/A' },
            { label: 'Review Turnaround', value: pr_analysis.avg_review_turnaround ?? 'N/A' },
            { label: 'Approval Rate', value: pr_analysis.approval_rate ?? 'N/A' },
          ].map((item) => (
            <div key={item.label} className="p-2 rounded-lg"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-slate-400 text-[11px]">{item.label}</p>
              <p className="text-indigo-300 text-sm font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contributors list */}
      <div>
        <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Top Contributors</h4>
        <div className="space-y-2">
          {contributors.slice(0, 4).map((c, i) => {
            const maxCommits = contributors[0]?.commits || 1
            const pct = (c.commits / maxCommits) * 100
            return (
              <div key={c.login} className="flex items-center gap-3">
                <ContributorAvatar login={c.login} index={i} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-200 text-sm font-semibold font-mono">{c.login}</span>
                    <span className="text-slate-400 text-xs">{c.commits} commits</span>
                  </div>
                  <div className="progress-bar">
                    <motion.div className="progress-fill"
                      style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.7 + i * 0.1 }}
                    />
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-emerald-400 text-xs">+{c.additions?.toLocaleString()}</span>
                    <span className="text-red-400 text-xs">-{c.deletions?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <SectionRobot accentColor="#3b82f6" robotType="celebrator" size={210} />
    </motion.div>
  )
}
