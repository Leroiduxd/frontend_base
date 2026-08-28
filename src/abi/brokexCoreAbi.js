export const brokexCoreAbi = [
  {
    "type": "function",
    "name": "openMarket",
    "inputs": [
      {
        "name": "request",
        "type": "tuple",
        "internalType": "struct BrokexCore.MarketOrder",
        "components": [
          { "name": "assetId", "type": "uint256", "internalType": "uint256" },
          { "name": "direction", "type": "uint8", "internalType": "uint8" },
          { "name": "collateral", "type": "uint256", "internalType": "uint256" },
          { "name": "leverage", "type": "uint256", "internalType": "uint256" },
          { "name": "stopLoss", "type": "uint256", "internalType": "uint256" },
          { "name": "takeProfit", "type": "uint256", "internalType": "uint256" },
          { "name": "referrer", "type": "address", "internalType": "address" }
        ]
      },
      {
        "name": "priceUpdateData",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "outputs": [
      { "name": "tradeId", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "openOrder",
    "inputs": [
      {
        "name": "request",
        "type": "tuple",
        "internalType": "struct BrokexCore.PendingOrder",
        "components": [
          { "name": "assetId", "type": "uint256", "internalType": "uint256" },
          { "name": "direction", "type": "uint8", "internalType": "uint8" },
          { "name": "orderType", "type": "uint8", "internalType": "uint8" },
          { "name": "targetPrice", "type": "uint256", "internalType": "uint256" },
          { "name": "collateral", "type": "uint256", "internalType": "uint256" },
          { "name": "leverage", "type": "uint256", "internalType": "uint256" },
          { "name": "stopLoss", "type": "uint256", "internalType": "uint256" },
          { "name": "takeProfit", "type": "uint256", "internalType": "uint256" },
          { "name": "referrer", "type": "address", "internalType": "address" }
        ]
      }
    ],
    "outputs": [
      { "name": "tradeId", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "closeMarket",
    "inputs": [
      { "name": "tradeId", "type": "uint256", "internalType": "uint256" },
      { "name": "priceUpdateData", "type": "bytes[]", "internalType": "bytes[]" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancel",
    "inputs": [
      { "name": "tradeId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setStops",
    "inputs": [
      { "name": "tradeId", "type": "uint256", "internalType": "uint256" },
      { "name": "newSL", "type": "uint256", "internalType": "uint256" },
      { "name": "newTP", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimReferralRewards",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
];

export default brokexCoreAbi;
