import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getAddress } from 'viem';
import { useAccount } from 'wagmi';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../services/api';
import { resolveNameToAddress } from './ens.js';

export const REFERRER_STORAGE_KEY = 'brokex_referrer';
export const REFERRER_NAME_STORAGE_KEY = 'brokex_referrer_name';

/**
 * Valide et normalise une adresse Ethereum en format checksum officiel.
 * Tolérant aux majuscules/minuscules et espaces.
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
 * Récupère l'adresse du parrain :
 * 1. Depuis les paramètres d'URL actuels (?ref=0x... / ?r=0x... / /0x...)
 * 2. En fallback depuis le localStorage
 * @param {string} [currentAccount] L'adresse connectée de l'utilisateur pour éviter l'auto-parrainage
 * @returns {`0x${string}`} Adresse checksummée du parrain ou adresse nulle (0x000...000)
 */
export function getSavedReferrer(currentAccount) {
  try {
    let candidate = null;

    // 1. Vérifier si une adresse hex valide est présente directement dans l'URL
    if (typeof window !== 'undefined' && window.location) {
      const searchParams = new URLSearchParams(window.location.search);
      const urlParam = searchParams.get('ref') || searchParams.get('r') || searchParams.get('referrer');
      if (urlParam && normalizeAddress(urlParam)) {
        candidate = urlParam;
      } else {
        const segments = window.location.pathname.split('/').filter(Boolean);
        for (const seg of segments) {
          if (normalizeAddress(seg)) {
            candidate = seg;
            break;
          }
        }
      }
    }

    // 2. Fallback sur le localStorage (qui contient l'adresse résolue par ReferralHandler)
    if (!candidate) {
      candidate = localStorage.getItem(REFERRER_STORAGE_KEY);
    }

    const normalizedSaved = normalizeAddress(candidate);
    const normalizedAccount = normalizeAddress(currentAccount);

    if (normalizedSaved && normalizedSaved !== '0x0000000000000000000000000000000000000000') {
      // Synchroniser dans le storage au cas où
      localStorage.setItem(REFERRER_STORAGE_KEY, normalizedSaved);

      // Éviter l'auto-parrainage
      if (normalizedAccount && normalizedAccount.toLowerCase() === normalizedSaved.toLowerCase()) {
        console.log("[Referral] Self-referral detected and ignored.");
        return '0x0000000000000000000000000000000000000000';
      }
      return normalizedSaved;
    }
  } catch (err) {
    console.warn("[Referral] Error reading saved referrer:", err);
  }
  return '0x0000000000000000000000000000000000000000';
}

/**
 * Vérifie si le trader a déjà un parrain assigné on-chain via l'API /referrals/:address.
 * Si oui, retourne 0x000...000 car la liaison est déjà permanente sur le contrat.
 * Sinon, retourne le parrain du localStorage ou de l'URL.
 * @param {string} currentAccount 
 * @param {string} [network]
 * @returns {Promise<`0x${string}`>}
 */
export async function getEffectiveReferrerToSubmit(currentAccount, network = 'testnet') {
  const normalizedAccount = normalizeAddress(currentAccount);
  if (!normalizedAccount) {
    return '0x0000000000000000000000000000000000000000';
  }

  try {
    const data = await api.getReferrals(normalizedAccount, network);
    if (data && data.referrer) {
      const existingRef = normalizeAddress(data.referrer);
      if (existingRef && existingRef !== '0x0000000000000000000000000000000000000000') {
        console.log(`[Referral] Trader already bound on-chain to ${existingRef}. Sending 0x0 address.`);
        return '0x0000000000000000000000000000000000000000';
      }
    }
  } catch (err) {
    console.warn("[Referral] Could not check existing on-chain referral:", err);
  }

  // Si une adresse est déjà enregistrée dans le storage
  let savedRef = getSavedReferrer(normalizedAccount);
  if (savedRef && savedRef !== '0x0000000000000000000000000000000000000000') {
    console.log(`[Referral] Effective referrer to submit for ${normalizedAccount}: ${savedRef}`);
    return savedRef;
  }

  // Si l'URL contient un Basename non encore résolu (ex: ?ref=mous ou /mous)
  if (typeof window !== 'undefined' && window.location) {
    const searchParams = new URLSearchParams(window.location.search);
    const candidateSlug = searchParams.get('ref') || searchParams.get('r') || searchParams.get('referrer') || window.location.pathname.split('/').filter(Boolean)[0];
    if (candidateSlug) {
      const resolved = await resolveNameToAddress(candidateSlug);
      if (resolved && normalizeAddress(resolved)) {
        const normalizedResolved = normalizeAddress(resolved);
        if (normalizedAccount.toLowerCase() !== normalizedResolved.toLowerCase()) {
          localStorage.setItem(REFERRER_STORAGE_KEY, normalizedResolved);
          console.log(`[Referral] Resolved slug '${candidateSlug}' -> ${normalizedResolved}`);
          return normalizedResolved;
        }
      }
    }
  }

  return '0x0000000000000000000000000000000000000000';
}

