/**
 * Retorna a lista de e-mails admin definidos em ADMIN_EMAILS (separados por vírgula).
 * Normalizado para lowercase e sem espaços extras.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}
