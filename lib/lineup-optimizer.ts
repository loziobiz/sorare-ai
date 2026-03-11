/**
 * Lineup Optimizer - Genera la migliore formazione rispettando vincoli
 * 
 * MVP: Ottimizza per L10 massimo con CAP constraint
 * Future: Aggiungere filtri (in-season, titolarità, etc.)
 */

import type { CardData } from "./sorare-api";
import type { UnifiedCard } from "./kv-types";
import type { SavedFormation } from "@/hooks/use-kv-formations";

// Usa UnifiedCard che include sia CardData che i campi aggiuntivi dal KV
type OptimizerCard = UnifiedCard;

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

// Configurazione algoritmo
const MAX_CARDS_PER_POSITION = 20; // Aumentato per avere più varietà di L10

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
  if (!league) return true;
  
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

/**
 * Verifica se una carta è della rarità richiesta
 */
function isCardOfRarity(
  card: OptimizerCard,
  rarityFilter: "all" | "limited" | "rare" | undefined
): boolean {
  if (!rarityFilter || rarityFilter === "all") return true;
  
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
      if (usedSlugs.has(card.slug)) return false;
      
      // Della lega corretta
      if (!isCardFromLeague(card, constraints.requiredLeague)) return false;
      
      // Della rarità corretta
      if (!isCardOfRarity(card, constraints.rarityFilter)) return false;
      
      // Può giocare in questa posizione
      if (!canPlayPosition(card, position)) return false;
      
      return true;
    });
    

    
    // Seleziona un mix di carte: top L10, medie, e basse (per rispettare CAP)
    const sortedCards = validCards.sort((a, b) => getL10(b) - getL10(a));
    
    // Prendi: top 8, poi carte dal 25° al 35° percentile, poi carte dal 50° al 70° percentile
    const selectedCards: OptimizerCard[] = [];
    const selectedSlugs = new Set<string>();
    
    // 1. Top 8 carte
    for (let i = 0; i < Math.min(8, sortedCards.length); i++) {
      const card = sortedCards[i];
      if (!selectedSlugs.has(card.slug)) {
        selectedCards.push(card);
        selectedSlugs.add(card.slug);
      }
    }
    
    // 2. Carte con L10 medio (25-35% del range)
    const startMid = Math.floor(sortedCards.length * 0.25);
    const endMid = Math.floor(sortedCards.length * 0.35);
    for (let i = startMid; i < Math.min(endMid, sortedCards.length) && selectedCards.length < MAX_CARDS_PER_POSITION; i++) {
      const card = sortedCards[i];
      if (!selectedSlugs.has(card.slug)) {
        selectedCards.push(card);
        selectedSlugs.add(card.slug);
      }
    }
    
    // 3. Carte con L10 basso (50-70% del range)
    const startLow = Math.floor(sortedCards.length * 0.50);
    const endLow = Math.floor(sortedCards.length * 0.70);
    for (let i = startLow; i < Math.min(endLow, sortedCards.length) && selectedCards.length < MAX_CARDS_PER_POSITION; i++) {
      const card = sortedCards[i];
      if (!selectedSlugs.has(card.slug)) {
        selectedCards.push(card);
        selectedSlugs.add(card.slug);
      }
    }
    
    // 4. Se ancora non abbiamo abbastanza, aggiungi dal fondo (L10 più basso)
    let idx = sortedCards.length - 1;
    while (selectedCards.length < Math.min(10, sortedCards.length) && idx >= 0) {
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
    lineup: { POR: OptimizerCard; DIF: OptimizerCard; CEN: OptimizerCard; ATT: OptimizerCard; EX: OptimizerCard };
    totalL10: number;
  } | null = null;
  
  let iterations = 0;
  
  // Branch & bound con pruning
  // Per ogni combinazione, controlla subito se può superare il best corrente
  

  
  for (const por of porCards) {
    const porL10 = getL10(por);
    if (porL10 > cap) continue;
    
    for (const dif of difCards) {
      if (dif.slug === por.slug) continue;
      const difL10 = getL10(dif);
      const sum2 = porL10 + difL10;
      if (sum2 > cap) continue;
      
      for (const cen of cenCards) {
        if (cen.slug === por.slug || cen.slug === dif.slug) continue;
        const cenL10 = getL10(cen);
        const sum3 = sum2 + cenL10;
        if (sum3 > cap) continue;
        
        for (const att of attCards) {
          if (att.slug === por.slug || att.slug === dif.slug || att.slug === cen.slug) continue;
          const attL10 = getL10(att);
          const sum4 = sum3 + attL10;
          if (sum4 > cap) continue;
          
          for (const ex of exCards) {
            if (
              ex.slug === por.slug ||
              ex.slug === dif.slug ||
              ex.slug === cen.slug ||
              ex.slug === att.slug
            ) continue;
            
            const exL10 = getL10(ex);
            const totalL10 = sum4 + exL10;
            
            // Verifica CAP
            if (totalL10 > cap) continue;
            
            iterations++;
            
            // Verifica se è la migliore finora
            if (!bestResult || totalL10 > bestResult.totalL10) {
              bestResult = {
                lineup: { POR: por, DIF: dif, CEN: cen, ATT: att, EX: ex },
                totalL10,
              };
            }
          }
        }
      }
    }
  }
  
  console.log(`[OPTIMIZER] Total valid combinations found: ${iterations}`);
  if (bestResult) {
    console.log(`[OPTIMIZER] Best L10: ${bestResult.totalL10}`);
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
    projectedScore: 0, // TODO: implementare quando disponibile
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
  const usedSlugs = getUsedCardSlugs(savedFormations, constraints.editingFormationId);
  
  // 2. Prepara carte per posizione (con filtri futuri applicabili qui)
  // TODO: Aggiungere filtri opzionali (in-season, titolarità, etc.)
  const cardsByPosition = prepareCardsByPosition(allCards, constraints, usedSlugs);
  
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
  const usedSlugs = getUsedCardSlugs(savedFormations, constraints.editingFormationId);
  const positions = ["POR", "DIF", "CEN", "ATT", "EX"] as const;
  
  const lineup = {} as { POR: OptimizerCard; DIF: OptimizerCard; CEN: OptimizerCard; ATT: OptimizerCard; EX: OptimizerCard };
  const usedInLineup = new Set<string>();
  let totalL10 = 0;
  
  console.log("[OPTIMIZER NOCAP] Cards:", allCards.length, "Used:", usedSlugs.size);
  
  for (const position of positions) {
    const candidates = allCards
      .filter((card) => {
        if (usedSlugs.has(card.slug)) return false;
        if (usedInLineup.has(card.slug)) return false;
        if (!isCardFromLeague(card, constraints.requiredLeague)) return false;
        if (!isCardOfRarity(card, constraints.rarityFilter)) return false;
        if (!canPlayPosition(card, position)) return false;
        return true;
      })
      .sort((a, b) => getL10(b) - getL10(a));
    
    console.log(`[OPTIMIZER NOCAP] Position ${position}: ${candidates.length} candidates`);
    
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
  }
  
  return {
    success: true,
    lineup,
    totalL10,
    projectedScore: 0,
  };
}
