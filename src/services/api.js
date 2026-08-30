const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://base.brokex.trade';

export const api = {
  baseUrl: API_BASE_URL,

  // Oracle Price Endpoint avec network optionnel
  async getOraclePrice(network = 'mainnet') {
    const res = await fetch(`${API_BASE_URL}/oracle?network=${network}`);
    if (!res.ok) {
      throw new Error(`Oracle API error: ${res.statusText}`);
    }
    return res.json();
  },

  // Pyth Price Update Proof Endpoint pour openMarket / closeMarket
  async getProof(network = 'mainnet') {
    const res = await fetch(`${API_BASE_URL}/proof?network=${network}`);
    if (!res.ok) {
      throw new Error(`Pyth proof API error: ${res.statusText}`);
    }
    return res.json();
  },

  // Protocol Info Endpoint avec network (testnet ou mainnet)
  async getProtocolInfo(network = 'mainnet') {
    const res = await fetch(`${API_BASE_URL}/protocol-info?network=${network}`);
    if (!res.ok) {
      throw new Error(`Protocol info API error: ${res.statusText}`);
    }
    return res.json();
  },

  // Markets Endpoint
  async getMarkets(network = 'mainnet') {
    const res = await fetch(`${API_BASE_URL}/markets?network=${network}`);
    if (!res.ok) {
      throw new Error(`Markets API error: ${res.statusText}`);
    }
    return res.json();
  },

  // Chart History Candles Endpoint (OHLCV)
  async getChartHistory({ resolution = '15', limit = 200, from, to, network = 'mainnet' } = {}) {
    const url = new URL(`${API_BASE_URL}/chart/history`);
    url.searchParams.append('resolution', resolution);
    url.searchParams.append('limit', String(limit));
    if (network) url.searchParams.append('network', network);
    if (from) url.searchParams.append('from', String(from));
    if (to) url.searchParams.append('to', String(to));

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Chart history API error: ${res.statusText}`);
    }
    return res.json();
  },

  // Trades Endpoint avec pagination et network
  async getTrades({ limit = 50, offset = 0, status, network = 'mainnet' } = {}) {
    const url = new URL(`${API_BASE_URL}/trades`);
    url.searchParams.append('limit', String(limit));
    url.searchParams.append('offset', String(offset));
    if (network) url.searchParams.append('network', network);
    if (status) url.searchParams.append('status', status);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Trades API error: ${res.statusText}`);
    }
    return res.json();
  },

  // Trader Positions & History Endpoint
  async getTraderTrades(address, network = 'mainnet') {
    if (!address) return { success: false, trades: [] };
    const res = await fetch(`${API_BASE_URL}/trader/${address}?network=${network}`);
    if (!res.ok) {
      throw new Error(`Trader trades API error: ${res.statusText}`);
    }
    return res.json();
  },

  // Referral System Endpoint
  async getReferrals(address, network = 'mainnet') {
    if (!address) return { success: false, referrer: null };
    const res = await fetch(`${API_BASE_URL}/referrals/${address}?network=${network}`);
    if (!res.ok) {
      throw new Error(`Referrals API error: ${res.statusText}`);
    }
    return res.json();
  },

  // Méthode générique pour tous les endpoints avec gestion de params
  async getEndpoint(endpoint, params = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${API_BASE_URL}${cleanEndpoint}`);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val);
      }
    });
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`API error (${endpoint}): ${res.statusText}`);
    }
    return res.json();
  }
};
