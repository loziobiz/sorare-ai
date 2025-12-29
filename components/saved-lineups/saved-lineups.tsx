"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SorareCard } from "@/components/cards/card";
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
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {/* Nome formazione e lega */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-xl">{formation.name}</h3>
          <p className="text-muted-foreground text-sm">{leagueLabel}</p>
        </div>
      </div>

      {/* Carte in orizzontale */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {formation.cards.map((card) => (
          <div className="min-w-[140px]" key={card.slug}>
            <SorareCard card={card} showAverages showPositions={false} />
          </div>
        ))}
      </div>

      {/* Pulsanti azione */}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => onEdit(formation)}
          variant="outline"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Modifica formazione
        </Button>
        <Button
          className="flex-1"
          onClick={() => onDelete(formation.id!)}
          variant="destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Cancella formazione
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
              <div className="grid gap-4 lg:grid-cols-2">
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
