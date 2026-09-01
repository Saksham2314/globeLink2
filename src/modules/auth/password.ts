import bcrypt from "bcryptjs";

/**
 * Password hashing. Auth.js's Credentials provider deliberately ships no
 * password handling, so this is ours to own.
 *
 * bcrypt with a work factor of 12 (~150–250ms/hash on current hardware) — slow
 * enough to blunt offline cracking, fast enough for interactive sign-in.
 */
const WORK_FACTOR = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, WORK_FACTOR);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
