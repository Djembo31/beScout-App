'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [screenWidth, setScreenWidth] = useState(0);

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

  // Auto-start: check if tour should launch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pending = localStorage.getItem(TOUR_PENDING_KEY) === '1';
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (pending && !completed) {
      const timer = setTimeout(() => {
        setStepIndex(0);
        setActive(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
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

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