/**
 * Composant d'écoute pour capturer les adresses et noms de parrainage (Basename / ENS / Adresse)
 * depuis l'URL et notifier l'utilisateur lors de la connexion.
 */
export function ReferralHandler() {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { showNotification } = useNotifications();
  const notifiedAccountRef = useRef(null);
  const notifiedCandidateRef = useRef(null);

  // 1. Capture, résolution et enregistrement depuis l'URL
  useEffect(() => {
    let isMounted = true;

    async function handleUrlReferral() {
      try {
        let candidate = null;

        // Paramètres d'URL (?ref=mous ou ?r=0x... ou ?ref=mous.base.eth)
        const searchParams = new URLSearchParams(location.search);
        const queryRef = searchParams.get('ref') || searchParams.get('r') || searchParams.get('referrer');
        if (queryRef) {
          candidate = queryRef.trim();
        }

        // Chemin d'accès pathname (/mous ou /0x123... ou /r/mous)
        if (!candidate) {
          const segments = location.pathname.split('/').filter(Boolean);
          const reservedSlugs = ['trade', 'markets', 'market', 'portfolio', 'vault', 'referrals', 'r', 'api'];
          for (const seg of segments) {
            const cleanSeg = seg.trim().toLowerCase();
            if (!reservedSlugs.includes(cleanSeg)) {
              candidate = seg.trim();
              break;
            }
          }
        }

        if (!candidate || notifiedCandidateRef.current === candidate) return;

        // Résoudre l'adresse (supporte "0x...", "mous", "mous.base.eth", "vitalik.eth")
        const resolvedAddress = await resolveNameToAddress(candidate);
        if (isMounted && resolvedAddress && normalizeAddress(resolvedAddress)) {
          const normalized = normalizeAddress(resolvedAddress);
          localStorage.setItem(REFERRER_STORAGE_KEY, normalized);
          localStorage.setItem(REFERRER_NAME_STORAGE_KEY, candidate);
          notifiedCandidateRef.current = candidate;
          console.log(`[Referral] Referrer resolved: '${candidate}' -> ${normalized}`);

          if (showNotification) {
            const displayLabel = candidate.includes('.') || !candidate.startsWith('0x') 
              ? candidate 
              : `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
            showNotification(`Referral applied: ${displayLabel}`, "info", null, 4000, "REF");
          }
        }
      } catch (e) {
        console.warn("[Referral] Error handling referral link:", e);
      }
    }

    handleUrlReferral();

    return () => {
      isMounted = false;
    };
  }, [location.pathname, location.search, showNotification]);

  // 2. Notification à la connexion du wallet si un parrain est présent dans le storage
  useEffect(() => {
    if (isConnected && address) {
      const currentAccount = normalizeAddress(address);
      if (!currentAccount || notifiedAccountRef.current === currentAccount) return;
      notifiedAccountRef.current = currentAccount;

      const activeReferrer = getSavedReferrer(currentAccount);
      if (activeReferrer && activeReferrer !== '0x0000000000000000000000000000000000000000') {
        const savedName = localStorage.getItem(REFERRER_NAME_STORAGE_KEY);
        const displayLabel = savedName || `${activeReferrer.slice(0, 6)}...${activeReferrer.slice(-4)}`;
        if (showNotification) {
          showNotification(`Referral active: ${displayLabel}`, "success", null, 4500, "REF");
        }
      }
    } else {
      notifiedAccountRef.current = null;
    }
  }, [isConnected, address, showNotification]);

  return null;
}
