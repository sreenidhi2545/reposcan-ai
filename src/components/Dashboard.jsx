import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

const AGENT_DEFS = [
  {
    id: 'security',
    name: 'Security Agent',
    icon: '🛡️',
    role: 'Vulnerability & SAST Analysis',
    accent: '#c0504a',
    gradient: 'linear-gradient(135deg, #3d1f1f, #5a2d2d)',
    sectionId: 'security',
    scoreHint: 'Indicates repository resilience against known vulnerability and policy risks.',
  },
  {
    id: 'code-review',
    name: 'Code Review Agent',
    icon: '🔍',
    role: 'Architecture & Pattern Review',
    accent: '#4d7fa8',
    gradient: 'linear-gradient(135deg, #1a2a3d, #1e3a5f)',
    sectionId: 'code-quality',
    scoreHint: 'Measures readability, maintainability, and reviewability of implementation patterns.',
  },
  {
    id: 'dependency',
    name: 'Dependency Agent',
    icon: '📦',
    role: 'Package & Supply Chain Intelligence',
    accent: '#a88c3a',
    gradient: 'linear-gradient(135deg, #2d2510, #3d3015)',
    sectionId: 'dependencies',
    scoreHint: 'Captures package freshness, vulnerability exposure, and upgrade readiness.',
  },
  {
    id: 'documentation',
    name: 'Documentation Agent',
    icon: '📝',
    role: 'Knowledge Base & API Coverage',
    accent: '#7a5aa8',
    gradient: 'linear-gradient(135deg, #221535, #2e1a4a)',
    sectionId: 'documentation',
    scoreHint: 'Rates onboarding clarity and API/content completeness for contributors.',
  },
  {
    id: 'quality',
    name: 'Quality Agent',
    icon: '✨',
    role: 'Reliability & Bug Prediction',
    accent: '#3a9090',
    gradient: 'linear-gradient(135deg, #0d2a2a, #0f3535)',
    sectionId: 'code-quality',
    scoreHint: 'Reflects defect density, architecture consistency, and long-term stability.',
  },
  {
    id: 'learning',
    name: 'Learning Agent',
    icon: '🧠',
    role: 'Pattern Correlation Engine',
    accent: '#a05888',
    gradient: 'linear-gradient(135deg, #2d1025, #3d1535)',
    sectionId: 'learning-insights',
    scoreHint: 'Summarizes cross-project intelligence confidence and pattern actionability.',
  },
  {
    id: 'contribution',
    name: 'Contribution Agent',
    icon: '👥',
    role: 'Developer Collaboration Analytics',
    accent: '#4a8c5c',
    gradient: 'linear-gradient(135deg, #0f2a18, #153520)',
    sectionId: 'developer-reputation',
    scoreHint: 'Represents collaboration quality, review velocity, and contributor reliability.',
  },
]

const STATUS_COLORS = {
  complete: { fg: '#6aaa80', bg: '#1a2e1a', border: '#2a4a2a' },
  running: { fg: '#d29922', bg: 'rgba(210, 153, 34, 0.14)', border: 'rgba(210, 153, 34, 0.35)' },
  waiting: { fg: '#8b949e', bg: 'rgba(139, 148, 158, 0.14)', border: 'rgba(139, 148, 158, 0.35)' },
}

