export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  if (password.length < 8) {
    return false;
  }
  // At least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

export function isValidOdometer(km: number): boolean {
  return Number.isInteger(km) && km >= 0 && km < 2000000; // Reasonable limit (2 million km)
}
