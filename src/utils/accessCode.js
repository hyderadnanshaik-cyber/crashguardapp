/**
 * @file accessCode.js
 * @description Single source of truth for deterministic 6-character access codes.
 */

/**
 * Derives a consistent, deterministic 6-character access code for a given user ID.
 *
 * @param {string} userId - User UID
 * @returns {string} 6-character uppercase alphanumeric access code
 */
export function getDeterministicAccessCode(userId) {
  if (!userId) return 'CG9999';
  const cleanUid = String(userId).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (cleanUid.substring(0, 6) || 'CG9999').padEnd(6, '9');
}
