import { Shield } from "lucide-react";
import type { CardData } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";

interface NextMatchBlockProps {
  card: CardData;
}

/**
 * Restituisce l'abbreviazione della squadra.
 * Usa 'code' se disponibile (es: "JUV", "RMA"), altrimenti fallback ai primi 3 caratteri del nome.
 */
function getTeamAbbreviation(
  name: string | undefined | null,
  code: string | undefined | null
): string {
  if (code) {
    return code;
  }
  if (!name) {
    return "???";
  }
  return name.slice(0, 3).toUpperCase();
}

/**
 * Formatta la data della partita
 * Ritorna { day: "LUN", time: "20:45" }
 */
function formatMatchDate(dateString: string | undefined | null): {
  day: string;
  time: string;
} | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const days = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];
  const day = days[date.getDay()];

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  return { day, time };
}

/**
 * Blocco che mostra la prossima partita del giocatore
 * Formato: Giorno + Ora sopra, icone + abbreviazioni squadre sotto
 */
export function NextMatchBlock({ card }: NextMatchBlockProps) {
  const nextGame = card.anyPlayer?.nextGame;

  if (!nextGame?.date) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground">
        <span className="text-[10px] uppercase">-</span>
      </div>
    );
  }

  const formatted = formatMatchDate(nextGame.date);
  if (!formatted) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground">
        <span className="text-[10px] uppercase">-</span>
      </div>
    );
  }

  const homeTeamName = nextGame.homeTeam?.name;
  const awayTeamName = nextGame.awayTeam?.name;
  const homeTeamCode = nextGame.homeTeam?.code;
  const awayTeamCode = nextGame.awayTeam?.code;
  const homeTeam = getTeamAbbreviation(homeTeamName, homeTeamCode);
  const awayTeam = getTeamAbbreviation(awayTeamName, awayTeamCode);

  // Determina la squadra del giocatore
  const playerClubName = card.anyPlayer?.activeClub?.name;
  const isHomeTeam = playerClubName && homeTeamName && playerClubName === homeTeamName;
  const isAwayTeam = playerClubName && awayTeamName && playerClubName === awayTeamName;

  return (
    <div className="flex flex-col items-center leading-tight">
      {/* Data e ora */}
      <div className="flex items-center gap-1 font-medium text-[10px] text-slate-600">
        <span>{formatted.day}</span>
        <span className="text-slate-400">·</span>
        <span>{formatted.time}</span>
      </div>

      {/* Squadre con icone */}
      <div className="mt-0.5 flex items-center gap-1">
        {/* Home team - sfondo grigio se è la squadra del giocatore */}
        <div className={cn("flex items-center gap-0.5 rounded px-1 py-0.5", isHomeTeam && "bg-slate-200")}>
          <Shield className="h-3 w-3 text-slate-500" />
          <span className="font-semibold text-[10px] text-slate-700">
            {homeTeam}
          </span>
        </div>
        <span className="text-[8px] text-slate-400">vs</span>
        {/* Away team - sfondo grigio se è la squadra del giocatore */}
        <div className={cn("flex items-center gap-0.5 rounded px-1 py-0.5", isAwayTeam && "bg-slate-200")}>
          <Shield className="h-3 w-3 text-slate-500" />
          <span className="font-semibold text-[10px] text-slate-700">
            {awayTeam}
          </span>
        </div>
      </div>
    </div>
  );
}
