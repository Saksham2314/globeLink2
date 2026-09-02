/**
 * Canonical key for a pair of users. Order-independent, so
 * `getOrCreateConversation` is a single unique lookup regardless of who
 * initiates.
 */
export function pairKey(userA: string, userB: string): string {
  return userA < userB ? `${userA}:${userB}` : `${userB}:${userA}`;
}
