'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from './AuthProvider';
import { getWallet } from '@/lib/services/wallet';
import { withTimeout } from '@/lib/utils';

const WALLET_SESSION_KEY = 'bescout-wallet-balance';

interface WalletContextValue {
    /** Balance in cents — null while loading */
    balanceCents: number | null;
    /** Optimistic update — set immediately after buy/sell */
    setBalanceCents: (cents: number) => void;
    /** Re-fetch wallet from Supabase */
    refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue>({
    balanceCents: null,
    setBalanceCents: () => { },
    refreshBalance: async () => { },
});

export function useWallet() {
    return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();

    // Hydrate from sessionStorage to avoid "0 $SCOUT" flash — but only if userId matches
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

    const loaded = useRef(false);

    const setBalanceCents = useCallback((cents: number) => {
        setBalanceCentsRaw(cents);
        try {
            const uid = prevUserId.current;
            sessionStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({ balance: cents, userId: uid }));
        } catch { /* ignore */ }
    }, []);

    const refreshBalance = useCallback(async () => {
        if (!user) return;
        try {
            const wallet = await withTimeout(getWallet(user.id), 5000);
            const newBalance = wallet?.balance ?? 0;
            setBalanceCents(newBalance);
        } catch (err) {
            console.error('[Wallet] Balance fetch failed:', err);
            // Set to 0 so UI doesn't show perpetual loading skeleton
            setBalanceCentsRaw(prev => prev === null ? 0 : prev);
        } finally {
            loaded.current = true;
        }
    }, [user, setBalanceCents]);

    // Load balance when user becomes available (skip if already loaded for same user)
    const prevUserId = useRef<string | null>(null);
    useEffect(() => {
        if (!user) {
            loaded.current = false;
            prevUserId.current = null;
            setBalanceCentsRaw(null);
            try { sessionStorage.removeItem(WALLET_SESSION_KEY); } catch { /* ignore */ }
            return;
        }
        // Reset balance on user change — clear stale data from previous user
        if (prevUserId.current !== user.id) {
            const cachedUid = (() => {
                try {
                    const stored = sessionStorage.getItem(WALLET_SESSION_KEY);
                    if (stored) { const p = JSON.parse(stored); return p?.userId; }
                } catch { /* ignore */ }
                return null;
            })();
            prevUserId.current = user.id;
            loaded.current = false;
            // Only keep cached balance if it belongs to this user
            if (cachedUid !== user.id) setBalanceCentsRaw(null);
        }
        if (loaded.current) return;
        refreshBalance();
    }, [user, refreshBalance]);

    const value = useMemo<WalletContextValue>(
        () => ({ balanceCents, setBalanceCents, refreshBalance }),
        [balanceCents, setBalanceCents, refreshBalance],
    );

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}