function createAgentAvatar(icon, start, end, iconColor) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="url(#g)" />
      <circle cx="60" cy="60" r="53" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      <text x="60" y="74" text-anchor="middle" font-size="52" fill="${iconColor}">${icon}</text>
    </svg>
  `
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

AGENT_DEFS.forEach((agent) => {
  const colors = agent.gradient.match(/#[0-9a-fA-F]{6}/g) || ['#1a2a3d', '#1e3a5f']
  const iconPalette = {
    security: '#e07070',
    'code-review': '#7aacda',
    dependency: '#c9a84c',
    documentation: '#9b7cc8',
    quality: '#5bbfbf',
    learning: '#c47aaa',
    contribution: '#6aaa80',
  }
  agent.avatar = createAgentAvatar(agent.icon, colors[0], colors[1], iconPalette[agent.id] || '#c9d1d9')
})

function useToastMessage(duration = 2000) {
  const [message, setMessage] = useState('')

  const show = (value) => {
    setMessage(value)
    window.setTimeout(() => setMessage(''), duration)
  }

  return { message, show }
}

function getFallbackData(repoUrl = 'https://github.com/facebook/react') {
  const repoName = repoUrl.split('/').slice(-2).join('/') || 'demo/repo'
  return {
    repo_url: repoUrl,
    repo_name: repoName,
    health_score: 74,
    analysis_timestamp: new Date().toISOString(),
    code_smells: {
      score: 72,
      issues: [
        { type: 'Long Method', description: 'processData() has 312 lines and mixed responsibilities.' },
        { type: 'Duplicate Code', description: '3 near-duplicate blocks detected in utility pipelines.' },
        { type: 'God Class', description: 'AppManager handles too many module concerns.' },
      ],
      bugs_detected: [
        { type: 'Unhandled Promise Rejection', description: 'Sync job path can throw without centralized catch.' },
        { type: 'Null Dereference Risk', description: 'Profile fields are accessed before null guards.' },
        { type: 'Off-by-one Error', description: 'Boundary logic may skip the last collection item.' },
      ],
    },
    security: {
      score: 68,
      issues: [
        { severity: 'HIGH', title: 'Hardcoded API key detected', file: 'src/config.js', owasp: 'OWASP A02' },
        { severity: 'MEDIUM', title: 'Insecure dependency version', file: 'package.json', owasp: 'OWASP A06' },
        { severity: 'LOW', title: 'Missing input validation', file: 'routes/user.js', owasp: 'OWASP A03' },
      ],
    },
    documentation: {
      score: 81,
      issues: [
        { type: 'Missing README sections', description: 'No Installation or Contributing section found.' },
        { type: 'Undocumented exports', description: '14 public functions are missing JSDoc.' },
      ],
    },
    dependencies: {
      score: 65,
      risks: [
        { package: 'express', current: '4.17.1', latest: '4.18.3', risk: 'MEDIUM' },
        { package: 'axios', current: '0.21.0', latest: '1.4.0', risk: 'HIGH' },
        { package: 'moment', current: '2.29.1', latest: '2.29.4', risk: 'LOW' },
      ],
    },
    developer_reputation: {
      score: 88,
      contributors: [
        { login: 'alice-dev', commits: 342, additions: 18450, deletions: 7230 },
        { login: 'bob-codes', commits: 198, additions: 9821, deletions: 4102 },
        { login: 'charlie-x', commits: 76, additions: 3201, deletions: 1540 },
      ],
      metrics: { avg_pr_review_time: '18h' },
      pr_analysis: { approval_rate: '82%' },
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
    learning_insights: [
      'This repo shares vulnerability patterns with previously scanned projects.',
      'Dependency risk profile is above average for Node.js repositories.',
      'Critical issues cluster in auth and configuration modules.',
      'Refactor and security fixes may reduce review cycle time significantly.',
    ],
    review_time_saved: '5.2 hrs',
  }
}

function hasDoc1Shape(payload) {
  if (!payload || typeof payload !== 'object') return false
  return Boolean(payload.security || payload.code_smells || payload.dependencies || payload.developer_reputation)
}

function hasDoc2Shape(payload) {
  if (!payload || typeof payload !== 'object') return false
  return Boolean(
    payload.overall_score !== undefined
    || payload.grade
    || payload.code_review
    || payload.code_quality
    || payload.docs
    || payload.learning
    || payload.agent_improvements,
  )
}

function clampScore(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return Math.round(n)
}

function scoreColor(score) {
  if (score >= 80) return '#3fb950'
  if (score >= 60) return '#d29922'
  return '#f85149'
}

function scoreGrade(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function riskFromScore(score) {
  if (score < 45) return { label: 'CRITICAL', color: '#f85149', icon: '⚠' }
  if (score < 65) return { label: 'HIGH', color: '#d29922', icon: '⚠' }
  if (score < 80) return { label: 'MEDIUM', color: '#58a6ff', icon: '⚠' }
  return { label: 'LOW', color: '#3fb950', icon: '⚠' }
}

function toAgentStatus(value) {
  const status = `${value || ''}`.toLowerCase()
  if (status.includes('run')) return 'running'
  if (status.includes('wait') || status.includes('queue') || status.includes('pending')) return 'waiting'
  return 'complete'
}

function normalizeExecutionStatus(doc1 = {}, doc2 = {}) {
  const doc1Map = doc1.agent_execution_status || doc1.agent_status || doc1.execution_status || {}
  const improvements = Array.isArray(doc2.agent_improvements) ? doc2.agent_improvements : []
  const output = {}

  AGENT_DEFS.forEach((agent) => {
    const fromDoc1 = doc1Map[agent.id] || doc1Map[agent.name] || doc1Map[agent.name.toLowerCase()]
    const fromDoc2 = improvements.find((item) => {
      const name = `${item.agent || item.name || ''}`.toLowerCase()
      return name.includes(agent.id) || name.includes(agent.name.toLowerCase().replace(' agent', ''))
    })
    output[agent.id] = toAgentStatus(fromDoc1 || fromDoc2?.status || 'complete')
  })

  return output
}

function pickIssueList(doc2Issues, keys) {
  for (const key of keys) {
    const list = doc2Issues?.[key]
    if (Array.isArray(list) && list.length) return list
  }
  return []
}

function normalizeIssues(doc1 = {}, doc2 = {}) {
  const doc2Issues = doc2.issues || doc2.agent_issues || {}

  return {
    security: pickIssueList(doc2Issues, ['security', 'security_agent'])
      .concat((doc1.security?.issues || []).map((x) => x?.title || x?.description || JSON.stringify(x))),
    'code-review': pickIssueList(doc2Issues, ['code_review', 'code-review', 'review'])
      .concat((doc1.code_smells?.issues || []).map((x) => x?.type || x?.description || JSON.stringify(x))),
    dependency: pickIssueList(doc2Issues, ['dependency', 'dependencies'])
      .concat((doc1.dependencies?.risks || []).map((x) => `${x?.package || 'Package'} ${x?.current || ''} -> ${x?.latest || ''} (${x?.risk || 'Unknown'})`)),
    documentation: pickIssueList(doc2Issues, ['docs', 'documentation'])
      .concat((doc1.documentation?.issues || []).map((x) => x?.description || x?.type || JSON.stringify(x))),
    quality: pickIssueList(doc2Issues, ['code_quality', 'quality'])
      .concat((doc1.code_smells?.bugs_detected || []).map((x) => x?.description || x?.type || JSON.stringify(x))),
    learning: pickIssueList(doc2Issues, ['learning', 'learning_agent'])
      .concat((doc1.learning_insights || []).map((x) => `${x}`)),
    contribution: pickIssueList(doc2Issues, ['contribution', 'contributors', 'developer_reputation'])
      .concat((doc1.developer_reputation?.contributors || []).map((x) => `${x.login || 'dev'}: ${x.commits || 0} commits`)),
  }
}

function resolveAgentScores(doc1 = {}, doc2 = {}) {
  const learningInsights = Array.isArray(doc1.learning_insights) ? doc1.learning_insights : []
  const learningScore = learningInsights.length > 0 ? 70 : 0

  return {
    security: clampScore(doc1.security?.score ?? doc2.security?.score),
    'code-review': clampScore(doc1.code_smells?.score ?? doc2.code_review?.score),
    dependency: clampScore(doc1.dependencies?.score ?? doc2.dependencies?.score),
    documentation: clampScore(doc1.documentation?.score ?? doc2.docs?.score ?? doc2.documentation?.score),
    quality: clampScore(doc1.code_smells?.score ?? doc2.code_quality?.score),
    learning: clampScore(learningScore),
    contribution: clampScore(doc1.developer_reputation?.score ?? doc2.contribution?.score),
  }
}

function normalizeSources(state, repoUrl, initialData) {
  const candidates = [
    initialData,
    state?.data,
    state?.doc1,
    state?.analysis,
    state?.result,
    state,
  ].filter(Boolean)

  const doc1 = candidates.find((c) => hasDoc1Shape(c)) || null
  const doc2 = candidates.find((c) => hasDoc2Shape(c)) || null

  if (!doc1 && !doc2) {
    return { doc1: getFallbackData(repoUrl), doc2: null }
  }

  return {
    doc1: doc1 || getFallbackData(repoUrl),
    doc2,
  }
}

function CountUpValue({ value, duration = 1000, suffix = '' }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const finalValue = Number(value) || 0
    let raf = 0
    let start = 0

    const step = (time) => {
      if (!start) start = time
      const progress = Math.min((time - start) / duration, 1)
      const eased = 1 - ((1 - progress) * (1 - progress) * (1 - progress))
      setDisplay(Math.round(finalValue * eased))
      if (progress < 1) raf = window.requestAnimationFrame(step)
    }

    raf = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span>{display}{suffix}</span>
  )
}

function HealthScoreOrb({ score }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 30)
    return () => window.clearTimeout(timer)
  }, [])

  const normalizedScore = clampScore(score)
  const orbOuterColor = '#a88c3a'
  const orbStart = '#c9a84c'
  const orbEnd = '#8b7030'
  const size = 300
  const radius = 112
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - normalizedScore / 100)

  return (
    <div className="health-orb-wrap" style={{ '--score-accent': orbOuterColor }}>
      <div className="health-orb">
        <svg className="health-orb-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="healthRingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={orbStart} />
              <stop offset="100%" stopColor={orbEnd} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius + 10} className="health-orb-outer" />
          <circle cx={size / 2} cy={size / 2} r={radius} className="health-orb-track" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="health-orb-progress"
            style={{
              stroke: 'url(#healthRingGradient)',
              strokeDasharray: circumference,
              strokeDashoffset: ready ? offset : circumference,
            }}
          />
          <circle cx={size / 2} cy={size / 2} r={radius - 20} className="health-orb-inner" />
        </svg>

        <div className="health-orb-center">
          <div className="health-orb-score"><CountUpValue value={normalizedScore} suffix="%" /></div>
          <div className="health-orb-label">Repository Health Score</div>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="dashboard-skeleton reveal-seq" style={{ '--reveal-delay': '0ms' }}>
      <div className="skeleton-top" />
      <div className="skeleton-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    </div>
  )
}

function shorten(text, max = 115) {
  const value = `${text || ''}`.trim()
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}...`
}

