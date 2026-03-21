/** Score-to-color mapping — shared by TradingCardFrame, FormBars, L5Circle */
export const scoreColor = (score: number): string => {
  if (score >= 80) return '#10b981'; // emerald-500
  if (score >= 60) return '#84cc16'; // lime-500
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#f43f5e';                  // rose-500
};
