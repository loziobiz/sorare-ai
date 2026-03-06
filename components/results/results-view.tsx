"use client";

import { Star, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { graphqlProxy } from "@/lib/api-server";
import { GET_SO5_FIXTURES_QUERY, GET_SO5_RESULTS_QUERY } from "@/lib/queries";
import type {
  So5Appearance,
  So5Fixture,
  So5Lineup,
  So5Ranking,
} from "@/lib/types";

interface ResultsViewProps {
  initialGameWeek?: number;
}

interface FixtureOption {
  slug: string;
  gameWeek: number;
  displayName: string;
}

async function fetchSo5Fixtures(): Promise<FixtureOption[]> {
  const result = await graphqlProxy({
    data: {
      query: GET_SO5_FIXTURES_QUERY,
      variables: {
        sport: "FOOTBALL",
        eventType: "CLASSIC",
        last: 20,
        future: false,
      },
    },
  });

  if (!result.data?.so5?.allSo5Fixtures?.nodes) {
    return [];
  }

  return result.data.so5.allSo5Fixtures.nodes.map(
    (node: { slug: string; gameWeek: number; displayName: string }) => ({
      slug: node.slug,
      gameWeek: node.gameWeek,
      displayName: node.displayName,
    })
  );
}

async function fetchSo5Results(slug: string): Promise<So5Fixture | null> {
  const result = await graphqlProxy({
    data: {
      query: GET_SO5_RESULTS_QUERY,
      variables: { slug },
    },
  });

  if (!result.data?.so5?.so5Fixture) {
    return null;
  }

  return result.data.so5.so5Fixture as So5Fixture;
}

function getRankColorClass(rank: number): string {
  if (rank === 1) {
    return "text-yellow-500";
  }
  if (rank === 2) {
    return "text-slate-400";
  }
  if (rank === 3) {
    return "text-amber-600";
  }
  if (rank <= 10) {
    return "text-emerald-600";
  }
  if (rank <= 100) {
    return "text-blue-600";
  }
  return "text-slate-600";
}

function getScoreBadgeColor(score: number): { bg: string; text: string } {
  if (score === 0) {
    return { bg: "bg-slate-100", text: "text-slate-500" };
  }
  if (score <= 30) {
    return { bg: "bg-rose-100", text: "text-rose-700" };
  }
  if (score <= 40) {
    return { bg: "bg-orange-100", text: "text-orange-700" };
  }
  if (score <= 59) {
    return { bg: "bg-lime-100", text: "text-lime-700" };
  }
  if (score <= 79) {
    return { bg: "bg-emerald-100", text: "text-emerald-700" };
  }
  return { bg: "bg-cyan-100", text: "text-cyan-700" };
}

function PlayerCard({ appearance }: { appearance: So5Appearance }) {
  const score = appearance.score ?? 0;
  const colors = getScoreBadgeColor(score);

  return (
    <div className="flex w-[85px] flex-col items-center gap-1">
      <div className="relative">
        {appearance.anyCard?.pictureUrl ? (
          <img
            alt={appearance.anyCard.name}
            className="h-auto max-w-[85px] rounded-lg"
            height={100}
            loading="lazy"
            src={appearance.anyCard.pictureUrl}
            width={85}
          />
        ) : (
          <div className="flex h-[120px] w-[85px] items-center justify-center rounded-lg bg-slate-200 font-bold text-slate-500 text-xl">
            {(appearance.anyPlayer?.displayName?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        {appearance.captain && (
          <div className="absolute -top-1 -right-1 rounded-full bg-amber-400 p-1">
            <Star className="h-3 w-3 fill-white text-white" />
          </div>
        )}
      </div>
      {/* Punteggio sotto - solo in questa vista, font 14px con icona e colore */}
      <span
        className={`inline-flex items-center justify-center gap-0.5 rounded px-1 py-0.5 font-medium text-[14px] ${colors.bg} ${colors.text}`}
      >
        <span>📊</span>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function LineupRow({
  lineup,
  ranking,
}: {
  lineup: So5Lineup;
  ranking?: So5Ranking;
}) {
  const sortedAppearances = [...lineup.so5Appearances].sort((a, b) => {
    return (b.score ?? 0) - (a.score ?? 0);
  });

  const totalScore = sortedAppearances.reduce(
    (sum, a) => sum + (a.score ?? 0),
    0
  );

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      {/* Header: nome, info e punteggio */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-800 text-xl">{lineup.name}</h3>
          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 font-medium text-[12px] text-slate-600">
            {lineup.so5Leaderboard.displayName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {ranking && (
            <span
              className={`font-bold text-lg ${getRankColorClass(ranking.ranking)}`}
            >
              #{ranking.ranking}
            </span>
          )}
          <span className="font-bold text-slate-700">
            {totalScore.toFixed(2)} pts
          </span>
          {ranking?.eligibleForReward && (
            <Trophy className="h-4 w-4 text-amber-500" />
          )}
        </div>
      </div>

      {/* Carte in orizzontale - stesso stile saved-lineups */}
      <div
        className="no-scrollbar flex gap-1 overflow-x-auto pb-0"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {sortedAppearances.map((appearance) => (
          <PlayerCard appearance={appearance} key={appearance.id} />
        ))}
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export function ResultsView({ initialGameWeek }: ResultsViewProps) {
  const [fixtures, setFixtures] = useState<FixtureOption[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [fixture, setFixture] = useState<So5Fixture | null>(null);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica lista fixtures
  useEffect(() => {
    fetchSo5Fixtures()
      .then((data) => {
        setFixtures(data);
        // Seleziona la GW iniziale o la più recente
        const initial = initialGameWeek
          ? data.find((f) => f.gameWeek === initialGameWeek)
          : data.sort((a, b) => b.gameWeek - a.gameWeek)[0];
        if (initial) {
          setSelectedSlug(initial.slug);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Errore"))
      .finally(() => setIsLoadingFixtures(false));
  }, [initialGameWeek]);

  // Carica risultati quando cambia la fixture selezionata
  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    setIsLoadingResults(true);
    setError(null);

    fetchSo5Results(selectedSlug)
      .then((data) => setFixture(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Errore"))
      .finally(() => setIsLoadingResults(false));
  }, [selectedSlug]);

  // Associa ogni lineup al suo ranking e ordina per slug
  const lineupsWithRankings = useMemo(() => {
    if (!fixture) {
      return [];
    }

    return fixture.mySo5Lineups
      .map((lineup, idx) => ({
        lineup,
        ranking: fixture.mySo5Rankings[idx],
      }))
      .sort((a, b) =>
        b.lineup.so5Leaderboard.slug.localeCompare(a.lineup.so5Leaderboard.slug)
      );
  }, [fixture]);

  if (isLoadingFixtures) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Errore: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con selezione GW */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">Risultati</h1>
          <p className="text-muted-foreground">
            Visualizza i risultati delle tue formazioni schierate
          </p>
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 font-medium text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onChange={(e) => setSelectedSlug(e.target.value)}
          value={selectedSlug}
        >
          <option value="">Seleziona Game Week</option>
          {fixtures
            .sort((a, b) => b.gameWeek - a.gameWeek)
            .map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.displayName}
              </option>
            ))}
        </select>
      </div>

      {isLoadingResults ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : fixture ? (
        <>
          {/* Stats summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-muted-foreground text-sm">Formazioni</div>
              <div className="flex items-center gap-2 font-bold text-2xl">
                <Users className="h-5 w-5 text-blue-500" />
                {fixture.mySo5Lineups.length}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-muted-foreground text-sm">Rankings</div>
              <div className="flex items-center gap-2 font-bold text-2xl">
                <Trophy className="h-5 w-5 text-purple-500" />
                {fixture.mySo5Rankings.length}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-muted-foreground text-sm">Premi</div>
              <div className="flex items-center gap-2 font-bold text-2xl">
                <Trophy className="h-5 w-5 text-amber-500" />
                {
                  fixture.mySo5Rankings.filter((r) => r.eligibleForReward)
                    .length
                }
              </div>
            </div>
          </div>

          {/* Lineups - stesso layout saved-lineups */}
          {lineupsWithRankings.length > 0 && (
            <div className="flex flex-wrap items-start gap-5">
              {lineupsWithRankings.map(({ lineup, ranking }) => (
                <LineupRow key={lineup.id} lineup={lineup} ranking={ranking} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Nessun dato disponibile per questa Game Week
        </div>
      )}
    </div>
  );
}
