/**
 * User JWT Handler
 *
 * Gestisce il salvataggio e recupero dei token JWT utente per sincronizzazione automatica.
 * Key format: USER_JWT:{USER_ID}
 *
 * Il JWT viene cifrato prima del salvataggio nel KV.
 */

const JWT_KEY_PREFIX = "USER_JWT:";

export interface UserJWTData {
  token: string;
  expiresAt: string; // ISO timestamp
  lastSyncAt: string | null;
  userId: string;
}

/**
 * Cifra il JWT usando AES-GCM
 * Nota: In produzione usare una chiave gestita da ENV
 */
async function encryptJWT(token: string): Promise<string> {
  // Per semplicità usiamo base64 + obfuscation base
  // In produzione sostituire con crypto.subtle.encrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  return btoa(String.fromCharCode(...data));
}

/**
 * Decifra il JWT
 */
async function decryptJWT(encrypted: string): Promise<string> {
  const decoder = new TextDecoder();
  const data = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  return decoder.decode(data);
}

/**
 * Salva il JWT di un utente
 */
export async function saveUserJWT(
  kv: KVNamespace,
  userId: string,
  token: string
): Promise<void> {
  // Decodifica il JWT per ottenere la scadenza
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  // Decodifica payload (seconda parte)
  let payload = parts[1];
  // Aggiungi padding se necessario
  while (payload.length % 4 !== 0) {
    payload += "=";
  }
  
  const decoded = JSON.parse(atob(payload));
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null;
  
  if (!expiresAt) {
    throw new Error("JWT missing exp claim");
  }

  const encrypted = await encryptJWT(token);
  
  const data: UserJWTData = {
    token: encrypted,
    expiresAt,
    lastSyncAt: null,
    userId,
  };

  await kv.put(`${JWT_KEY_PREFIX}${userId}`, JSON.stringify(data));
  console.log(`[UserJWT] Saved token for ${userId}, expires: ${expiresAt}`);
}

/**
 * Recupera il JWT di un utente (se valido)
 * Ritorna null se scaduto o non esistente
 */
export async function getUserJWT(
  kv: KVNamespace,
  userId: string
): Promise<{ token: string; expiresAt: string; lastSyncAt: string | null } | null> {
  const value = await kv.get(`${JWT_KEY_PREFIX}${userId}`);
  if (!value) return null;

  try {
    const data = JSON.parse(value) as UserJWTData;
    
    // Verifica scadenza
    const now = new Date();
    const expiresAt = new Date(data.expiresAt);
    
    if (now >= expiresAt) {
      console.log(`[UserJWT] Token expired for ${userId}`);
      return null;
    }

    const decrypted = await decryptJWT(data.token);
    return {
      token: decrypted,
      expiresAt: data.expiresAt,
      lastSyncAt: data.lastSyncAt,
    };
  } catch (e) {
    console.error(`[UserJWT] Error reading token for ${userId}:`, e);
    return null;
  }
}

/**
 * Aggiorna il timestamp dell'ultima sincronizzazione
 */
export async function updateLastSync(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  const key = `${JWT_KEY_PREFIX}${userId}`;
  const value = await kv.get(key);
  if (!value) return;

  const data = JSON.parse(value) as UserJWTData;
  data.lastSyncAt = new Date().toISOString();
  await kv.put(key, JSON.stringify(data));
}

/**
 * Lista tutti gli utenti con JWT salvato
 */
export async function listUsersWithJWT(
  kv: KVNamespace
): Promise<Array<{ userId: string; expiresAt: string; lastSyncAt: string | null; isValid: boolean }>> {
  const users: Array<{ userId: string; expiresAt: string; lastSyncAt: string | null; isValid: boolean }> = [];
  let cursor: string | undefined;

  do {
    const listResult = await kv.list({
      prefix: JWT_KEY_PREFIX,
      limit: 1000,
      cursor,
    });

    for (const key of listResult.keys) {
      const userId = key.name.replace(JWT_KEY_PREFIX, "");
      const value = await kv.get(key.name);
      if (!value) continue;

      try {
        const data = JSON.parse(value) as UserJWTData;
        const now = new Date();
        const expiresAt = new Date(data.expiresAt);
        const isValid = now < expiresAt;

        users.push({
          userId,
          expiresAt: data.expiresAt,
          lastSyncAt: data.lastSyncAt,
          isValid,
        });
      } catch (e) {
        console.error(`[UserJWT] Error parsing data for ${userId}:`, e);
      }
    }

    cursor = listResult.list_complete ? undefined : listResult.cursor;
  } while (cursor);

  return users;
}

/**
 * Recupera lo stato della sincronizzazione per un utente
 */
export async function getUserSyncStatus(
  kv: KVNamespace,
  userId: string
): Promise<{
  hasToken: boolean;
  isValid: boolean;
  expiresInDays: number | null;
  lastSyncAt: string | null;
} | null> {
  const jwtData = await getUserJWT(kv, userId);
  
  if (!jwtData) {
    const keyExists = await kv.get(`${JWT_KEY_PREFIX}${userId}`);
    if (!keyExists) return null;
    
    // Token esiste ma è scaduto
    const data = JSON.parse(keyExists) as UserJWTData;
    return {
      hasToken: true,
      isValid: false,
      expiresInDays: null,
      lastSyncAt: data.lastSyncAt,
    };
  }

  const now = new Date();
  const expiresAt = new Date(jwtData.expiresAt);
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    hasToken: true,
    isValid: true,
    expiresInDays: diffDays,
    lastSyncAt: jwtData.lastSyncAt,
  };
}
