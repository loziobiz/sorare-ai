/**
 * Utility per ottenere l'identificativo utente.
 * Usa l'email salvata in localStorage al momento del login.
 */

import { UserIdError } from "./kv-types";

const USER_EMAIL_KEY = "sorare_user_email";

/**
 * Ottiene l'user ID dell'utente corrente.
 * Usa la parte locale dell'email (prima della @) per evitare URL encoding.
 *
 * @throws UserIdError se l'utente non ha effettuato il login
 */
export function getCurrentUserId(): string {
  const email = localStorage.getItem(USER_EMAIL_KEY);

  if (!email) {
    throw new UserIdError(
      "Sessione scaduta. Effettua nuovamente il login per continuare."
    );
  }

  // Usa solo la parte prima della @ per evitare URL encoding
  const localPart = email.split("@")[0];
  if (!localPart) {
    throw new UserIdError("Email non valida. Effettua nuovamente il login.");
  }

  return localPart;
}

/**
 * Versione sicura che restituisce null invece di lanciare eccezioni.
 */
export function getCurrentUserIdSafe(): string | null {
  try {
    return getCurrentUserId();
  } catch {
    return null;
  }
}

/**
 * Verifica se l'utente è autenticato.
 */
export function isAuthenticated(): boolean {
  return getCurrentUserIdSafe() !== null;
}

/**
 * Rimuove l'email dell'utente al logout.
 */
export function clearUserEmail(): void {
  localStorage.removeItem(USER_EMAIL_KEY);
}

/**
 * Ottiene l'email dell'utente corrente.
 */
export function getUserEmail(): string | null {
  return localStorage.getItem(USER_EMAIL_KEY);
}