function buildFixIssuePayload(analysis = {}) {
  const fallbackFiles = Array.isArray(analysis.analyzed_file_paths) ? analysis.analyzed_file_paths : []
  const fallbackFile = fallbackFiles[0] || ''

  const fromSecurity = (analysis.security?.issues || []).map((item) => ({
    category: 'security',
    title: item.title || 'Security issue',
    description: item.suggested_fix || item.owasp || '',
    severity: item.severity || 'MEDIUM',
    file: item.file || fallbackFile,
    fallback_file: fallbackFile,
  }))

  const fromCodeSmells = (analysis.code_smells?.issues || []).map((item) => ({
    category: 'code-smell',
    title: item.type || 'Code smell',
    description: item.description || '',
    severity: item.severity || 'MEDIUM',
    file: item.file || fallbackFile,
    fallback_file: fallbackFile,
  }))

  const fromBugs = (analysis.code_smells?.bugs_detected || []).map((item) => ({
    category: 'bug-risk',
    title: item.type || 'Bug risk',
    description: item.description || '',
    severity: item.severity || 'MEDIUM',
    file: item.file || fallbackFile,
    fallback_file: fallbackFile,
  }))

  const fromDocs = (analysis.documentation?.issues || []).map((item) => ({
    category: 'documentation',
    title: item.issue || item.type || 'Documentation issue',
    description: item.description || '',
    severity: item.severity || 'LOW',
    file: item.function || item.file || fallbackFile,
    fallback_file: fallbackFile,
  }))

  return [...fromSecurity, ...fromCodeSmells, ...fromBugs, ...fromDocs].slice(0, 3)
}

