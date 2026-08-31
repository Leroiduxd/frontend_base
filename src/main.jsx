import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/themeManager.js'
import App from './App.jsx'
import { Web3Provider } from './Web3Provider.jsx'
import { FarcasterProvider } from './context/FarcasterContext.jsx'
import { MarketDataProvider } from './context/MarketDataContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Web3Provider>
      <FarcasterProvider>
        <MarketDataProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </MarketDataProvider>
      </FarcasterProvider>
    </Web3Provider>
  </StrictMode>,
)


