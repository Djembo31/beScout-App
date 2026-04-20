'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from './AuthProvider';
import { getWallet } from '@/lib/services/wallet';
import { withTimeout } from '@/lib/utils';

const WALLET_SESSION_KEY = 'bescout-wallet-balance';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 1000, 3000]; // exponential backoff

/**
 * Freshness window — a balance fetched within the last 30s is considered
 * safe enough for Buy/Sell confirm actions. Older than that, Buy modals
 * disable their confirm button until a refetch succeeds.
 */
const FRESHNESS_WINDOW_MS = 30_000;

interface WalletContextValue {
    /** Balance in cents — null while loading */
    balanceCents: number | null;
    /** Locked balance in cents (bounty escrow) — null while loading */
    lockedBalanceCents: number | null;
    /** Optimistic update — set immediately after buy/sell */
    setBalanceCents: (cents: number) => void;
    /** Re-fetch wallet from Supabase */
    refreshBalance: () => Promise<void>;
    /** Slice 110: true while a fetchBalance call is in flight. */
    isFetching: boolean;
    /** Slice 110: unix ms of the last successful fetch, or null if never. */
    lastFetchOk: number | null;
    /** Slice 110: derived — balance was fetched successfully within FRESHNESS_WINDOW_MS and no fetch in flight. */
    isBalanceFresh: boolean;
}

const WalletContext = createContext<WalletContextValue>({
    balanceCents: null,
    lockedBalanceCents: null,
    setBalanceCents: () => { },
    refreshBalance: async () => { },
    isFetching: false,
    lastFetchOk: null,
    isBalanceFresh: false,
});

export function useWallet() {
    return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();

    // Never read sessionStorage in useState — causes hydration mismatch (server=null, client=cached).
    const [balanceCents, setBalanceCentsRaw] = useState<number | null>(null);
    const [lockedBalanceCents, setLockedBalanceCents] = useState<number | null>(null);
    // Slice 110: fetch-in-flight + last-ok timestamp for freshness checks on trading buttons.
    const [isFetching, setIsFetching] = useState(false);
    const [lastFetchOk, setLastFetchOk] = useState<number | null>(null);

    // Hydrate from sessionStorage after mount (client-only)
    useEffect(() => {
        try {
            const stored = sessionStorage.getItem(WALLET_SESSION_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed.balance === 'number') {
                    setBalanceCentsRaw(parsed.balance);
                }
            }
        } catch { /* ignore */ }
    }, []);

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
        setIsFetching(true);
        try {
            const wallet = await withTimeout(getWallet(user.id), 15000);
            const newBalance = wallet?.balance ?? 0;
            setBalanceCents(newBalance);
            setLockedBalanceCents(wallet?.locked_balance ?? 0);
            setLastFetchOk(Date.now());
            // Success — prevent further retries
            retryCount.current = MAX_RETRIES;
        } catch (err) {
            retryCount.current += 1;
            const isFinalAttempt = retryCount.current >= MAX_RETRIES;
            const msg = `[Wallet] Balance fetch failed (attempt ${retryCount.current}/${MAX_RETRIES})`;
            // Intermediate retries are expected on dev-server cold-start and
            // under peak load — only escalate to console.error once all
            // retries are exhausted, so monitoring does not fire three times
            // for a transient hiccup that self-heals.
            if (isFinalAttempt) {
                console.error(`${msg} — exhausted:`, err);
                // All retries exhausted — set to 0 so UI doesn't show perpetual loading
                setBalanceCentsRaw(prev => prev === null ? 0 : prev);
            } else {
                console.warn(`${msg}, retrying:`, err);
                // Schedule retry with backoff
                const delay = RETRY_DELAYS[retryCount.current] ?? 3000;
                retryTimer.current = setTimeout(() => {
                    fetchBalance();
                }, delay);
            }
        } finally {
            setIsFetching(false);
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
            setLastFetchOk(null);
            setIsFetching(false);
            if (retryTimer.current) clearTimeout(retryTimer.current);
            try { sessionStorage.removeItem(WALLET_SESSION_KEY); } catch { /* ignore */ }
            return;
        }
        // AuthProvider can setUser twice on boot (sessionStorage hydrate + Supabase getSession)
        // with identical user.id but different object references. Guard against duplicate fetch.
        const isNewUser = prevUserId.current !== user.id;
        if (isNewUser) {
            const cachedUid = (() => {
                try {
                    const stored = sessionStorage.getItem(WALLET_SESSION_KEY);
                    if (stored) { const p = JSON.parse(stored); return p?.userId; }
                } catch { /* ignore */ }
                return null;
            })();
            prevUserId.current = user.id;
            retryCount.current = 0;
            setLastFetchOk(null); // cached balance predates successful server-fetch
            if (retryTimer.current) clearTimeout(retryTimer.current);
            // Only keep cached balance if it belongs to this user
            if (cachedUid !== user.id) setBalanceCentsRaw(null);
        }
        if (retryCount.current >= MAX_RETRIES) return;
        // Only fetch on actual user.id change (not on user-object-ref churn).
        if (isNewUser) fetchBalance();
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

    // Slice 110: derived freshness — evaluated on every render; consumers re-render
    // naturally via state changes (isFetching toggles, fetchBalance success updates
    // lastFetchOk). Idle between interactions has no re-render, which is acceptable:
    // BuyModal mount/open triggers a render and re-evaluates freshness fresh.
    const isBalanceFresh =
        !isFetching &&
        lastFetchOk !== null &&
        Date.now() - lastFetchOk < FRESHNESS_WINDOW_MS;

    const value = useMemo<WalletContextValue>(
        () => ({
            balanceCents,
            lockedBalanceCents,
            setBalanceCents,
            refreshBalance,
            isFetching,
            lastFetchOk,
            isBalanceFresh,
        }),
        [balanceCents, lockedBalanceCents, setBalanceCents, refreshBalance, isFetching, lastFetchOk, isBalanceFresh],
    );

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}
