import { drizzle } from 'drizzle-orm/d1'

export function createDb(d1: unknown) {
  // biome-ignore lint/suspicious/noExplicitAny: Cloudflare D1 type compatibility
  return drizzle(d1 as any)
}
