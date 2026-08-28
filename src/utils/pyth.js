// Pyth Contract Addresses on Base Networks
export const PYTH_CONTRACT_ADDRESSES = {
  testnet: '0xA2aa501b19aff244D90cc15a4Cf739D2725B5729', // Base Sepolia
  mainnet: '0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a', // Base Mainnet
};

export const PYTH_GOLD_FEED_ID = '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2';

export const pythAbi = [
  {
    type: 'function',
    name: 'getUpdateFee',
    stateMutability: 'view',
    inputs: [{ name: 'updateData', type: 'bytes[]' }],
    outputs: [{ name: 'feeAmount', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'updatePriceFeeds',
    stateMutability: 'payable',
    inputs: [{ name: 'updateData', type: 'bytes[]' }],
    outputs: []
  }
];

/**
 * Fetches fresh Hermes Pyth price update proof and calculates on-chain update fee.
 * @param {string} [feedId] 
 * @returns {Promise<{ priceUpdateData: `0x${string}`[], price: number }>}
 */
export async function fetchHermesPythProof(feedId = PYTH_GOLD_FEED_ID) {
  const cleanId = feedId.startsWith('0x') ? feedId : `0x${feedId}`;
  const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${cleanId}`);
  if (!res.ok) {
    throw new Error("Unable to fetch fresh price update proof from Pyth Hermes Network");
  }
  const data = await res.json();
  const binaryData = data?.binary?.data?.[0];
  if (!binaryData) {
    throw new Error("Invalid Pyth update proof payload");
  }

  const proofHex = binaryData.startsWith('0x') ? binaryData : `0x${binaryData}`;
  const p = data.parsed?.[0]?.price;
  const price = p ? Number(p.price) * Math.pow(10, p.expo) : 0;

  return {
    priceUpdateData: [proofHex],
    price
  };
}
