/**
 * Lineup Optimizer - Genera la migliore formazione rispettando vincoli
 *
 * Ottimizza per effective score (projectedScore + bonus overperformance + bonus casa)
 * con vincolo CAP su L10.
 */

import type { SavedFormation } from "@/hooks/use-kv-formations";
import type { UnifiedCard } from "./kv-types";

// Usa UnifiedCard che include sia CardData che i campi aggiuntivi dal KV
type OptimizerCard = UnifiedCard;

// Costanti di scoring (estraibili per tuning futuro)
const HOME_BONUS = 0.1; // +10% per GK/DEF in casa
const OVERPERF_L10_THRESHOLD = 45; // Soglia L10 per bonus overperformance
const OVERPERF_RATIO_FLOOR = 0.9; // Ratio minimo proj/L10 per attivare bonus
const OVERPERF_MAX_BONUS = 0.15; // Bonus massimo +15% a ratio >= 1.3

export interface OptimizerConstraints {
  cap: number; // CAP L10 massimo (260, 220, o Infinity per nocap)
  requiredLeague: string | null; // "MLS" o null per tutte
  editingFormationId?: string | null; // Se in edit mode, esclude questa formazione dal check "già usate"
  rarityFilter?: "all" | "limited" | "rare"; // Filtro rarità (optional)
}

export type OptimizerResult =
  | {
      success: true;
      lineup: {
        POR: OptimizerCard;
        DIF: OptimizerCard;
        CEN: OptimizerCard;
        ATT: OptimizerCard;
        EX: OptimizerCard;
      };
      totalL10: number;
      projectedScore: number; // Per future implementazioni
    }
  | {
      success: false;
      reason: string;
    };

// Configurazione algoritmo — possiamo permetterci più carte per miglior copertura
const MAX_CARDS_PER_POSITION = 40;

/**
 * Verifica se una carta può giocare in una posizione
 */
function canPlayPosition(card: OptimizerCard, position: string): boolean {
  const positions = card.anyPositions ?? [];

  switch (position) {
    case "POR":
      return positions.includes("Goalkeeper");
    case "DIF":
      return positions.includes("Defender");
    case "CEN":
      return positions.includes("Midfielder");
    case "ATT":
      return positions.includes("Forward");
    case "EX":
      // Extra può essere DIF, CEN, ATT ma NON portiere
      return (
        positions.includes("Defender") ||
        positions.includes("Midfielder") ||
        positions.includes("Forward")
      );
    default:
      return false;
  }
}

/**
 * Verifica se una carta è della lega richiesta
 */
function isCardFromLeague(card: OptimizerCard, league: string | null): boolean {
  if (!league) {
    return true;
  }

  // Usa leagueName dal KV se disponibile
  if ("leagueName" in card && card.leagueName) {
    return card.leagueName === league;
  }

  // Fallback su activeCompetitions
  const competitions = card.anyPlayer?.activeClub?.activeCompetitions ?? [];
  return competitions.some((c) => c.name === league);
}

/**
 * Ottiene il valore L10 di una carta
 */
function getL10(card: OptimizerCard): number {
  return card.l10Average ?? 0;
}

const MIN_STARTER_ODDS_BP = 6000; // 60% in basis points

/**
 * Verifica se il giocatore ha probabilità di titolarità sufficiente.
 * Se le odds non sono disponibili, la carta passa (non filtrare in assenza di dati).
 */
function hasMinStarterOdds(card: OptimizerCard): boolean {
  const odds =
    card.nextClassicFixturePlayingStatusOdds?.starterOddsBasisPoints ??
    card.playerStats?.odds?.nextFixture?.startingOdds?.starterOddsBasisPoints;
  if (odds === undefined) {
    return true;
  }
  return odds >= MIN_STARTER_ODDS_BP;
}

/**
 * Verifica se la carta gioca in casa nella prossima partita
 */
function isCardHome(card: OptimizerCard): boolean {
  const fixtureHome = card.playerStats?.odds?.nextFixture?.isHome;
  if (fixtureHome !== undefined) {
    return fixtureHome;
  }
  if (card.nextGame?.homeTeam?.name && card.clubName) {
    return card.clubName === card.nextGame.homeTeam.name;
  }
  return false;
}

/**
 * Verifica se la carta è un portiere o difensore (posizione naturale)
 */
function isGkOrDef(card: OptimizerCard): boolean {
  const positions = card.anyPositions ?? [];
  return positions.includes("Goalkeeper") || positions.includes("Defender");
}