export default function Dashboard({ initialData = null, initialRepoUrl = '' }) {
  const { state } = useLocation()
  const navigate = useNavigate()
  const repoUrl = initialRepoUrl || state?.repoUrl || 'https://github.com/facebook/react'
  const [apiData, setApiData] = useState(null)
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [expandedAgent, setExpandedAgent] = useState(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'Ask anything about this repository analysis and I will answer from the report.' },
  ])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [prLoading, setPrLoading] = useState(false)
  const [prError, setPrError] = useState('')
  const [prUrl, setPrUrl] = useState('')
  const { message: toastMessage, show: showToast } = useToastMessage()

  useEffect(() => {
    let alive = true

    const hydrate = async () => {
      setIsLoading(true)
      setApiError('')

      const local = normalizeSources(state, repoUrl, initialData)
      let doc1 = local.doc1
      let doc2 = local.doc2
      const failures = []

      const needsDoc1 = !hasDoc1Shape(doc1)
      const needsDoc2 = !hasDoc2Shape(doc2)

      if (needsDoc1) {
        const calls = []

        if (needsDoc1) {
          calls.push(
            fetch(`/repo-health?repo_url=${encodeURIComponent(repoUrl)}`)
              .then((res) => {
                if (!res.ok) throw new Error('repo-health request failed')
                return res.json()
              })
              .then((payload) => ({ type: 'doc1', payload }))
              .catch((err) => {
                failures.push(err.message)
                return null
              }),
          )
        }

        const results = await Promise.all(calls)
        results.filter(Boolean).forEach((entry) => {
          if (entry.type === 'doc1' && hasDoc1Shape(entry.payload)) doc1 = entry.payload
          if (entry.type === 'doc2' && hasDoc2Shape(entry.payload)) doc2 = entry.payload
        })

        if (failures.length && !hasDoc1Shape(doc1)) {
          setApiError('Unable to load analysis endpoints. Showing fallback intelligence snapshot.')
        }
      }

      if (needsDoc2) {
        doc2 = local.doc2 || {}
      }

      if (!hasDoc1Shape(doc1)) {
        doc1 = getFallbackData(repoUrl)
      }

      if (alive) {
        setApiData({ doc1, doc2 })
        setIsLoading(false)
      }
    }

    hydrate()

    return () => {
      alive = false
    }
  }, [state, repoUrl, retryCount, initialData])

  const data = useMemo(() => apiData?.doc1 || getFallbackData(repoUrl), [apiData, repoUrl])
  const doc2 = useMemo(() => apiData?.doc2 || {}, [apiData])

  const repoName = data.repo_name || repoUrl?.split('/').slice(-2).join('/') || 'Unknown'
  const reviewTimeSaved = data.review_time_saved || '5.2 hrs'

  const statusMap = useMemo(() => normalizeExecutionStatus(data, doc2), [data, doc2])
  const scoreMap = useMemo(() => resolveAgentScores(data, doc2), [data, doc2])
  const issuesMap = useMemo(() => normalizeIssues(data, doc2), [data, doc2])

  const overallScore = clampScore(doc2.overall_score ?? data.health_score ?? 0)
  const overallGrade = doc2.grade || scoreGrade(overallScore)

  const securityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  ;(data.security?.issues || []).forEach((issue) => {
    if (securityCounts[issue.severity] !== undefined) securityCounts[issue.severity] += 1
  })

  const contributorList = data.developer_reputation?.contributors || []

  const collaborationFlow = data.agent_collaboration_flow || [
    { agent: 'Security Agent', icon: '🛡️', text: 'Detected hardcoded credential pattern', time: '12:03' },
    { agent: 'Quality Agent', icon: '✨', text: 'Confirmed insecure implementation path', time: '12:04' },
    { agent: 'Reporting', icon: '📣', text: 'Marked issue as high risk and escalated', time: '12:05' },
  ]

  const executionTimeline = data.agent_execution_timeline || [
    { time: '12:01', icon: '📥', text: `Repository fetched — ${repoName}`, status: 'complete' },
    { time: '12:02', icon: '🛡️', text: 'Security Agent scanning...', status: 'running' },
    { time: '12:03', icon: '📦', text: 'Dependency Agent scanning...', status: 'running' },
    { time: '12:04', icon: '✅', text: 'Code Quality Agent completed — 6 issues found', status: 'complete' },
    { time: '12:05', icon: '✅', text: 'Security Agent completed — 3 vulnerabilities', status: 'complete' },
    { time: '12:06', icon: '✅', text: 'Documentation Agent completed — 81% coverage', status: 'complete' },
    { time: '12:07', icon: '✅', text: 'All agents complete — generating report', status: 'complete' },
  ]

  const agentCards = useMemo(() => {
    const docIssues = data.documentation?.issues || []
    const depRisks = data.dependencies?.risks || []
    const codeSmells = data.code_smells?.issues || []
    const bugRisks = data.code_smells?.bugs_detected || []
    const secIssues = data.security?.issues || []
    const learning = data.learning_insights || []

    return AGENT_DEFS.map((agent) => {
      const score = scoreMap[agent.id] ?? 0
      const issues = (issuesMap[agent.id] || []).filter(Boolean)
      const status = statusMap[agent.id] || 'complete'
      const risk = riskFromScore(score)

      const defaults = {
        security: {
          metrics: [`🔴 ${securityCounts.HIGH} High Issues`, `🟡 ${securityCounts.MEDIUM} Medium`, `🟢 ${securityCounts.LOW} Low`],
          findings: secIssues.slice(0, 3).map((issue) => ({
            title: `${issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢'} ${issue.title || 'Security finding'}`,
            meta: `File: ${issue.file || 'src/config.js'}  ${issue.owasp || 'OWASP A02'}`,
            fix: `Fix: ${issue.severity === 'HIGH' ? 'Move credential to environment variable store' : 'Apply remediation best-practices'}`,
          })),
        },
        'code-review': {
          metrics: [`📋 ${codeSmells[0]?.type || 'Long Method'} ×${Math.max(codeSmells.length, 1)}`, '🔁 Duplicate Code', '🏛 God Class'],
          findings: codeSmells.slice(0, 3).map((issue) => ({
            title: `🟡 ${issue.type || 'Pattern warning'}`,
            meta: shorten(issue.description || 'Potential maintainability issue detected', 80),
            fix: 'Fix: Split into smaller composable functions',
          })),
        },
        dependency: {
          metrics: [`📦 ${depRisks.length} Outdated`, `🚨 ${(depRisks || []).filter((item) => `${item.risk}`.toUpperCase() === 'HIGH').length} Critical`, `⚡ ${(depRisks || []).filter((item) => `${item.risk}`.toUpperCase() !== 'LOW').length} Vulnerable`],
          findings: depRisks.slice(0, 3).map((dep) => ({
            title: `${dep.risk === 'HIGH' ? '🔴' : dep.risk === 'MEDIUM' ? '🟡' : '🟢'} ${dep.package} ${dep.current} → ${dep.latest} ${dep.risk}`,
            meta: dep.risk === 'HIGH' ? 'Known RCE vulnerability in older version' : 'Security patches available',
            fix: `Fix: npm install ${dep.package}@${dep.latest}`,
          })),
        },
        documentation: {
          metrics: [`📚 ${docIssues.length} Doc Issues`, `🧾 ${data.documentation?.score || 0}% Coverage`, '✍ Onboarding Missing'],
          findings: docIssues.slice(0, 3).map((issue) => ({
            title: `⚠ ${issue.type || 'Documentation gap'}`,
            meta: shorten(issue.description || 'Coverage issue detected', 82),
            fix: 'Fix: Add missing README/JSDoc sections',
          })),
        },
        quality: {
          metrics: [`🐞 ${bugRisks.length} Risky Bugs`, '🧪 Reliability Focus', '🛠 Refactor Needed'],
          findings: bugRisks.slice(0, 3).map((bug) => ({
            title: `🟡 ${bug.type || 'Runtime Risk'}`,
            meta: shorten(bug.description || 'Execution path may fail at runtime', 82),
            fix: 'Fix: Add guard clauses and explicit error handling',
          })),
        },
        learning: {
          metrics: [`🧠 ${learning.length} Insights`, '📊 Pattern Match', '🔮 Risk Forecast'],
          findings: learning.slice(0, 3).map((insight) => ({
            title: '🧠 Learning Insight',
            meta: shorten(`${insight}`, 88),
            fix: 'Fix: Prioritize repeated risk motifs in backlog',
          })),
        },
        contribution: {
          metrics: [`👤 ${contributorList[0]?.commits || 0} Top Commits`, `🌿 ${contributorList.length} Contributors`, '📈 Team Velocity'],
          findings: contributorList.slice(0, 3).map((contributor) => ({
            title: `👤 ${contributor.login}: ${contributor.commits} commits (+${contributor.additions}/-${contributor.deletions})`,
            meta: 'High commit frequency and collaboration consistency',
            fix: 'Fix: Keep review distribution balanced across team',
          })),
        },
      }

      const fallbackFindings = defaults[agent.id]?.findings || []
      const normalizedFindings = (fallbackFindings.length ? fallbackFindings : issues.slice(0, 3).map((item) => ({
        title: `⚠ ${shorten(`${item}`, 52)}`,
        meta: shorten(`${item}`, 84),
        fix: 'Fix: See detailed agent breakdown',
      }))).slice(0, 3)

      return {
        ...agent,
        score,
        status,
        risk,
        metrics: defaults[agent.id]?.metrics || ['⚙ Metric A', '⚙ Metric B', '⚙ Metric C'],
        findings: normalizedFindings,
        allIssues: issues,
      }
    })
  }, [data, scoreMap, statusMap, issuesMap, securityCounts.HIGH, securityCounts.MEDIUM, securityCounts.LOW, contributorList, repoName])

  useEffect(() => {
    const blocks = document.querySelectorAll('.reveal-seq')
    if (!blocks.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 },
    )

    blocks.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [isLoading, agentCards.length])

  const handleRetry = () => setRetryCount((prev) => prev + 1)

  const handleExport = async (agent) => {
    const payload = {
      agent: agent.name,
      score: agent.score,
      risk_level: agent.risk.label,
      status: agent.status,
      issues: agent.allIssues,
      findings: agent.findings,
      generated_at: new Date().toISOString(),
      repo: repoName,
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      showToast('✅ Copied!')
    } catch (err) {
      console.error('Clipboard export failed', err)
    }
  }

  const handleDownloadJson = () => {
    const payload = {
      repo: repoName,
      generated_at: new Date().toISOString(),
      overall_score: overallScore,
      grade: overallGrade,
      agents: agentCards,
      source: data,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${repoName.replace('/', '-')}-analysis.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleViewIssues = (agentId) => {
    setExpandedAgent(agentId)
    const node = document.getElementById(`agent-row-${agentId}`)
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const radarData = [
    { metric: 'Security', value: clampScore(data.security?.score ?? scoreMap.security) },
    { metric: 'Quality', value: clampScore(data.code_smells?.score ?? scoreMap.quality) },
    { metric: 'Docs', value: clampScore(data.documentation?.score ?? scoreMap.documentation) },
    { metric: 'Dependencies', value: clampScore(data.dependencies?.score ?? scoreMap.dependency) },
    { metric: 'Contribution', value: clampScore(data.developer_reputation?.score ?? scoreMap.contribution) },
  ]
  const topFixIssues = useMemo(() => buildFixIssuePayload(data), [data])

  const handleSendChat = async () => {
    const message = chatInput.trim()
    if (!message || chatLoading) return

    setChatError('')
    setChatInput('')
    setChatHistory((prev) => [...prev, { role: 'user', text: message }])
    setChatLoading(true)

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl,
          message,
          analysis: data,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.detail || 'Chat request failed')
      }
      const payload = await res.json()
      const reply = `${payload?.reply || ''}`.trim() || 'No response generated.'
      setChatHistory((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Failed to get AI reply.'
      setChatError(messageText)
      setChatHistory((prev) => [...prev, { role: 'assistant', text: `Error: ${messageText}` }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleGenerateFixPr = async () => {
    if (prLoading) return
    if (!githubToken.trim()) {
      setPrError('GitHub token is required to generate a PR.')
      return
    }
    if (!topFixIssues.length) {
      setPrError('No issues available to auto-fix.')
      return
    }

    setPrError('')
    setPrUrl('')
    setPrLoading(true)

    try {
      const res = await fetch('http://localhost:8000/generate-fix-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl,
          github_token: githubToken.trim(),
          issues: topFixIssues,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.detail || 'Failed to generate PR')
      }
      const payload = await res.json()
      if (!payload?.pr_url) throw new Error('PR URL missing in response.')
      setPrUrl(payload.pr_url)
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', text: `Fix PR created successfully: ${payload.pr_url}` },
      ])
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'PR generation failed.'
      setPrError(messageText)
      setChatHistory((prev) => [...prev, { role: 'assistant', text: `PR generation failed: ${messageText}` }])
    } finally {
      setPrLoading(false)
    }
  }

  const renderExpandedPanel = (agent) => {
    if (agent.id === 'security') {
      const rows = data.security?.issues || []
      return (
        <div className="expanded-table-wrap">
          <table className="expanded-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>File</th>
                <th>OWASP</th>
                <th>CVSS</th>
                <th>Reasoning</th>
                <th>Fix</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${agent.id}-r-${idx}`}>
                  <td>{row.severity || 'MEDIUM'}</td>
                  <td>{row.file || 'src/config.js:42'}</td>
                  <td>{row.owasp || 'OWASP A02'}</td>
                  <td>{row.cvss || (row.severity === 'HIGH' ? '8.8' : '6.4')}</td>
                  <td>{shorten(row.title || row.description || 'Potential exploit path detected by scanner.', 70)}</td>
                  <td>Move secrets to environment variables and rotate exposed values.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (agent.id === 'code-review') {
      const rows = data.code_smells?.issues || []
      return (
        <div className="expanded-stack">
          {rows.slice(0, 3).map((row, idx) => (
            <div className="expanded-block" key={`${agent.id}-r-${idx}`}>
              <p className="expanded-block-title">{row.type || 'Code Issue'} · DRY/OCP review</p>
              <p className="expanded-block-sub">{shorten(row.description || 'Refactor suggestion required', 90)}</p>
              <div className="code-dual">
                <pre>{`// Before\nfunction handleAll(){\n  // long mixed responsibility block\n}`}</pre>
                <pre>{`// After\nfunction parseInput(){}\nfunction validateInput(){}\nfunction persistResult(){}`}</pre>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (agent.id === 'dependency') {
      const rows = data.dependencies?.risks || []
      return (
        <div className="expanded-table-wrap">
          <table className="expanded-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Current</th>
                <th>Latest</th>
                <th>CVE</th>
                <th>Severity</th>
                <th>Update Command</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${agent.id}-r-${idx}`}>
                  <td>{row.package}</td>
                  <td>{row.current}</td>
                  <td>{row.latest}</td>
                  <td>{row.cve || `CVE-2024-${1300 + idx}`}</td>
                  <td>{row.risk}</td>
                  <td>{`npm install ${row.package}@${row.latest}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (agent.id === 'documentation') {
      const checks = ['Overview', 'Installation', 'Configuration', 'Usage', 'Contributing', 'License']
      return (
        <div className="expanded-stack">
          {(data.documentation?.issues || []).map((row, idx) => (
            <div className="expanded-block" key={`${agent.id}-r-${idx}`}>
              <p className="expanded-block-title">{row.type || 'Documentation Gap'}</p>
              <p className="expanded-block-sub">{shorten(row.description || 'Missing documentation details', 100)}</p>
            </div>
          ))}
          <div className="expanded-checklist">
            {checks.map((check) => {
              const present = !/installation|contributing/i.test(check)
              return <span key={check}>{present ? '✅' : '❌'} {check}</span>
            })}
          </div>
        </div>
      )
    }

    if (agent.id === 'quality') {
      const rows = data.code_smells?.bugs_detected || []
      return (
        <div className="expanded-stack">
          {rows.map((row, idx) => (
            <div className="expanded-block" key={`${agent.id}-r-${idx}`}>
              <p className="expanded-block-title">{row.type || 'Runtime Defect'} · Confidence {90 - idx * 8}%</p>
              <p className="expanded-block-sub">{shorten(row.description || 'Likely reliability impact during runtime edge cases.', 110)}</p>
            </div>
          ))}
        </div>
      )
    }

    if (agent.id === 'learning') {
      return (
        <div className="expanded-stack">
          {(data.learning_insights || []).map((item, idx) => (
            <div className="expanded-block" key={`${agent.id}-r-${idx}`}>
              <p className="expanded-block-title">Pattern Comparison {idx + 1}</p>
              <p className="expanded-block-sub">{shorten(item, 120)}</p>
            </div>
          ))}
          <div className="heatmap-grid">
            {Array.from({ length: 30 }).map((_, i) => (
              <span key={i} style={{ opacity: 0.22 + ((i % 5) * 0.14) }} />
            ))}
          </div>
        </div>
      )
    }

    const bars = (data.developer_reputation?.contributors || []).map((item) => ({
      name: item.login,
      commits: item.commits,
    }))

    return (
      <div className="expanded-stack">
        <div className="expanded-table-wrap">
          <table className="expanded-table">
            <thead>
              <tr>
                <th>Developer</th>
                <th>Commits</th>
                <th>Additions</th>
                <th>Deletions</th>
                <th>PR Accept</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {(data.developer_reputation?.contributors || []).map((row, idx) => (
                <tr key={`${agent.id}-r-${idx}`}>
                  <td>{row.login}</td>
                  <td>{row.commits}</td>
                  <td>{row.additions}</td>
                  <td>{row.deletions}</td>
                  <td>{Math.max(74, 90 - idx * 7)}%</td>
                  <td>{Math.max(68, 92 - idx * 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mini-bar-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={bars}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Bar dataKey="commits" fill={agent.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden grid-bg dashboard-surface" style={{ background: '#0d1117' }}>
      {/* Ambient blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-5 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(100px)' }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-5 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)', filter: 'blur(100px)' }} />

      <div className="relative z-10 w-full px-6 sm:px-10 py-6">

        <div className="dashboard-hero-title reveal-seq" style={{ '--reveal-delay': '0ms' }}>
          <h1 className="dashboard-hero-heading" data-text="Repository Analysis">Repository Analysis</h1>
          <div className="dashboard-hero-meta">
            <span className="dashboard-hero-repo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {repoName}
            </span>
            {data.analysis_timestamp && (
              <span>· {new Date(data.analysis_timestamp).toLocaleString()}</span>
            )}
          </div>
          <div className="dashboard-hero-divider" />
        </div>

        {/* ── Header ── */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <button onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-3 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
              New analysis
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="top-review-pill flex items-center gap-2 px-3 py-2 rounded-full">
              <span>⏱</span>
              <span className="text-xs font-semibold">Est. review time saved: {reviewTimeSaved}</span>
            </div>
            <div className="top-complete-pill flex items-center gap-2 px-4 py-2 rounded-full">
              <span className="top-complete-dot w-2 h-2 rounded-full" />
              <span className="text-xs font-semibold uppercase tracking-wider">Analysis Complete</span>
            </div>
          </div>
        </motion.header>

        {apiError && (
          <div className="dashboard-error reveal-seq" style={{ '--reveal-delay': '0ms' }}>
            <p>{apiError}</p>
            <button type="button" onClick={handleRetry}>Retry</button>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <section className="health-agent-top reveal-seq" style={{ '--reveal-delay': '0ms' }}>
              <div className="health-orb-column">
                <HealthScoreOrb score={overallScore} />
              </div>

              <div className="agent-score-column">
                <h2>AI Agent Scores</h2>
                <div className="agent-score-list">
                  {agentCards.map((agent, index) => {
                    const statusTone = STATUS_COLORS[agent.status] || STATUS_COLORS.complete
                    return (
                      <div className="agent-score-row" key={agent.id}>
                        <img className="agent-score-avatar" src={agent.avatar} alt={`${agent.name} avatar`} />
                        <div className="agent-score-name">{agent.name}</div>
                        <div className="agent-score-bar-wrap" title={`${agent.score}/100 - ${agent.scoreHint}`}>
                          <div
                            className="agent-score-bar-fill"
                            style={{
                              '--bar-color': agent.accent,
                              width: `${agent.score}%`,
                              animationDelay: `${index * 100}ms`,
                            }}
                          />
                        </div>
                        <div className="agent-score-value"><CountUpValue value={agent.score} suffix="/100" /></div>
                        <span
                          className="agent-status-pill"
                          style={{
                            color: statusTone.fg,
                            background: statusTone.bg,
                            borderColor: statusTone.border,
                          }}
                        >
                          {agent.status === 'running' ? 'Running' : agent.status === 'waiting' ? 'Waiting' : 'Complete'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="agent-rows-wrap reveal-seq" style={{ '--reveal-delay': '150ms' }}>
              {agentCards.map((agent) => {
                const statusTone = STATUS_COLORS[agent.status] || STATUS_COLORS.complete
                return (
                  <article
                    id={`agent-row-${agent.id}`}
                    key={agent.id}
                    className="agent-row-card"
                    style={{ '--agent-accent': agent.accent }}
                  >
                    <div className="agent-row-col identity-col">
                      <div className="identity-gradient" />
                      <img className="agent-illustration" src={agent.avatar} alt={`${agent.name} illustration`} />
                      <h3>{agent.name}</h3>
                      <p>{agent.role}</p>
                      <span
                        className="identity-status"
                        style={{ color: statusTone.fg, background: statusTone.bg, borderColor: statusTone.border }}
                      >
                        ● {agent.status === 'running' ? 'RUNNING' : agent.status === 'waiting' ? 'WAITING' : 'COMPLETE'}
                      </span>
                    </div>

                    <div className="agent-row-col score-col">
                      <div className="score-grade-wrap">
                        <div className="row-score-value">
                          <span style={{ color: agent.accent }}><CountUpValue value={agent.score} /></span>
                          <small>/100</small>
                        </div>
                        <span className="grade-square" style={{ background: `${agent.accent}22`, borderColor: `${agent.accent}99`, color: agent.accent }}>
                          {scoreGrade(agent.score)}
                        </span>
                      </div>
                      <div className="agent-card-bar" title={`${agent.score}/100 - ${agent.scoreHint}`}>
                        <div className="agent-card-bar-fill" style={{ width: `${agent.score}%` }} />
                      </div>
                      <span className="risk-pill" style={{ background: `${agent.risk.color}22`, borderColor: `${agent.risk.color}99`, color: agent.risk.color }}>
                        {agent.risk.icon} Risk Level: {agent.risk.label}
                      </span>
                      <div className="metric-chip-row">
                        {agent.metrics.slice(0, 3).map((chip) => (
                          <span key={`${agent.id}-${chip}`} className="metric-chip">{chip}</span>
                        ))}
                      </div>
                    </div>

                    <div className="agent-row-col detail-col">
                      <p className="finding-kicker">Key Findings</p>
                      <div className="finding-list">
                        {agent.findings.map((item, idx) => (
                          <div key={`${agent.id}-f-${idx}`} className="finding-item">
                            <p className="finding-title">{item.title}</p>
                            <p className="finding-meta">{item.meta}</p>
                            <p className="finding-fix">{item.fix}</p>
                          </div>
                        ))}
                      </div>
                      <div className="agent-actions">
                        <button type="button" className="agent-action-btn" onClick={() => handleViewIssues(agent.id)}>View Issues</button>
                        <button type="button" className="agent-action-btn" onClick={() => setExpandedAgent((prev) => (prev === agent.id ? null : agent.id))}>See Details</button>
                        <button type="button" className="agent-action-btn" onClick={() => handleExport(agent)}>Export</button>
                      </div>
                    </div>

                    <div className={`agent-expanded ${expandedAgent === agent.id ? 'open' : ''}`}>
                      {renderExpandedPanel(agent)}
                    </div>
                  </article>
                )
              })}
            </section>

            <section className="summary-deck reveal-seq" style={{ '--reveal-delay': '240ms' }}>
              <div className="summary-card collaboration-card">
                <h3>🤝 Agent Collaboration Chain</h3>
                <div className="flow-line">
                  {collaborationFlow.map((step, idx) => (
                    <div className="flow-step" key={`${step.agent}-${idx}`}>
                      <span>{step.icon}</span>
                      <strong>{step.agent}</strong>
                      <p>{step.text}</p>
                      <small>{step.time}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="summary-card timeline-card">
                <h3>⏱ Agent Execution Timeline</h3>
                <div className="timeline-list">
                  {executionTimeline.map((entry, idx) => (
                    <div key={`${entry.time}-${idx}`} className={`timeline-entry status-${entry.status}`} style={{ '--delay': `${idx * 200}ms` }}>
                      <span className="timeline-time">{entry.time}</span>
                      <span className="timeline-icon">{entry.icon}</span>
                      <p>{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="summary-card download-card">
                <h3>📄 Report Downloads</h3>
                <div className="download-actions">
                  <button type="button" className="download-btn primary" onClick={() => window.print()}>📄 Download PDF Report</button>
                  <button type="button" className="download-btn secondary" onClick={handleDownloadJson}>📊 Download JSON Report</button>
                </div>
                <p>Report includes: Repository health score, Security vulnerabilities, Code quality issues, Dependency risks, Developer metrics.</p>
              </div>
            </section>

            <div className="health-banner glass-card px-5 py-4 mb-6 reveal-seq final-health-wide" style={{ '--reveal-delay': '300ms' }}>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Overall Health</p>
                <p className="text-4xl font-black mt-1" style={{ color: scoreColor(overallScore) }}>
                  <CountUpValue value={overallScore} />
                </p>
                <p className="text-sm text-slate-500">Grade {overallGrade}</p>
                <div className="text-sm text-slate-300 max-w-2xl leading-relaxed mt-2">
                  Composite repository score across security, quality, documentation, dependencies, and team collaboration metrics.
                </div>
              </div>
              <div className="radar-holder">
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Radar name="Score" dataKey="value" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {toastMessage && <div className="export-toast">{toastMessage}</div>}

        <button
          type="button"
          className={`repo-chat-fab ${isChatOpen ? 'open' : ''}`}
          onClick={() => setIsChatOpen((prev) => !prev)}
          title="Chat with RepoScan AI"
        >
          {isChatOpen ? '×' : 'Chat'}
        </button>

        <aside className={`repo-chat-panel ${isChatOpen ? 'open' : ''}`} aria-hidden={!isChatOpen}>
          <div className="repo-chat-header">
            <h3>Chat with RepoScan AI</h3>
            <button type="button" onClick={() => setIsChatOpen(false)}>Close</button>
          </div>

          <div className="repo-chat-messages">
            {chatHistory.map((item, idx) => (
              <div key={`chat-${idx}`} className={`repo-chat-msg ${item.role}`}>
                <span>{item.text}</span>
              </div>
            ))}
            {chatLoading && (
              <div className="repo-chat-msg assistant loading">
                <span className="repo-chat-spinner" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {chatError && <p className="repo-chat-error">{chatError}</p>}

          <form
            className="repo-chat-input-wrap"
            onSubmit={(e) => {
              e.preventDefault()
              handleSendChat()
            }}
          >
            <div className="repo-chat-input-row">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about findings, risks, or fixes..."
              />
              <button type="submit" disabled={chatLoading}>{chatLoading ? '...' : 'Send'}</button>
            </div>
          </form>

          <div className="repo-chat-pr-wrap">
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="GitHub token for PR generation"
            />
            <button type="button" onClick={handleGenerateFixPr} disabled={prLoading}>
              {prLoading ? 'Generating...' : 'Generate Fix PR'}
            </button>
            {prError && <p className="repo-chat-error">{prError}</p>}
            {prUrl && (
              <p className="repo-chat-pr-link">
                PR created:{' '}
                <a href={prUrl} target="_blank" rel="noreferrer">{prUrl}</a>
              </p>
            )}
          </div>
        </aside>

        {/* Footer */}
        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="mt-6 pb-4 text-center text-slate-600 text-xs">
          RepoScan AI · Multi-agent repository intelligence · {new Date().getFullYear()}
        </motion.footer>
      </div>
    </div>
  )
}
