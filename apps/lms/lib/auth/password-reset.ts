export const PASSWORD_RESET_EMAIL_KEY = "easelms_password_reset_email"

export function storePasswordResetEmail(email: string) {
  sessionStorage.setItem(PASSWORD_RESET_EMAIL_KEY, email)
}

export function getPasswordResetEmail(): string | null {
  return sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY)
}

export function clearPasswordResetEmail() {
  sessionStorage.removeItem(PASSWORD_RESET_EMAIL_KEY)
}