/**
 * Ottiene il projected score della carta (fallback su L10)
 */
function getProjectedScore(card: OptimizerCard): number {
  const proj =
    card.nextGame?.projectedScore ??
    card.playerStats?.odds?.nextFixture?.projectedScore;
  if (proj !== undefined && proj !== null && proj > 0) {
    return proj;
  }
  return getL10(card);
}

/**
 * Calcola l'effective score per l'ottimizzazione:
 * - Base: projectedScore (fallback L10)
 * - Bonus overperformance: per carte con L10 < 45 e ratio proj/L10 >= 0.9
 * - Bonus casa: +10% per GK/DEF in casa
 */
function getEffectiveScore(card: OptimizerCard): number {
  const l10 = getL10(card);
  const proj = getProjectedScore(card);
  let score = proj;

  // Overperformance bonus: solo per L10 < threshold
  if (l10 > 0 && l10 < OVERPERF_L10_THRESHOLD) {
    const ratio = proj / l10;
    if (ratio >= OVERPERF_RATIO_FLOOR) {
      // Rampa lineare: 0% a ratio=0.9, max bonus a ratio=1.3
      const t = Math.min(Math.max((ratio - OVERPERF_RATIO_FLOOR) / 0.4, 0), 1);
      score *= 1 + t * OVERPERF_MAX_BONUS;
    }
  }

  // Home bonus per GK/DEF (basato su posizione naturale, non slot)
  if (isGkOrDef(card) && isCardHome(card)) {
    score *= 1 + HOME_BONUS;
  }

  return score;
}

/**
 * Verifica se una carta è della rarità richiesta
 */
function isCardOfRarity(
  card: OptimizerCard,
  rarityFilter: "all" | "limited" | "rare" | undefined
): boolean {
  if (!rarityFilter || rarityFilter === "all") {
    return true;
  }

  // La rarità è nel nome della carta (es: "2023-24 • Limited 94/1000")
  const name = card.name?.toLowerCase() ?? "";

  if (rarityFilter === "limited") {
    return name.includes("limited");
  }
  if (rarityFilter === "rare") {
    return name.includes("rare");
  }

  return true;
}

/**
 * Ottiene le carte già usate in altre formazioni
 */
function getUsedCardSlugs(
  savedFormations: SavedFormation[],
  editingFormationId?: string | null
): Set<string> {
  const used = new Set<string>();

  for (const formation of savedFormations) {
    // Salta la formazione in edit mode (permette reinserimento carte)
    if (editingFormationId && formation.id === editingFormationId) {
      continue;
    }

    for (const card of formation.cards) {
      if (card.slug) {
        used.add(card.slug);
      }
    }
  }

  return used;
}

/**
 * Filtra e prepara le carte per posizione
 */
function prepareCardsByPosition(
  cards: OptimizerCard[],
  constraints: OptimizerConstraints,
  usedSlugs: Set<string>
): Map<string, OptimizerCard[]> {
  const byPosition = new Map<string, OptimizerCard[]>();
  const positions = ["POR", "DIF", "CEN", "ATT", "EX"];

  // Debug logs
  // console.log("[OPTIMIZER] Input cards:", cards.length);
  // console.log("[OPTIMIZER] Used slugs:", usedSlugs.size);
  // console.log("[OPTIMIZER] Required league:", constraints.requiredLeague);

  for (const position of positions) {
    // Filtra carte valide per questa posizione
    const validCards = cards.filter((card) => {
      // Non usata in altre formazioni
      if (usedSlugs.has(card.slug)) {
        return false;
      }

      // Della lega corretta
      if (!isCardFromLeague(card, constraints.requiredLeague)) {
        return false;
      }

      // Della rarità corretta
      if (!isCardOfRarity(card, constraints.rarityFilter)) {
        return false;
      }

      // Può giocare in questa posizione
      if (!canPlayPosition(card, position)) {
        return false;
      }

      // Titolarità >= 60% (se dato disponibile)
      if (!hasMinStarterOdds(card)) {
        return false;
      }

      return true;
    });

    // Ordina per effective score e prendi le migliori + backfill basso L10 per CAP
    const sortedCards = validCards.sort(
      (a, b) => getEffectiveScore(b) - getEffectiveScore(a)
    );

    const selectedCards: OptimizerCard[] = [];
    const selectedSlugs = new Set<string>();

    // 1. Top N carte per effective score (nessun gap di percentile)
    for (
      let i = 0;
      i < sortedCards.length && selectedCards.length < MAX_CARDS_PER_POSITION;
      i++
    ) {
      const card = sortedCards[i];
      if (!selectedSlugs.has(card.slug)) {
        selectedCards.push(card);
        selectedSlugs.add(card.slug);
      }
    }

    // 2. Backfill: assicura almeno alcune carte a basso L10 per fitting CAP
    let idx = sortedCards.length - 1;
    while (
      selectedCards.length <
        Math.min(MAX_CARDS_PER_POSITION, sortedCards.length) &&
      idx >= 0
    ) {
      const card = sortedCards[idx];
      if (!selectedSlugs.has(card.slug)) {
        selectedCards.push(card);
        selectedSlugs.add(card.slug);
      }
      idx--;
    }

    // console.log(`[OPTIMIZER] Selected ${selectedCards.length} cards for ${position}`);

    byPosition.set(position, selectedCards);
  }

  return byPosition;
}

