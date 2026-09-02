import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Markets from './pages/Markets'
import Trade from './pages/Trade'
import Portfolio from './pages/Portfolio'
import Vault from './pages/Vault'
import useIsMobile from './hooks/useIsMobile'
import MobileMarkets from './mobile/pages/MobileMarkets'
import MobileTrade from './mobile/pages/MobileTrade'
import MobilePortfolio from './mobile/pages/MobilePortfolio'
import MobileVault from './mobile/pages/MobileVault'
import Airdrop from './pages/Airdrop'
import { ReferralHandler } from './utils/referral'
import './App.css'

function App() {
  const isMobile = useIsMobile();

  return (
    <Router>
      <ReferralHandler />
      <Routes>
        <Route path="/" element={isMobile ? <MobileTrade /> : <Trade />} />
        <Route path="/portfolio" element={isMobile ? <MobileTrade /> : <Trade />} />
        <Route path="/market" element={isMobile ? <MobileTrade /> : <Markets />} />
        <Route path="/vault" element={isMobile ? <MobileTrade /> : <Vault />} />
        <Route path="/airdrop" element={<Airdrop />} />
        <Route path="*" element={isMobile ? <MobileTrade /> : <Trade />} />
      </Routes>
    </Router>
  )
}

export default App

