import { useWriteContract, useAccount, useChainId, usePublicClient } from 'wagmi';
import { useSendCalls, useCapabilities } from 'wagmi/experimental';
import { encodeFunctionData } from 'viem';
import { getContractAddresses } from '../utils/contracts';

export function useSmartWriteContract() {
  const { writeContractAsync } = useWriteContract();
  const { sendCallsAsync } = useSendCalls();
  const { isConnected, connector } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: availableCapabilities } = useCapabilities();

  const isMainnet = chainId === 8453;
  const { paymasterUrl } = getContractAddresses(isMainnet);
  const hasPaymaster = Boolean(paymasterUrl && !paymasterUrl.includes('YOUR_CDP_API_KEY'));

  /**
   * Executes a smart contract write using ERC-5792 sendCalls (sponsored) if available,
   * otherwise falls back seamlessly to standard writeContractAsync.
   *
   * @param {Object} params
   * @param {string} params.address - Target contract address
   * @param {Array} params.abi - Contract ABI
   * @param {string} params.functionName - Function name to execute
   * @param {Array} [params.args] - Function arguments
   * @param {bigint} [params.value] - Native ETH value (optional)
   * @returns {Promise<string>} Transaction hash or call id
   */
  const executeWrite = async ({ address, abi, functionName, args = [], value = 0n }) => {
    const chainCapabilities = availableCapabilities?.[chainId];
    const isPaymasterSupported = Boolean(chainCapabilities?.paymasterService?.supported);
    const isCoinbase = connector?.id === 'coinbaseWalletSDK' || connector?.name?.toLowerCase().includes('coinbase');

    // Pour Coinbase Smart Wallet ou tout wallet compatible ERC-5792, on utilise sendCallsAsync
    if (hasPaymaster && (isPaymasterSupported || isCoinbase)) {
      try {
        const callData = encodeFunctionData({
          abi,
          functionName,
          args,
        });

        const callsId = await sendCallsAsync({
          calls: [
            {
              to: address,
              data: callData,
              value: BigInt(value),
            },
          ],
          capabilities: {
            paymasterService: {
              url: paymasterUrl,
            },
          },
        });

        return callsId;
      } catch (err) {
        console.warn('[useSmartWriteContract] sendCalls failed, trying fallback:', err);
        // Si l'utilisateur a annulé le modal, on relance l'erreur directement
        if (
          err?.name === 'UserRejectedRequestError' ||
          err?.message?.toLowerCase().includes('user rejected') ||
          err?.message?.toLowerCase().includes('user denied')
        ) {
          throw err;
        }
      }
    }

    // Fallback standard Wagmi writeContractAsync
    return await writeContractAsync({
      address,
      abi,
      functionName,
      args,
      value: BigInt(value),
      capabilities: hasPaymaster ? {
        paymasterService: {
          url: paymasterUrl,
        },
      } : undefined,
    });
  };

  /**
   * Safe transaction receipt waiter that supports both standard tx hashes and bundle receipts
   */
  const waitForTx = async (txHashOrCallsId) => {
    if (!publicClient || !txHashOrCallsId) return;
    try {
      if (typeof txHashOrCallsId === 'string' && txHashOrCallsId.startsWith('0x') && txHashOrCallsId.length === 66) {
        await publicClient.waitForTransactionReceipt({ hash: txHashOrCallsId });
      } else {
        // Attente de sécurité pour les bundles
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.warn('[useSmartWriteContract] waitForTx error or timeout (ignored):', e);
    }
  };

  return {
    executeWrite,
    waitForTx,
    writeContractAsync,
    sendCallsAsync,
    hasPaymaster,
  };
}
export default useSmartWriteContract;
