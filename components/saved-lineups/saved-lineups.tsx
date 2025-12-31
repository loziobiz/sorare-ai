"use client";

import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SiteNav } from "@/components/site-nav";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ACTIVE_LEAGUES } from "@/lib/config";
import type { SavedFormation } from "@/lib/db";
import { db } from "@/lib/db";

interface CompactCardProps {
  card: {
    slug: string;
    name: string;
    pictureUrl?: string;
    l5Average?: number;
    l15Average?: number;
    l40Average?: number;
    power?: string;
  };
}

function CompactCard({ card }: CompactCardProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {card.pictureUrl && (
        <Image
          alt={card.name}
          className="h-auto max-w-[95px] rounded-lg"
          height={100}
          src={card.pictureUrl}
          unoptimized
          width={85}
        />
      )}
      <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
        <div>
          <div className="text-muted-foreground">L5</div>
          <div className="font-medium">{card.l5Average?.toFixed(1) ?? "-"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">L15</div>
          <div className="font-medium">
            {card.l15Average?.toFixed(1) ?? "-"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">L40</div>
          <div className="font-medium">
            {card.l40Average?.toFixed(1) ?? "-"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">XP</div>
          <div className="font-medium">
            {card.power
              ? Math.round((Number.parseFloat(card.power) - 1) * 100)
              : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FormationCardProps {
  formation: SavedFormation;
  onEdit: (formation: SavedFormation) => void;
  onDelete: (id: number) => void;
}

function FormationCard({ formation, onEdit, onDelete }: FormationCardProps) {
  const [leagueLabel, setLeagueLabel] = useState<string>("");

  useEffect(() => {
    const [leagueName, countryCode] = formation.league.split("|");
    const customName = ACTIVE_LEAGUES[formation.league];
    setLeagueLabel(customName ?? `${leagueName} (${countryCode})`);
  }, [formation.league]);

  return (
    <div
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      style={{ maxWidth: "480px" }}
    >
      {/* Nome formazione e lega */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-xl">{formation.name}</h3>
        </div>
      </div>

      {/* Carte in orizzontale */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {formation.cards.map((card) => (
          <CompactCard card={card} key={card.slug} />
        ))}
      </div>

      {/* Pulsanti azione */}
      <div className="flex gap-2">
        <Button
          className="h-8 flex-1 px-2 text-xs"
          onClick={() => onEdit(formation)}
          variant="outline"
        >
          <Pencil className="mr-1 h-3 w-3" />
          Modifica
        </Button>
        <Button
          className="h-8 flex-1 px-2 text-xs"
          onClick={() => onDelete(formation.id!)}
          variant="destructive"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Cancella
        </Button>
      </div>
    </div>
  );
}

export function SavedLineups() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [formations, setFormations] = useState<SavedFormation[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadFormations = useCallback(async () => {
    try {
      const all = await db.savedFormations.toArray();
      // Sort by league, then by createdAt (newest first)
      const sorted = all.sort((a, b) => {
        if (a.league !== b.league) {
          return a.league.localeCompare(b.league);
        }
        return b.createdAt - a.createdAt;
      });
      setFormations(sorted);
    } catch (err) {
      console.error("Error loading formations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFormations();
  }, [loadFormations]);

  const handleEdit = (formation: SavedFormation) => {
    // Pass the formation data to the edit page via router state
    router.push(`/lineup?edit=${formation.id}`);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm === null) {
      return;
    }
    try {
      await db.savedFormations.delete(deleteConfirm);
      setFormations((prev) => prev.filter((f) => f.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting formation:", err);
    }
  };

  const groupedFormations = useMemo(() => {
    const groups: Record<string, SavedFormation[]> = {};
    for (const formation of formations) {
      const [leagueName, countryCode] = formation.league.split("|");
      const customName = ACTIVE_LEAGUES[formation.league];
      const leagueLabel = customName ?? `${leagueName} (${countryCode})`;

      if (!groups[leagueLabel]) {
        groups[leagueLabel] = [];
      }
      groups[leagueLabel].push(formation);
    }
    return groups;
  }, [formations]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <LoadingSpinner icon="loader" message="Caricamento formazioni..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SiteNav />

      <div>
        <h1 className="font-bold text-3xl">Formazioni Salvate</h1>
        <p className="text-muted-foreground">
          {formations.length}{" "}
          {formations.length === 1 ? "formazione" : "formazioni"}
        </p>
      </div>

      {formations.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <p>Nessuna formazione salvata.</p>
          <Button className="mt-4" onClick={() => router.push("/lineup")}>
            Crea una nuova formazione
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedFormations).map(([league, items]) => (
            <div key={league}>
              <h2 className="mb-4 font-bold text-slate-700 text-xl">
                {league}
              </h2>
              <div className="grid gap-2 lg:grid-cols-3">
                {items.map((formation) => (
                  <FormationCard
                    formation={formation}
                    key={formation.id}
                    onDelete={handleDeleteClick}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale conferma cancellazione */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Alert className="max-w-md" variant="destructive">
            <AlertTitle>Conferma cancellazione</AlertTitle>
            <AlertDescription>
              Sei sicuro di voler cancellare questa formazione? Questa azione
              non può essere annullata.
            </AlertDescription>
            <AlertAction className="mt-4 flex gap-2">
              <Button onClick={() => setDeleteConfirm(null)} variant="outline">
                Annulla
              </Button>
              <Button onClick={handleConfirmDelete} variant="destructive">
                Conferma cancellazione
              </Button>
            </AlertAction>
          </Alert>
        </div>
      )}
    </div>
  );
}
