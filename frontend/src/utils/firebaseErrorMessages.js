// Maps Firebase Auth error codes to friendly UI messages

const ERROR_MAP = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support if this is a mistake.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/missing-password': 'Please enter your password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
  'auth/popup-blocked': 'Sign-in popup was blocked by your browser.',
  'auth/cancelled-popup-request': 'Another sign-in is already in progress.',
  'auth/account-exists-with-different-credential': 'An account with this email exists using a different sign-in method.',
  'auth/invalid-credential': 'Invalid credentials. Please try again.',
  'auth/operation-not-allowed': 'This sign-in method is disabled. Contact support.',
  'auth/weak-password': 'Please choose a stronger password (at least 6 characters).',
  'auth/email-already-in-use': 'An account with this email already exists.',
};

export function getFriendlyAuthError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const code = typeof error === 'string' ? error : error.code || error.message || '';
  const message = ERROR_MAP[code] || ERROR_MAP[`auth/${code}`];
  if (message) return message;
  // Fallbacks for common substrings in message
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('user-not-found')) return ERROR_MAP['auth/user-not-found'];
  if (msg.includes('wrong-password')) return ERROR_MAP['auth/wrong-password'];
  if (msg.includes('email-already-in-use')) return ERROR_MAP['auth/email-already-in-use'];
  if (msg.includes('invalid-email')) return ERROR_MAP['auth/invalid-email'];
  if (msg.includes('weak-password')) return ERROR_MAP['auth/weak-password'];
  return 'Authentication failed. Please check your details and try again.';
}

export default getFriendlyAuthError;


