/** Extract the value from a settled result, or return the fallback if rejected. */
export function val<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}
