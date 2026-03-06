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
    return { bg: "bg-white/5", text: "text-slate-400" };
  }
  if (score <= 30) {
    return { bg: "bg-rose-900/40", text: "text-rose-400" };
  }
  if (score <= 40) {
    return { bg: "bg-orange-900/40", text: "text-orange-400" };
  }
  if (score <= 59) {
    return { bg: "bg-lime-900/40", text: "text-lime-400" };
  }
  if (score <= 79) {
    return { bg: "bg-emerald-900/40", text: "text-emerald-400" };
  }
  return { bg: "bg-cyan-900/40", text: "text-cyan-400" };
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
          <div className="flex h-[120px] w-[85px] items-center justify-center rounded-lg bg-white/10 font-bold text-slate-400 text-xl">
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
    <div className="space-y-2 rounded-lg border border-white/10 bg-[#1A1B23] p-2 shadow-sm">
      {/* Header: nome, info e punteggio */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-100 text-xl">{lineup.name}</h3>
          <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 font-medium text-[12px] text-slate-400">
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
          <span className="font-bold text-slate-300">
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
      <div className="rounded-lg border border-red-900/40 bg-red-900/20 p-4 text-red-400">
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
          className="h-10 rounded-md border border-white/10 bg-[#1A1B23] px-3 py-2 font-medium text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
            <div className="rounded-lg border border-white/10 bg-[#1A1B23] p-4 shadow-sm">
              <div className="text-slate-400 text-sm">Formazioni</div>
              <div className="flex items-center gap-2 font-bold text-2xl text-slate-100">
                <Users className="h-5 w-5 text-blue-400" />
                {fixture.mySo5Lineups.length}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1A1B23] p-4 shadow-sm">
              <div className="text-slate-400 text-sm">Rankings</div>
              <div className="flex items-center gap-2 font-bold text-2xl text-slate-100">
                <Trophy className="h-5 w-5 text-purple-400" />
                {fixture.mySo5Rankings.length}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1A1B23] p-4 shadow-sm">
              <div className="text-slate-400 text-sm">Premi</div>
              <div className="flex items-center gap-2 font-bold text-2xl text-slate-100">
                <Trophy className="h-5 w-5 text-amber-400" />
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
        <div className="rounded-lg border border-white/10 bg-[#1A1B23] p-8 text-center text-slate-400">
          Nessun dato disponibile per questa Game Week
        </div>
      )}
    </div>
  );
}