/**
 * Algoritmo branch & bound per trovare la migliore combinazione
 */
function findBestCombination(
  byPosition: Map<string, OptimizerCard[]>,
  cap: number
): OptimizerResult {
  const positions = ["POR", "DIF", "CEN", "ATT", "EX"] as const;

  // Verifica che ci siano abbastanza carte per ogni posizione
  for (const pos of positions) {
    const cards = byPosition.get(pos) ?? [];
    if (cards.length === 0) {
      return {
        success: false,
        reason: `Nessuna carta disponibile per la posizione ${pos}`,
      };
    }
  }

  // Ottieni array di carte per ogni posizione
  const porCards = byPosition.get("POR") ?? [];
  const difCards = byPosition.get("DIF") ?? [];
  const cenCards = byPosition.get("CEN") ?? [];
  const attCards = byPosition.get("ATT") ?? [];
  const exCards = byPosition.get("EX") ?? [];

  let bestResult: {
    lineup: {
      POR: OptimizerCard;
      DIF: OptimizerCard;
      CEN: OptimizerCard;
      ATT: OptimizerCard;
      EX: OptimizerCard;
    };
    totalL10: number;
    totalEffective: number;
  } | null = null;

  let iterations = 0;

  // Branch & bound: vincolo CAP su L10, ottimizza effective score

  for (const por of porCards) {
    const porL10 = getL10(por);
    if (porL10 > cap) {
      continue;
    }
    const porEff = getEffectiveScore(por);

    for (const dif of difCards) {
      if (dif.slug === por.slug) {
        continue;
      }
      const difL10 = getL10(dif);
      const sum2L10 = porL10 + difL10;
      if (sum2L10 > cap) {
        continue;
      }
      const sum2Eff = porEff + getEffectiveScore(dif);

      for (const cen of cenCards) {
        if (cen.slug === por.slug || cen.slug === dif.slug) {
          continue;
        }
        const cenL10 = getL10(cen);
        const sum3L10 = sum2L10 + cenL10;
        if (sum3L10 > cap) {
          continue;
        }
        const sum3Eff = sum2Eff + getEffectiveScore(cen);

        for (const att of attCards) {
          if (
            att.slug === por.slug ||
            att.slug === dif.slug ||
            att.slug === cen.slug
          ) {
            continue;
          }
          const attL10 = getL10(att);
          const sum4L10 = sum3L10 + attL10;
          if (sum4L10 > cap) {
            continue;
          }
          const sum4Eff = sum3Eff + getEffectiveScore(att);

          for (const ex of exCards) {
            if (
              ex.slug === por.slug ||
              ex.slug === dif.slug ||
              ex.slug === cen.slug ||
              ex.slug === att.slug
            ) {
              continue;
            }

            const exL10 = getL10(ex);
            const totalL10 = sum4L10 + exL10;

            // Vincolo CAP su L10
            if (totalL10 > cap) {
              continue;
            }

            iterations++;

            const totalEffective = sum4Eff + getEffectiveScore(ex);

            // Ottimizza per effective score
            if (!bestResult || totalEffective > bestResult.totalEffective) {
              bestResult = {
                lineup: { POR: por, DIF: dif, CEN: cen, ATT: att, EX: ex },
                totalL10,
                totalEffective,
              };
            }
          }
        }
      }
    }
  }

  console.log(`[OPTIMIZER] Valid combinations: ${iterations}`);
  if (bestResult) {
    console.log(
      `[OPTIMIZER] Best L10: ${bestResult.totalL10} | Effective: ${bestResult.totalEffective.toFixed(1)}`
    );
  }

  if (!bestResult) {
    return {
      success: false,
      reason: `Nessuna combinazione valida trovata che rispetti il CAP di ${cap}`,
    };
  }

  return {
    success: true,
    lineup: bestResult.lineup,
    totalL10: bestResult.totalL10,
    projectedScore: bestResult.totalEffective,
  };
}

