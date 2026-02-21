'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTour } from './TourProvider';
import type { TourStepPosition } from './tourSteps';

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const TOOLTIP_GAP = 12;

function getTooltipStyle(
  targetRect: Rect,
  position: TourStepPosition,
  tooltipRef: React.RefObject<HTMLDivElement | null>,
): React.CSSProperties {
  const el = tooltipRef.current;
  const tw = el?.offsetWidth ?? 300;
  const th = el?.offsetHeight ?? 160;

  const cx = targetRect.left + targetRect.width / 2;
  const cy = targetRect.top + targetRect.height / 2;

  let top = 0;
  let left = 0;

  switch (position) {
    case 'bottom':
      top = targetRect.top + targetRect.height + PADDING + TOOLTIP_GAP;
      left = cx - tw / 2;
      break;
    case 'top':
      top = targetRect.top - PADDING - TOOLTIP_GAP - th;
      left = cx - tw / 2;
      break;
    case 'right':
      top = cy - th / 2;
      left = targetRect.left + targetRect.width + PADDING + TOOLTIP_GAP;
      break;
    case 'left':
      top = cy - th / 2;
      left = targetRect.left - PADDING - TOOLTIP_GAP - tw;
      break;
  }

  // Clamp to viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  left = Math.max(12, Math.min(left, vw - tw - 12));
  top = Math.max(12, Math.min(top, vh - th - 12));

  return { position: 'fixed', top, left, zIndex: 90 };
}

export function TourOverlay() {
  const { isTourActive, currentStep, stepIndex, totalSteps, nextStep, prevStep, skipTour } = useTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateRect = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    // Scroll into view if needed
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Small delay after scroll to get correct rect
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    });
  }, [currentStep]);

  // Recalculate on step change
  useEffect(() => {
    if (!isTourActive || !currentStep) return;
    // Wait a bit for scroll to settle
    const timer = setTimeout(updateRect, 300);
    return () => clearTimeout(timer);
  }, [isTourActive, currentStep, updateRect]);

  // Recalculate on scroll/resize
  useEffect(() => {
    if (!isTourActive) return;
    let timeout: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(timeout);
      timeout = setTimeout(updateRect, 100);
    };
    window.addEventListener('scroll', debounced, true);
    window.addEventListener('resize', debounced);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', debounced, true);
      window.removeEventListener('resize', debounced);
    };
  }, [isTourActive, updateRect]);

  // Escape to skip
  useEffect(() => {
    if (!isTourActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTour();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isTourActive, skipTour]);

  if (!isTourActive || !currentStep) return null;

  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;

  return (
    <>
      {/* Backdrop with spotlight cutout via box-shadow */}
      {targetRect && (
        <div
          className="fixed z-[90] rounded-xl pointer-events-none"
          style={{
            top: targetRect.top - PADDING,
            left: targetRect.left - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
          }}
        />
      )}

      {/* Clickable backdrop to skip */}
      <div
        className="fixed inset-0 z-[89]"
        onClick={skipTour}
        aria-hidden="true"
      />

      {/* Tooltip */}
      {targetRect && (
        <div
          ref={tooltipRef}
          className="w-[300px] sm:w-[340px] bg-[#111] border border-white/15 rounded-2xl p-4 shadow-2xl"
          style={getTooltipStyle(targetRect, currentStep.position, tooltipRef)}
        >
          <h3 className="text-sm font-black mb-1">{currentStep.title}</h3>
          <p className="text-xs text-white/60 leading-relaxed mb-4">{currentStep.description}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={skipTour}
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              Überspringen
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prevStep}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Zurück"
                >
                  <ChevronLeft className="w-4 h-4 text-white/50" />
                </button>
              )}

              <span className="text-[10px] text-white/30 font-mono min-w-[40px] text-center">
                {stepIndex + 1}/{totalSteps}
              </span>

              <button
                onClick={nextStep}
                className="px-3.5 py-1.5 rounded-xl bg-[#FFD700] text-black text-xs font-bold hover:bg-[#FFD700]/90 transition-colors"
              >
                {isLast ? 'Fertig' : 'Weiter'}
                {!isLast && <ChevronRight className="w-3.5 h-3.5 inline ml-0.5 -mr-0.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback: if target not found, show centered tooltip */}
      {!targetRect && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            ref={tooltipRef}
            className="w-[300px] sm:w-[340px] bg-[#111] border border-white/15 rounded-2xl p-4 shadow-2xl"
          >
            <h3 className="text-sm font-black mb-1">{currentStep.title}</h3>
            <p className="text-xs text-white/60 leading-relaxed mb-4">{currentStep.description}</p>
            <div className="flex items-center justify-between">
              <button
                onClick={skipTour}
                className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
              >
                Überspringen
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={prevStep}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Zurück"
                  >
                    <ChevronLeft className="w-4 h-4 text-white/50" />
                  </button>
                )}
                <span className="text-[10px] text-white/30 font-mono min-w-[40px] text-center">
                  {stepIndex + 1}/{totalSteps}
                </span>
                <button
                  onClick={nextStep}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FFD700] text-black text-xs font-bold hover:bg-[#FFD700]/90 transition-colors"
                >
                  {isLast ? 'Fertig' : 'Weiter'}
                  {!isLast && <ChevronRight className="w-3.5 h-3.5 inline ml-0.5 -mr-0.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
