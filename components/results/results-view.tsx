"use client";

import { Star, Trophy } from "lucide-react";
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
  startDate?: string;
  endDate?: string;
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
    (node: {
      slug: string;
      gameWeek: number;
      displayName: string;
      startDate?: string;
      endDate?: string;
    }) => ({
      slug: node.slug,
      gameWeek: node.gameWeek,
      displayName: node.displayName,
      startDate: node.startDate,
      endDate: node.endDate,
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

const POSITION_ORDER: Record<string, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Forward: 3,
};

function getPositionOrder(appearance: So5Appearance): number {
  const pos = appearance.anyCard?.anyPositions?.[0];
  return pos !== undefined ? (POSITION_ORDER[pos] ?? 4) : 4;
}

function LineupRow({
  lineup,
  ranking,
}: {
  lineup: So5Lineup;
  ranking?: So5Ranking;
}) {
  const sortedAppearances = [...lineup.so5Appearances].sort((a, b) => {
    const posA = getPositionOrder(a);
    const posB = getPositionOrder(b);
    if (posA !== posB) return posA - posB;
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

  // Trova la game week corrente basata sulla data
  const findCurrentGameWeek = (
    fixturesData: FixtureOption[]
  ): FixtureOption | null => {
    const now = new Date();

    // Cerca una fixture dove la data corrente è compresa tra startDate e endDate
    const current = fixturesData.find((f) => {
      if (!(f.startDate && f.endDate)) return false;
      const start = new Date(f.startDate);
      const end = new Date(f.endDate);
      return now >= start && now <= end;
    });

    if (current) return current;

    // Se non siamo in nessuna GW attiva, trova la più vicina
    // (la più recente conclusa o la prossima che inizia)
    const sorted = [...fixturesData].sort((a, b) => b.gameWeek - a.gameWeek);

    // Cerca la prima fixture che finisce dopo adesso (prossima)
    const next = sorted.find((f) => f.endDate && new Date(f.endDate) > now);
    if (next) return next;

    // Altrimenti prendi la più recente (quella con gameWeek più alto)
    return sorted[0] ?? null;
  };

  // Carica lista fixtures
  useEffect(() => {
    fetchSo5Fixtures()
      .then((data) => {
        setFixtures(data);
        // Seleziona la GW iniziale o quella corrente
        let initial: FixtureOption | null = null;
        if (initialGameWeek) {
          initial = data.find((f) => f.gameWeek === initialGameWeek) ?? null;
        }
        if (!initial) {
          initial = findCurrentGameWeek(data);
        }
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

  const RARITY_CONFIG: { key: string; label: string; order: number }[] = [
    { key: "limited", label: "Limited", order: 0 },
    { key: "rare", label: "Rare", order: 1 },
    { key: "common", label: "Common", order: 2 },
  ];

  function getRarityConfig(slug: string): { label: string; order: number } {
    const lower = slug.toLowerCase();
    const match = RARITY_CONFIG.find((r) => lower.includes(r.key));
    return match ?? { label: "Altro", order: 3 };
  }

  // Associa ogni lineup al suo ranking, aggiunge label rarità e raggruppa per rarità → leaderboard
  const rarityGroups = useMemo(() => {
    if (!fixture) return [];

    type Item = {
      lineup: So5Lineup;
      ranking: So5Ranking | undefined;
      label: string;
      order: number;
    };

    const items: Item[] = fixture.mySo5Lineups.map((lineup, idx) => ({
      lineup,
      ranking: fixture.mySo5Rankings[idx],
      ...getRarityConfig(lineup.so5Leaderboard.slug),
    }));

    items.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.lineup.so5Leaderboard.displayName.localeCompare(
        b.lineup.so5Leaderboard.displayName
      );
    });

    type LeaderboardGroup = { leaderboardName: string; items: Item[] };
    type RarityGroup = { label: string; order: number; leaderboards: LeaderboardGroup[] };

    const groups: RarityGroup[] = [];
    for (const item of items) {
      let rarityGroup = groups.find((g) => g.label === item.label);
      if (!rarityGroup) {
        rarityGroup = { label: item.label, order: item.order, leaderboards: [] };
        groups.push(rarityGroup);
      }
      const lbName = item.lineup.so5Leaderboard.displayName;
      let lbGroup = rarityGroup.leaderboards.find((l) => l.leaderboardName === lbName);
      if (!lbGroup) {
        lbGroup = { leaderboardName: lbName, items: [] };
        rarityGroup.leaderboards.push(lbGroup);
      }
      lbGroup.items.push(item);
    }
    return groups;
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
            .filter((f) => {
              // Nascondi GW future (quelle che iniziano dopo oggi)
              if (!f.startDate) return true;
              return new Date(f.startDate) <= new Date();
            })
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
          {rarityGroups.length > 0 && (
            <div className="space-y-8">
              {rarityGroups.map((group) => (
                <div key={group.label}>
                  <h2 className="mb-4 font-bold text-slate-400 text-xs uppercase tracking-widest">
                    {group.label}
                  </h2>
                  <div className="space-y-4">
                    {group.leaderboards.map((lb) => (
                      <div key={lb.leaderboardName}>
                        <h3 className="mb-2 font-semibold text-slate-500 text-xs">
                          {lb.leaderboardName}
                        </h3>
                        <div className="flex flex-wrap items-start gap-5">
                          {lb.items.map(({ lineup, ranking }) => (
                            <LineupRow key={lineup.id} lineup={lineup} ranking={ranking} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
