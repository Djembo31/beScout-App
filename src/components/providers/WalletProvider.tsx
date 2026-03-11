'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from './AuthProvider';
import { getWallet } from '@/lib/services/wallet';
import { withTimeout } from '@/lib/utils';

const WALLET_SESSION_KEY = 'bescout-wallet-balance';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 1000, 3000]; // exponential backoff

interface WalletContextValue {
    /** Balance in cents — null while loading */
    balanceCents: number | null;
    /** Locked balance in cents (bounty escrow) — null while loading */
    lockedBalanceCents: number | null;
    /** Optimistic update — set immediately after buy/sell */
    setBalanceCents: (cents: number) => void;
    /** Re-fetch wallet from Supabase */
    refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
    balanceCents: null,
    lockedBalanceCents: null,
    setBalanceCents: () => { },
    refreshBalance: async () => { },
});

export function useWallet() {
    return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();

    // Hydrate from sessionStorage to avoid "0 bCredits" flash — but only if userId matches
    const [balanceCents, setBalanceCentsRaw] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const stored = sessionStorage.getItem(WALLET_SESSION_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed.balance === 'number' && typeof parsed.userId === 'string') {
                    return parsed.balance;
                }
            }
        } catch { /* ignore */ }
        return null;
    });

    const [lockedBalanceCents, setLockedBalanceCents] = useState<number | null>(null);

    const retryCount = useRef(0);
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevUserId = useRef<string | null>(null);

    const setBalanceCents = useCallback((cents: number) => {
        setBalanceCentsRaw(cents);
        try {
            const uid = prevUserId.current;
            sessionStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({ balance: cents, userId: uid }));
        } catch { /* ignore */ }
    }, []);

    const fetchBalance = useCallback(async () => {
        if (!user) return;
        try {
            const wallet = await withTimeout(getWallet(user.id), 5000);
            const newBalance = wallet?.balance ?? 0;
            setBalanceCents(newBalance);
            setLockedBalanceCents(wallet?.locked_balance ?? 0);
            // Success — prevent further retries
            retryCount.current = MAX_RETRIES;
        } catch (err) {
            console.error(`[Wallet] Balance fetch failed (attempt ${retryCount.current + 1}/${MAX_RETRIES}):`, err);
            retryCount.current += 1;

            if (retryCount.current < MAX_RETRIES) {
                // Schedule retry with backoff
                const delay = RETRY_DELAYS[retryCount.current] ?? 3000;
                retryTimer.current = setTimeout(() => {
                    fetchBalance();
                }, delay);
            } else {
                // All retries exhausted — set to 0 so UI doesn't show perpetual loading
                setBalanceCentsRaw(prev => prev === null ? 0 : prev);
            }
        }
    }, [user, setBalanceCents]);

    // Expose refreshBalance that resets retry counter
    const refreshBalance = useCallback(async () => {
        retryCount.current = 0;
        await fetchBalance();
    }, [fetchBalance]);

    // Load balance when user becomes available
    useEffect(() => {
        if (!user) {
            retryCount.current = 0;
            prevUserId.current = null;
            setBalanceCentsRaw(null);
            setLockedBalanceCents(null);
            if (retryTimer.current) clearTimeout(retryTimer.current);
            try { sessionStorage.removeItem(WALLET_SESSION_KEY); } catch { /* ignore */ }
            return;
        }
        // Reset on user change — clear stale data from previous user
        if (prevUserId.current !== user.id) {
            const cachedUid = (() => {
                try {
                    const stored = sessionStorage.getItem(WALLET_SESSION_KEY);
                    if (stored) { const p = JSON.parse(stored); return p?.userId; }
                } catch { /* ignore */ }
                return null;
            })();
            prevUserId.current = user.id;
            retryCount.current = 0;
            if (retryTimer.current) clearTimeout(retryTimer.current);
            // Only keep cached balance if it belongs to this user
            if (cachedUid !== user.id) setBalanceCentsRaw(null);
        }
        if (retryCount.current >= MAX_RETRIES) return;
        fetchBalance();
    }, [user, fetchBalance]);

    // Fallback recovery: retry on tab focus / visibility change
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && user && retryCount.current >= MAX_RETRIES) {
                // Reset and retry — user came back to the tab
                retryCount.current = 0;
                fetchBalance();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            if (retryTimer.current) clearTimeout(retryTimer.current);
        };
    }, [user, fetchBalance]);

    const value = useMemo<WalletContextValue>(
        () => ({ balanceCents, lockedBalanceCents, setBalanceCents, refreshBalance }),
        [balanceCents, lockedBalanceCents, setBalanceCents, refreshBalance],
    );

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}
