import React from 'react';
import { useMarketData } from '../../context/MarketDataContext';

export default function MobileTradeHeader({ activeMarketInfo, setIsMarketSelectorOpen }) {
  const { goldPriceFormatted, changeFormatted, priceChangePercent24h, pythMetadata, maxLeverage } = useMarketData();

  const displayPrice = goldPriceFormatted && goldPriceFormatted !== '...' ? goldPriceFormatted : '2,315.10';
  const displayChange = changeFormatted && changeFormatted !== '...' ? changeFormatted : '+0.00%';
  const isPositive = priceChangePercent24h !== undefined ? priceChangePercent24h >= 0 : !displayChange.startsWith('-');
  const leverageStr = maxLeverage ? `${maxLeverage}x` : '50x';

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px 8px 12px', background: 'transparent', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
        {/* Logo box */}
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#BC8961',
          borderRadius: '6px',
          color: '#000000',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8.5px',
          fontFamily: 'Source Code Pro, monospace',
          letterSpacing: '0.02em',
          flexShrink: 0
        }}>
          [XAU]
        </div>
        
        {/* Name and Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {/* Row 1: Symbol & Leverage + Price on right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-dark)' }}>
                XAU/USD
              </span>
              <span style={{ fontSize: '8px', backgroundColor: 'rgba(188, 137, 97, 0.1)', color: 'var(--gold)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                {leverageStr}
              </span>
            </div>
            
            {/* Price aligned to the right */}
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)', fontFamily: 'Source Code Pro, monospace' }}>
              ${displayPrice}
            </span>
          </div>

          {/* Row 2: Company + Variation on right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-grey)' }}>
              Gold / US Dollar CFD
            </span>
            
            {/* Variation aligned to the right */}
            <span style={{ 
              fontSize: '10.5px', 
              fontWeight: 'bold', 
              color: isPositive ? '#3b82f6' : '#ef4444', 
              fontFamily: 'Source Code Pro, monospace' 
            }}>
              {displayChange}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
