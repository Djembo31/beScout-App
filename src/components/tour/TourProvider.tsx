'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Compass, X } from 'lucide-react';
import { TOUR_STEPS, type TourStep } from './tourSteps';

type TourContextValue = {
  isTourActive: boolean;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  startTour: () => void;
};

const TourContext = createContext<TourContextValue>({
  isTourActive: false,
  currentStep: null,
  stepIndex: 0,
  totalSteps: 0,
  nextStep: () => {},
  prevStep: () => {},
  skipTour: () => {},
  startTour: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

const LG_BREAKPOINT = 1024;
const TOUR_COMPLETED_KEY = 'bescout-tour-completed';
const TOUR_PENDING_KEY = 'bescout-tour-pending';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('tour');
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [screenWidth, setScreenWidth] = useState(0);
  const [showOffer, setShowOffer] = useState(false);

  // Track screen width for step filtering
  useEffect(() => {
    setScreenWidth(window.innerWidth);
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter steps based on screen size
  const filteredSteps = useMemo(() => {
    if (screenWidth === 0) return [];
    const isDesktop = screenWidth >= LG_BREAKPOINT;
    return TOUR_STEPS.filter((s) => {
      if (s.desktopOnly && !isDesktop) return false;
      if (s.mobileOnly && isDesktop) return false;
      return true;
    });
  }, [screenWidth]);

  // Opt-in: show tour offer banner instead of auto-starting
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pending = localStorage.getItem(TOUR_PENDING_KEY) === '1';
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (pending && !completed) {
      const timer = setTimeout(() => setShowOffer(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissOffer = useCallback(() => {
    setShowOffer(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, '1');
    localStorage.removeItem(TOUR_PENDING_KEY);
  }, []);

  const endTour = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    localStorage.setItem(TOUR_COMPLETED_KEY, '1');
    localStorage.removeItem(TOUR_PENDING_KEY);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((prev) => {
      if (prev >= filteredSteps.length - 1) {
        endTour();
        return 0;
      }
      return prev + 1;
    });
  }, [filteredSteps.length, endTour]);

  const prevStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    endTour();
  }, [endTour]);

  const startTour = useCallback(() => {
    setShowOffer(false);
    setStepIndex(0);
    setActive(true);
  }, []);

  const value = useMemo<TourContextValue>(
    () => ({
      isTourActive: active,
      currentStep: active ? filteredSteps[stepIndex] ?? null : null,
      stepIndex,
      totalSteps: filteredSteps.length,
      nextStep,
      prevStep,
      skipTour,
      startTour,
    }),
    [active, filteredSteps, stepIndex, nextStep, prevStep, skipTour, startTour],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {/* Tour opt-in banner */}
      {showOffer && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-300">
          <div className="relative bg-[#111114] border border-gold/25 rounded-2xl p-4 shadow-2xl shadow-gold/10">
            <button
              onClick={dismissOffer}
              className="absolute top-2.5 right-2.5 p-1 text-white/30 hover:text-white/60 transition-colors"
              aria-label={t('offerNo')}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center shrink-0">
                <Compass className="size-5 text-gold" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold mb-1">{t('offerTitle')}</h3>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={startTour}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-b from-[#FFE44D] to-[#E6B800] text-black active:scale-[0.97] transition-transform"
                  >
                    {t('offerYes')}
                  </button>
                  <button
                    onClick={dismissOffer}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/70 transition-colors"
                  >
                    {t('offerNo')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}
