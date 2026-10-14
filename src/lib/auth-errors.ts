export function authErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const text = raw.toLowerCase();

  if (text.includes("weak") || text.includes("pwned") || text.includes("easy to guess")) {
    return "That password is too common. Use at least 8 characters with letters and numbers, and avoid passwords like Password123.";
  }
  if (text.includes("email not confirmed")) {
    return "This account is waiting for email confirmation. Create the account again or wait a moment and sign in — confirmation is no longer required.";
  }
  if (text.includes("invalid login") || text.includes("invalid credentials")) {
    return "Email or password is incorrect. If you just signed up, use the same password and make sure the email matches.";
  }
  if (text.includes("already registered") || text.includes("user already")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return raw || "Authentication failed";
}

export function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
