/**
 * Centralized Contract Addresses helper
 * All addresses are read directly from environment variables (.env)
 */

export const CONTRACT_ADDRESSES = {
  testnet: {
    core: import.meta.env.VITE_BROKEX_CORE_TESTNET || '',
    vault: import.meta.env.VITE_BROKEX_VAULT_TESTNET || '',
    lens: import.meta.env.VITE_BROKEX_LENS_TESTNET || '',
    usdc: import.meta.env.VITE_USDC_TESTNET || '',
    paymasterUrl: import.meta.env.VITE_PAYMASTER_URL_TESTNET || '',
  },
  mainnet: {
    core: import.meta.env.VITE_BROKEX_CORE_MAINNET || '',
    vault: import.meta.env.VITE_BROKEX_VAULT_MAINNET || '',
    lens: import.meta.env.VITE_BROKEX_LENS_MAINNET || '',
    usdc: import.meta.env.VITE_USDC_MAINNET || '',
    paymasterUrl: import.meta.env.VITE_PAYMASTER_URL_MAINNET || '',
  }
};

/**
 * Returns contract addresses for current network
 * @param {string|boolean} networkOrIsMainnet - 'mainnet' | 'testnet' or boolean isMainnet
 */
export function getContractAddresses(networkOrIsMainnet = 'mainnet') {
  const isMainnet = networkOrIsMainnet === 'mainnet' || networkOrIsMainnet === true;
  return isMainnet ? CONTRACT_ADDRESSES.mainnet : CONTRACT_ADDRESSES.testnet;
}

/**
 * Returns BaseScan Explorer URL for a Transaction Hash
 */
export function getExplorerTxUrl(txHash, networkOrIsMainnet = 'mainnet') {
  if (!txHash) return '#';
  const isMainnet = networkOrIsMainnet === 'mainnet' || networkOrIsMainnet === true;
  const baseUrl = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Returns BaseScan Explorer URL for an Address
 */
export function getExplorerAddressUrl(address, networkOrIsMainnet = 'mainnet') {
  if (!address) return '#';
  const isMainnet = networkOrIsMainnet === 'mainnet' || networkOrIsMainnet === true;
  const baseUrl = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';
  return `${baseUrl}/address/${address}`;
}

/**
 * Returns BaseScan Explorer URL for a Block
 */
export function getExplorerBlockUrl(blockNumber, networkOrIsMainnet = 'mainnet') {
  if (!blockNumber) return '#';
  const isMainnet = networkOrIsMainnet === 'mainnet' || networkOrIsMainnet === true;
  const baseUrl = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';
  return `${baseUrl}/block/${blockNumber}`;
}
