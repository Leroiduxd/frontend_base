import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Web3Provider } from './Web3Provider.jsx'
import { MarketDataProvider } from './context/MarketDataContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Web3Provider>
      <MarketDataProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </MarketDataProvider>
    </Web3Provider>
  </StrictMode>,
)


