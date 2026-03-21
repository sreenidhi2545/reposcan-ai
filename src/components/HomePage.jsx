import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingAnimation from './LoadingAnimation'
import ParticleBackground from './ParticleBackground'
import axios from 'axios'

const ANALYZE_ENDPOINT = import.meta.env.VITE_ANALYZE_ENDPOINT || '/analyze'

const SAMPLE_REPOS = [
  'https://github.com/facebook/react',
  'https://github.com/microsoft/vscode',
  'https://github.com/torvalds/linux',
]

const heroStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const heroItem = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
}

export default function HomePage({ onAnalysisComplete }) {
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [placeholder, setPlaceholder] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setPlaceholder((p) => (p + 1) % SAMPLE_REPOS.length), 3000)
    return () => clearInterval(id)
  }, [])

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!repoUrl.trim()) { setError('Please enter a GitHub repository URL'); return }
    if (!repoUrl.includes('github.com')) { setError('Please enter a valid GitHub URL'); return }
    setError('')
    setLoading(true)

    try {
      const normalizedRepoUrl = repoUrl.trim()
      const res = await axios.post(
        ANALYZE_ENDPOINT,
        { repo_url: normalizedRepoUrl },
        { timeout: 120000 },
      )
      const data = res.data
      if (onAnalysisComplete) {
        onAnalysisComplete(data, normalizedRepoUrl)
      }
      navigate('/dashboard', { state: { data, repoUrl: normalizedRepoUrl } })
    } catch (err) {
      const backendMessage = err?.response?.data?.detail
      const isNetworkError = err?.code === 'ERR_NETWORK' || !err?.response
      const isTimeout = err?.code === 'ECONNABORTED'
      if (isTimeout) {
        setError('Analysis timed out after 120 seconds. Please try again.')
      } else if (isNetworkError) {
        setError('Backend API is not reachable. Run `npm run dev` from project root and try again.')
      } else {
        setError(backendMessage || 'Analysis failed. Please try again.')
      }
      setLoading(false)
    }
  }

  if (loading) return <LoadingAnimation repoUrl={repoUrl} />

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grid-bg cinematic-shell">
      <ParticleBackground />

      {/* Ambient blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(80px)', transform: 'translate(-50%,-50%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)', filter: 'blur(80px)', transform: 'translate(50%,50%)' }} />

      <motion.div
        variants={heroStagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center px-6 max-w-3xl w-full">

        <motion.p variants={heroItem}
          className="text-xs md:text-sm uppercase tracking-[0.2em] text-slate-400 mb-4">
          Fullstack Repository Intelligence
        </motion.p>

        {/* Logo badge */}
        <motion.div variants={heroItem}
          className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <span className="text-indigo-400 text-sm font-semibold tracking-widest uppercase">AI-Powered</span>
          <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-indigo-300 text-sm">Repository Intelligence</span>
        </motion.div>

        {/* Heading */}
        <motion.h1 variants={heroItem}
          className="text-center font-black mb-4 leading-tight"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
          <span className="shimmer-text">RepoScan AI</span>
          <br />
          <span className="text-white">analyzes your code</span>
        </motion.h1>

        <motion.p variants={heroItem}
          className="text-slate-400 text-center text-lg mb-12 max-w-xl">
          Deep security audits · code smell detection · dependency risks · developer reputation — all in one score.
        </motion.p>

        {/* Input form */}
        <motion.form onSubmit={handleAnalyze} variants={heroItem}
          whileHover={{ y: -4, transition: { duration: 0.25 } }} className="w-full">
          <div className="glass-card holo-border p-2 flex gap-3">
            {/* GitHub icon */}
            <div className="flex items-center pl-3 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-slate-400">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57
                  0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695
                  -.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99
                  .105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225
                  -.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405
                  c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225
                  0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3
                  0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="url"
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); setError('') }}
              placeholder={SAMPLE_REPOS[placeholder]}
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-base py-3 font-mono"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            <button type="submit"
              className="btn-glow px-6 py-3 text-sm font-bold tracking-wide rounded-xl shrink-0"
              style={{ minWidth: '120px' }}>
              <span className="relative z-10">Analyze →</span>
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-red-400 text-sm mt-3 text-center">{error}</motion.p>
            )}
          </AnimatePresence>
        </motion.form>

        {/* Feature pills */}
        <motion.div variants={heroItem}
          className="flex flex-wrap justify-center gap-3 mt-10">
          {[
            { icon: '🔒', label: 'Security Audit' },
            { icon: '🧹', label: 'Code Smells' },
            { icon: '📚', label: 'Docs Quality' },
            { icon: '📦', label: 'Dependency Risks' },
            { icon: '👤', label: 'Dev Reputation' },
          ].map(({ icon, label }) => (
            <motion.div key={label}
              whileHover={{ y: -3, scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-slate-300"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span>{icon}</span><span>{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats row */}
        <motion.div variants={heroItem}
          className="grid grid-cols-3 gap-6 mt-14 w-full max-w-lg">
          {[
            { value: '50+', label: 'Metrics analyzed' },
            { value: '< 2min', label: 'Analysis time' },
            { value: 'AI', label: 'Multi-agent' },
          ].map(({ value, label }) => (
            <motion.div key={label}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="text-center">
              <div className="text-2xl font-black shimmer-text">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ── Mock data for demo when backend is unavailable ──────────────────────────
function generateMockData(repoUrl) {
  const repoName = repoUrl.split('/').slice(-2).join('/')
  return {
    repo_url: repoUrl,
    repo_name: repoName,
    health_score: 74,
    analysis_timestamp: new Date().toISOString(),
    security: {
      score: 68,
      issues: [
        {
          severity: 'HIGH',
          title: 'Hardcoded API key detected',
          file: 'src/config.js',
          line: 42,
          owasp: 'OWASP A02',
          suggested_fix: 'Move to environment variable using process.env.API_KEY',
        },
        {
          severity: 'MEDIUM',
          title: 'Insecure dependency: lodash < 4.17.21',
          file: 'package.json',
          line: null,
          owasp: 'OWASP A06',
          suggested_fix: 'Upgrade lodash to >= 4.17.21 and lock with npm audit policy.',
        },
        {
          severity: 'LOW',
          title: 'Missing input validation in user endpoint',
          file: 'routes/user.js',
          line: 78,
          owasp: 'OWASP A03',
          suggested_fix: 'Add schema validation (zod/joi) before processing request body.',
        },
      ],
    },
    code_smells: {
      score: 72,
      issues: [
        {
          type: 'Long Method',
          description: 'processData() has 312 lines',
          file: 'utils/processor.js',
          solid_tag: 'SRP',
          suggested_fix: 'Extract transformation and validation into dedicated helper modules.',
        },
        {
          type: 'Duplicate Code',
          description: '3 near-duplicate blocks detected',
          file: 'multiple files',
          solid_tag: 'DRY/OCP',
          suggested_fix: 'Create shared utility functions and replace duplicated branches.',
        },
        {
          type: 'God Class',
          description: 'AppManager handles 22 responsibilities',
          file: 'core/AppManager.js',
          solid_tag: 'SRP/ISP',
          suggested_fix: 'Split AppManager into service-specific classes with narrower interfaces.',
        },
      ],
      bugs_detected: [
        {
          type: 'Unhandled Promise Rejection',
          file: 'src/services/syncService.js',
          line: 124,
          description: 'Promise chain lacks catch handler on syncJob execution path.',
          suggested_fix: 'Add try/catch with await or append .catch() and centralized error logging.',
        },
        {
          type: 'Null Dereference Risk',
          file: 'src/controllers/userController.js',
          line: 89,
          description: 'profile.email is accessed before checking profile existence.',
          suggested_fix: 'Guard with optional chaining and early return when profile is null.',
        },
        {
          type: 'Off-by-one Error',
          file: 'src/utils/paginator.js',
          line: 57,
          description: 'Loop boundary skips last item when page size equals collection length.',
          suggested_fix: 'Use i < items.length and adjust end index calculation.',
        },
      ],
    },
    documentation: {
      score: 81,
      issues: [
        { type: 'Missing README sections', description: 'No Installation or Contributing section' },
        { type: 'Undocumented exports', description: '14 public functions without JSDoc' },
      ],
    },
    dependencies: {
      score: 65,
      risks: [
        { package: 'express', current: '4.17.1', latest: '4.18.3', risk: 'MEDIUM' },
        { package: 'axios', current: '0.21.0', latest: '1.4.0', risk: 'HIGH' },
        { package: 'moment', current: '2.29.1', latest: '2.29.4', risk: 'LOW', note: 'Consider dayjs' },
      ],
    },
    developer_reputation: {
      score: 88,
      contributors: [
        { login: 'alice-dev', commits: 342, additions: 18450, deletions: 7230, avatar: null },
        { login: 'bob-codes', commits: 198, additions: 9821, deletions: 4102, avatar: null },
        { login: 'charlie-x', commits: 76, additions: 3201, deletions: 1540, avatar: null },
      ],
      metrics: {
        commit_frequency: 'High',
        avg_pr_review_time: '18h',
        test_coverage: '64%',
        bus_factor: 2,
      },
      pr_analysis: {
        total_open_prs: 11,
        avg_pr_size: '342 LOC',
        avg_review_turnaround: '16h',
        approval_rate: '82%',
      },
    },
    compliance: {
      checks: [
        { label: 'Commit message convention', passed: true },
        { label: 'Branch naming policy', passed: false },
        { label: 'PR description completeness', passed: true },
        { label: 'ESLint/linting rules', passed: true },
        { label: 'License file present', passed: false },
      ],
    },
    review_time_saved: '5.2 hrs',
    learning_insights: [
      'This repo shares vulnerability patterns with 3 previously scanned repos.',
      'Dependency risk profile is above average for Node.js projects.',
      'Most critical issues cluster in auth and config management modules.',
    ],
    category_scores: [
      { category: 'Security', score: 68 },
      { category: 'Code Quality', score: 72 },
      { category: 'Documentation', score: 81 },
      { category: 'Dependencies', score: 65 },
      { category: 'Dev Reputation', score: 88 },
    ],
    commit_activity: [
      { month: 'Oct', commits: 24 },
      { month: 'Nov', commits: 38 },
      { month: 'Dec', commits: 15 },
      { month: 'Jan', commits: 42 },
      { month: 'Feb', commits: 56 },
      { month: 'Mar', commits: 31 },
    ],
  }
}
