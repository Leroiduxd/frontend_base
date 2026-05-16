import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Markets from './pages/Markets'
import Trade from './pages/Trade'
import Portfolio from './pages/Portfolio'
import Vault from './pages/Vault'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Trade />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/market" element={<Markets />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="*" element={<Trade />} />
      </Routes>
    </Router>
  )
}

export default App
