import React, { useState, useEffect } from 'react';
import { createPublicClient, http, namehash, isAddress, getAddress } from 'viem';
import { base } from 'viem/chains';

// Public Base client pour lecture directe on-chain du L2Resolver
const baseClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
});

const L2_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

const resolverAbi = [
  {
    type: 'function',
    name: 'addr',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'name',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'string' }]
  }
];

// Cache mémoire pour éviter les requêtes répétitives
const nameToAddressCache = new Map();
const addressToNameCache = new Map();

/**
 * Valide et normalise une adresse Ethereum.
 * @param {string} addr 
 * @returns {`0x${string}`|null}
 */
export function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'string') return null;
  const trimmed = addr.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null;
  try {
    return getAddress(trimmed.toLowerCase());
  } catch {
    return null;
  }
}

/**
 * Résout un nom ENS / Basename ou un slug en adresse Ethereum (0x...).
 * Exemples supportés :
 * - "0x2211d1D0020DAEA8039E46Cf1367962070d77DA9" -> "0x2211..."
 * - "mous" -> résout "mous.base.eth" -> "0x..."
 * - "mous.base.eth" -> résout "mous.base.eth" -> "0x..."
 * - "vitalik.eth" -> résout "vitalik.eth" -> "0x..."
 * 
 * @param {string} inputName 
 * @returns {Promise<`0x${string}`|null>}
 */
export async function resolveNameToAddress(inputName) {
  if (!inputName || typeof inputName !== 'string') return null;
  const clean = inputName.trim().toLowerCase();
  
  // Si c'est déjà une adresse hex valide
  if (/^0x[a-f0-9]{40}$/i.test(clean)) {
    try {
      return getAddress(clean);
    } catch {
      return null;
    }
  }

  // Éviter de résoudre des routes système
  const reservedSlugs = ['trade', 'markets', 'market', 'portfolio', 'vault', 'referrals', 'r', 'api'];
  if (reservedSlugs.includes(clean)) return null;

  if (nameToAddressCache.has(clean)) {
    return nameToAddressCache.get(clean);
  }

  let fullName = clean;
  if (!fullName.includes('.')) {
    fullName = `${clean}.base.eth`;
  }

  // 1. Essai de résolution directe on-chain sur Base (L2Resolver)
  if (fullName.endsWith('.base.eth')) {
    try {
      const node = namehash(fullName);
      const addr = await baseClient.readContract({
        address: L2_RESOLVER_ADDRESS,
        abi: resolverAbi,
        functionName: 'addr',
        args: [node]
      });
      if (addr && addr !== '0x0000000000000000000000000000000000000000') {
        const checksummed = getAddress(addr);
        nameToAddressCache.set(clean, checksummed);
        nameToAddressCache.set(fullName, checksummed);
        return checksummed;
      }
    } catch (err) {
      console.warn(`[ENS] L2 contract resolution failed for ${fullName}:`, err?.message);
    }
  }

  // 2. Essai via ensdata.net (Supporte .base.eth et .eth)
  try {
    const res = await fetch(`https://api.ensdata.net/${fullName}`);
    if (res.ok) {
      const json = await res.json();
      const addr = json.wallets?.base || json.wallets?.eth || json.address;
      if (addr && isAddress(addr)) {
        const checksummed = getAddress(addr);
        nameToAddressCache.set(clean, checksummed);
        nameToAddressCache.set(fullName, checksummed);
        return checksummed;
      }
    }
  } catch (err) {
    console.warn(`[ENS] ensdata resolution failed for ${fullName}:`, err?.message);
  }

  // 3. Fallback Web3.bio
  try {
    const platform = fullName.endsWith('.base.eth') ? 'basenames' : 'ethereum';
    const res = await fetch(`https://api.web3.bio/profile/${platform}/${fullName}`);
    if (res.ok) {
      const json = await res.json();
      if (json.address && isAddress(json.address)) {
        const checksummed = getAddress(json.address);
        nameToAddressCache.set(clean, checksummed);
        nameToAddressCache.set(fullName, checksummed);
        return checksummed;
      }
    }
  } catch (err) {
    // Ignorer
  }

  return null;
}

/**
 * Résout une adresse Ethereum en nom Basename (.base.eth) ou ENS (.eth).
 * @param {string} address 
 * @returns {Promise<string|null>} Ex: "mous.base.eth" ou "vitalik.eth"
 */
export async function resolveAddressToName(address) {
  if (!address || typeof address !== 'string') return null;
  const cleanAddr = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/i.test(cleanAddr)) return null;

  if (addressToNameCache.has(cleanAddr)) {
    return addressToNameCache.get(cleanAddr);
  }

  // 1. Essai ensdata.net
  try {
    const res = await fetch(`https://api.ensdata.net/${cleanAddr}`);
    if (res.ok) {
      const json = await res.json();
      const foundName = json.ens_primary || json.ens || null;
      if (foundName) {
        addressToNameCache.set(cleanAddr, foundName);
        return foundName;
      }
    }
  } catch (err) {
    console.warn(`[ENS] Reverse lookup error for ${cleanAddr}:`, err?.message);
  }

  // 2. Fallback Web3.bio
  try {
    const res = await fetch(`https://api.web3.bio/profile/ethereum/${cleanAddr}`);
    if (res.ok) {
      const json = await res.json();
      if (json.identity && json.identity.includes('.')) {
        addressToNameCache.set(cleanAddr, json.identity);
        return json.identity;
      }
    }
  } catch (err) {
    // Ignorer
  }

  return null;
}

/**
 * Hook React pour résoudre le nom ENS / Basename d'une adresse de manière asynchrone avec cache.
 * @param {string} address 
 * @returns {string|null}
 */
export function useEnsOrBasename(address) {
  const [ensName, setEnsName] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!address || !isAddress(address)) {
      setEnsName(null);
      return;
    }

    const cleanAddr = address.trim().toLowerCase();
    if (addressToNameCache.has(cleanAddr)) {
      setEnsName(addressToNameCache.get(cleanAddr));
      return;
    }

    resolveAddressToName(address).then((name) => {
      if (isMounted) {
        setEnsName(name);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [address]);

  return ensName;
}

/**
 * Extrait le slug court pour le lien de parrainage.
 * Si "mous.base.eth" -> "mous"
 * Si "vitalik.eth" -> "vitalik.eth"
 * Si pas de nom -> "0x123...456"
 * @param {string} address 
 * @param {string|null} ensName 
 * @returns {string}
 */
export function getCleanReferralSlug(address, ensName) {
  if (ensName) {
    if (ensName.endsWith('.base.eth')) {
      return ensName.replace('.base.eth', '');
    }
    return ensName;
  }
  return address || '';
}

/**
 * Composant React (pur JavaScript) affichant le nom Basename / ENS d'une adresse ou son adresse tronquée en fallback.
 * @param {{ address: string, style?: React.CSSProperties, className?: string }} props 
 */
export function EnsName({ address, style, className }) {
  const ensName = useEnsOrBasename(address);
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—';

  return React.createElement(
    'span',
    { style, className, title: address },
    ensName || shortAddr
  );
}
