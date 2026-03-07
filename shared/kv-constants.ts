/**
 * Costanti condivise tra client (lib/kv-api) e worker (cli).
 * Usate per il sync carte Sorare -> KV.
 */

/** Dimensione massima di ogni batch di carte inviato al worker */
export const KV_CARDS_BATCH_SIZE = 100;
