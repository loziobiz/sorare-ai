import { Shield } from "lucide-react";
import type { CardData } from "@/lib/sorare-api";

interface NextMatchBlockProps {
  card: CardData;
}

/**
 * Estrae i primi 3 caratteri del nome squadra in maiuscolo
 */
function getTeamAbbreviation(name: string | undefined | null): string {
  if (!name) return "???";
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
  if (!dateString) return null;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;

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

  const homeTeam = getTeamAbbreviation(nextGame.homeTeam?.name);
  const awayTeam = getTeamAbbreviation(nextGame.awayTeam?.name);

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
        <div className="flex items-center gap-0.5">
          <Shield className="h-3 w-3 text-slate-500" />
          <span className="font-semibold text-[10px] text-slate-700">
            {homeTeam}
          </span>
        </div>
        <span className="text-[8px] text-slate-400">vs</span>
        <div className="flex items-center gap-0.5">
          <Shield className="h-3 w-3 text-slate-500" />
          <span className="font-semibold text-[10px] text-slate-700">
            {awayTeam}
          </span>
        </div>
      </div>
    </div>
  );
}