/**
 * Interfaccia principale per generare la lineup ottimale
 *
 * @param allCards - Tutte le carte disponibili dell'utente
 * @param savedFormations - Formazioni già salvate (per escludere carte usate)
 * @param constraints - Vincoli (CAP, lega, etc.)
 * @returns Result con la lineup ottimale o errore
 */
export function generateOptimalLineup(
  allCards: OptimizerCard[],
  savedFormations: SavedFormation[],
  constraints: OptimizerConstraints
): OptimizerResult {
  // 1. Ottieni carte già usate
  const usedSlugs = getUsedCardSlugs(
    savedFormations,
    constraints.editingFormationId
  );

  // 2. Prepara carte per posizione (con filtri futuri applicabili qui)
  // TODO: Aggiungere filtri opzionali (in-season, titolarità, etc.)
  const cardsByPosition = prepareCardsByPosition(
    allCards,
    constraints,
    usedSlugs
  );

  // 3. Trova migliore combinazione
  return findBestCombination(cardsByPosition, constraints.cap);
}

/**
 * Versione veloce per quando non c'è CAP (nocap)
 * Semplice greedy: prende la migliore per ogni posizione
 */
export function generateOptimalLineupNocap(
  allCards: OptimizerCard[],
  savedFormations: SavedFormation[],
  constraints: Omit<OptimizerConstraints, "cap">
): OptimizerResult {
  const usedSlugs = getUsedCardSlugs(
    savedFormations,
    constraints.editingFormationId
  );
  const positions = ["POR", "DIF", "CEN", "ATT", "EX"] as const;

  const lineup = {} as {
    POR: OptimizerCard;
    DIF: OptimizerCard;
    CEN: OptimizerCard;
    ATT: OptimizerCard;
    EX: OptimizerCard;
  };
  const usedInLineup = new Set<string>();
  let totalL10 = 0;
  let totalEffective = 0;

  console.log(
    "[OPTIMIZER NOCAP] Cards:",
    allCards.length,
    "Used:",
    usedSlugs.size
  );

  for (const position of positions) {
    const candidates = allCards
      .filter((card) => {
        if (usedSlugs.has(card.slug)) {
          return false;
        }
        if (usedInLineup.has(card.slug)) {
          return false;
        }
        if (!isCardFromLeague(card, constraints.requiredLeague)) {
          return false;
        }
        if (!isCardOfRarity(card, constraints.rarityFilter)) {
          return false;
        }
        if (!canPlayPosition(card, position)) {
          return false;
        }
        if (!hasMinStarterOdds(card)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => getEffectiveScore(b) - getEffectiveScore(a));

    console.log(
      `[OPTIMIZER NOCAP] Position ${position}: ${candidates.length} candidates`
    );

    if (candidates.length === 0) {
      return {
        success: false,
        reason: `Nessuna carta disponibile per la posizione ${position}`,
      };
    }

    const best = candidates[0];
    lineup[position] = best;
    usedInLineup.add(best.slug);
    totalL10 += getL10(best);
    totalEffective += getEffectiveScore(best);
  }

  return {
    success: true,
    lineup,
    totalL10,
    projectedScore: totalEffective,
  };
}

// ============================================================================
// Completamento lineup parziale
// ============================================================================

type PositionKey = "POR" | "DIF" | "CEN" | "ATT" | "EX";
export type FilledSlots = Partial<Record<PositionKey, OptimizerCard>>;

interface RecursiveBest {
  cards: Map<string, OptimizerCard>; // position -> card
  totalL10: number;
  totalEffective: number;
}

/**
 * B&B ricorsivo per un numero variabile di posizioni vuote
 */
function recursiveBranchBound(
  emptyPositions: string[],
  cardsByPos: Map<string, OptimizerCard[]>,
  capRemaining: number,
  usedSlugs: Set<string>,
  depth: number,
  currentL10: number,
  currentEff: number,
  currentCards: Map<string, OptimizerCard>,
  currentBest: RecursiveBest | null
): RecursiveBest | null {
  // Caso base: tutte le posizioni vuote riempite
  if (depth === emptyPositions.length) {
    if (!currentBest || currentEff > currentBest.totalEffective) {
      return {
        cards: new Map(currentCards),
        totalL10: currentL10,
        totalEffective: currentEff,
      };
    }
    return currentBest;
  }

  let best = currentBest;
  const position = emptyPositions[depth];
  const candidates = cardsByPos.get(position) ?? [];

  for (const card of candidates) {
    if (usedSlugs.has(card.slug)) {
      continue;
    }

    const cardL10 = getL10(card);
    const newL10 = currentL10 + cardL10;

    // Pruning: supera CAP residuo
    if (newL10 > capRemaining) {
      continue;
    }

    // Segna come usata, ricorsione, rimuovi
    usedSlugs.add(card.slug);
    currentCards.set(position, card);

    best = recursiveBranchBound(
      emptyPositions,
      cardsByPos,
      capRemaining,
      usedSlugs,
      depth + 1,
      newL10,
      currentEff + getEffectiveScore(card),
      currentCards,
      best
    );

    usedSlugs.delete(card.slug);
    currentCards.delete(position);
  }

  return best;
}

/**
 * Completa una lineup parziale riempiendo solo le posizioni vuote.
 * Rispetta il CAP residuo (cap - L10 carte già piazzate).
 */
export function completePartialLineup(
  allCards: OptimizerCard[],
  savedFormations: SavedFormation[],
  constraints: OptimizerConstraints,
  filledSlots: FilledSlots
): OptimizerResult {
  const allPositions: PositionKey[] = ["POR", "DIF", "CEN", "ATT", "EX"];

  // Calcola L10 ed effective delle carte già piazzate
  let filledL10 = 0;
  let filledEff = 0;
  const usedSlugs = getUsedCardSlugs(
    savedFormations,
    constraints.editingFormationId
  );

  for (const card of Object.values(filledSlots)) {
    if (card) {
      filledL10 += getL10(card);
      filledEff += getEffectiveScore(card);
      usedSlugs.add(card.slug);
    }
  }

  const remainingCap = constraints.cap - filledL10;
  const emptyPositions = allPositions.filter((pos) => !filledSlots[pos]);

  if (emptyPositions.length === 0) {
    return {
      success: false,
      reason: "Tutti gli slot sono già compilati",
    };
  }

  // Prepara candidati solo per le posizioni vuote
  const cardsByPos = new Map<string, OptimizerCard[]>();
  for (const position of emptyPositions) {
    const validCards = allCards
      .filter((card) => {
        if (usedSlugs.has(card.slug)) {
          return false;
        }
        if (!isCardFromLeague(card, constraints.requiredLeague)) {
          return false;
        }
        if (!isCardOfRarity(card, constraints.rarityFilter)) {
          return false;
        }
        if (!canPlayPosition(card, position)) {
          return false;
        }
        if (!hasMinStarterOdds(card)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => getEffectiveScore(b) - getEffectiveScore(a))
      .slice(0, MAX_CARDS_PER_POSITION);

    if (validCards.length === 0) {
      return {
        success: false,
        reason: `Nessuna carta disponibile per la posizione ${position}`,
      };
    }
    cardsByPos.set(position, validCards);
  }

  // B&B ricorsivo
  const best = recursiveBranchBound(
    emptyPositions,
    cardsByPos,
    remainingCap,
    new Set(usedSlugs),
    0,
    0,
    0,
    new Map(),
    null
  );

  if (!best) {
    return {
      success: false,
      reason: `Nessuna combinazione valida per completare la lineup (CAP residuo: ${remainingCap.toFixed(0)})`,
    };
  }

  // Costruisci lineup completa: filled + found
  const lineup = {} as Record<PositionKey, OptimizerCard>;
  for (const pos of allPositions) {
    const filled = filledSlots[pos];
    const found = best.cards.get(pos);
    if (filled) {
      lineup[pos] = filled;
    } else if (found) {
      lineup[pos] = found;
    }
  }

  const totalL10 = filledL10 + best.totalL10;
  const totalEffective = filledEff + best.totalEffective;

  console.log(
    `[OPTIMIZER COMPLETE] Filled: ${Object.keys(filledSlots).length} | Found: ${best.cards.size} | L10: ${totalL10.toFixed(0)} | Eff: ${totalEffective.toFixed(1)}`
  );

  return {
    success: true,
    lineup: lineup as {
      POR: OptimizerCard;
      DIF: OptimizerCard;
      CEN: OptimizerCard;
      ATT: OptimizerCard;
      EX: OptimizerCard;
    },
    totalL10,
    projectedScore: totalEffective,
  };
}
