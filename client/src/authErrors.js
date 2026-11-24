// Firebase Auth error codes mapped to messages that say what happened and what to do next.
const MESSAGES = {
  'auth/email-already-in-use': 'That email is already registered. Sign in instead, or use a different email.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'That password is incorrect.',
  'auth/invalid-email': 'Enter a valid email address, like name@example.com.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
  'auth/network-request-failed': "Can't reach the server. Check your internet connection and try again.",
  'auth/requires-recent-login': 'For your security, log out and sign in again before making this change.',
  'auth/internal-error': 'The sign-in service is having trouble. Try again in a few minutes.',
};

export const authErrorMessage = (err) =>
  MESSAGES[err?.code] || 'Something went wrong. Try again in a moment.';
