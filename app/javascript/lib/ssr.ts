// Only trust SSR-seeded data when it's actually for the route we're on — it stays
// fixed for the whole app lifetime, so a client-side nav to a different record
// must fall through to a real fetch instead of flashing the previous one's data.
export function ssrInitialDataFor<T extends { id: number | string }>(
  id: string | undefined,
  initialData: T | undefined
): T | undefined {
  return initialData && String(initialData.id) === id ? initialData : undefined
}
