import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage'
import Dashboard from './components/Dashboard'

export default function App() {
  const [analysisData, setAnalysisData] = useState(null)
  const [analyzedRepoUrl, setAnalyzedRepoUrl] = useState('')

  const handleAnalysisComplete = (data, repoUrl) => {
    setAnalysisData(data)
    setAnalyzedRepoUrl(repoUrl)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage onAnalysisComplete={handleAnalysisComplete} />} />
        <Route path="/dashboard" element={<Dashboard initialData={analysisData} initialRepoUrl={analyzedRepoUrl} />} />
      </Routes>
    </BrowserRouter>
  )
}
