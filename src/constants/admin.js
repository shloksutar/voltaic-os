/**
 * Admin email whitelist.
 * Any signed-in user whose email matches one of these (case-insensitive)
 * will have access to the /admin panel.
 *
 * Add your own email here to become an admin.
 */
export const ADMIN_EMAILS = [
  'shlokvsutar@gmail.com',
  // Add more admin emails below:
];

/**
 * Case-insensitive check for whether an email belongs to an admin.
 * @param {string | null | undefined} email
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
