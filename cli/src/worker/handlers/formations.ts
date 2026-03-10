/**
 * Handler per la gestione delle formazioni utente
 *
 * Struttura chiavi KV:
 * - FORMATION_{userId}:{timestamp} -> singola formazione
 *
 * Endpoint:
 * - GET /api/formations?userId=xxx -> lista tutte
 * - POST /api/formations -> crea nuova (ID generato = timestamp)
 * - PUT /api/formations/:id -> aggiorna esistente
 * - DELETE /api/formations/:id -> elimina
 */

/**
 * Dati raw della formazione inviati dal client
 * Il contenuto è opaco al server - salviamo quello che arriva
 */
export interface FormationData {
  [key: string]: unknown;
}

/**
 * Formazione completa con metadata aggiunti dal server
 */
export interface Formation {
  id: string; // timestamp come ID univoco
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  data: FormationData; // dati opachi dal client
}

/**
 * Richiesta per creare/aggiornare una formazione
 */
export interface SaveFormationRequest {
  userId: string;
  data: FormationData;
  id?: string; // opzionale: se presente, aggiorna esistente
}

const FORMATION_PREFIX = "FORMATION_";

/**
 * Genera la chiave KV per una formazione
 */
function getFormationKey(userId: string, formationId: string): string {
  return `${FORMATION_PREFIX}${userId}:${formationId}`;
}

/**
 * Estrae userId e formationId da una chiave KV
 */
function parseFormationKey(
  key: string
): { userId: string; formationId: string } | null {
  const match = key.match(/^FORMATION_(.+):(.+)$/);
  if (!match) return null;
  return { userId: match[1], formationId: match[2] };
}

/**
 * Lista tutte le formazioni di un utente
 */
export async function listFormations(
  kv: KVNamespace,
  userId: string
): Promise<
  { success: true; formations: Formation[] } | { success: false; error: string }
> {
  try {
    const prefix = `${FORMATION_PREFIX}${userId}:`;
    const formations: Formation[] = [];
    let cursor: string | undefined;

    do {
      const result = await kv.list({ prefix, cursor, limit: 1000 });

      // Recupera tutte le formazioni in parallelo
      const keys = result.keys;
      if (keys.length > 0) {
        const values = await Promise.all(keys.map((key) => kv.get(key.name)));

        for (let i = 0; i < keys.length; i++) {
          const value = values[i];
          if (value) {
            try {
              const formation = JSON.parse(value) as Formation;
              formations.push(formation);
            } catch (e) {
              console.warn(
                `[Formations] Failed to parse formation: ${keys[i].name}`
              );
            }
          }
        }
      }

      cursor = result.list_complete ? undefined : result.cursor;
    } while (cursor);

    // Ordina per createdAt (più recenti prima)
    formations.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, formations };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Formations] Error listing formations for ${userId}:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Crea una nuova formazione
 * L'ID è generato come timestamp (con throttling client siamo sicuri dell'univocità)
 */
export async function createFormation(
  kv: KVNamespace,
  userId: string,
  data: FormationData
): Promise<
  { success: true; formation: Formation } | { success: false; error: string }
> {
  try {
    const now = new Date();
    const id = now.getTime().toString();

    const formation: Formation = {
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      data,
    };

    const key = getFormationKey(userId, id);
    await kv.put(key, JSON.stringify(formation));

    console.log(`[Formations] Created formation ${id} for user ${userId}`);
    return { success: true, formation };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Formations] Error creating formation for ${userId}:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Aggiorna una formazione esistente
 * Se non esiste, ritorna errore
 */
export async function updateFormation(
  kv: KVNamespace,
  userId: string,
  formationId: string,
  data: FormationData
): Promise<
  | { success: true; formation: Formation }
  | { success: false; error: string; notFound?: boolean }
> {
  try {
    const key = getFormationKey(userId, formationId);

    // Verifica esistenza
    const existing = await kv.get(key);
    if (!existing) {
      return { success: false, error: "Formation not found", notFound: true };
    }

    // Parse esistente per preservare createdAt
    let existingFormation: Formation;
    try {
      existingFormation = JSON.parse(existing) as Formation;
    } catch (e) {
      return { success: false, error: "Invalid formation data" };
    }

    const updatedFormation: Formation = {
      ...existingFormation,
      id: formationId, // preserva ID
      updatedAt: new Date().toISOString(),
      data,
    };

    await kv.put(key, JSON.stringify(updatedFormation));

    console.log(
      `[Formations] Updated formation ${formationId} for user ${userId}`
    );
    return { success: true, formation: updatedFormation };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Formations] Error updating formation ${formationId} for ${userId}:`,
      msg
    );
    return { success: false, error: msg };
  }
}

/**
 * Elimina una formazione
 */
export async function deleteFormation(
  kv: KVNamespace,
  userId: string,
  formationId: string
): Promise<
  { success: true } | { success: false; error: string; notFound?: boolean }
> {
  try {
    const key = getFormationKey(userId, formationId);

    // Verifica esistenza
    const existing = await kv.get(key);
    if (!existing) {
      return { success: false, error: "Formation not found", notFound: true };
    }

    await kv.delete(key);

    console.log(
      `[Formations] Deleted formation ${formationId} for user ${userId}`
    );
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Formations] Error deleting formation ${formationId} for ${userId}:`,
      msg
    );
    return { success: false, error: msg };
  }
}

/**
 * Ottiene una singola formazione
 */
export async function getFormation(
  kv: KVNamespace,
  userId: string,
  formationId: string
): Promise<
  | { success: true; formation: Formation }
  | { success: false; error: string; notFound?: boolean }
> {
  try {
    const key = getFormationKey(userId, formationId);
    const value = await kv.get(key);

    if (!value) {
      return { success: false, error: "Formation not found", notFound: true };
    }

    const formation = JSON.parse(value) as Formation;
    return { success: true, formation };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Formations] Error getting formation ${formationId} for ${userId}:`,
      msg
    );
    return { success: false, error: msg };
  }
}
