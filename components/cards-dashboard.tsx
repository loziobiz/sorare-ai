"use client";

import { useState } from "react";
import { CardsGrid } from "@/components/cards/card-grid";
import { CardsFilters } from "@/components/cards/cards-filters";
import {
  CardsList,
  type SortDirection,
  type SortKey,
} from "@/components/cards/cards-list";
import { DashboardHeader } from "@/components/cards/dashboard-header";
import { type ViewMode, ViewToggle } from "@/components/cards/view-toggle";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useCardFilters } from "@/hooks/use-card-filters";
import { useKvCards } from "@/hooks/use-kv-cards";

export function CardsDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tableSortKey, setTableSortKey] = useState<SortKey>("name");
  const [tableSortDirection, setTableSortDirection] =
    useState<SortDirection>("asc");
  const {
    cards,
    userId,
    isLoading,
    isRefreshing,
    isSyncing,
    error,
    loadingProgress,
    lastUpdate,
    syncStatus,
  } = useKvCards();

  const {
    filters,
    setRarity,
    setPosition,
    setLeague,
    setSortBy,
    setInSeasonOnly,
    setSealed,
    setSearchQuery,
    leagues,
    filteredCards,
  } = useCardFilters(cards);

  const handleTableSort = (key: SortKey, direction: SortDirection) => {
    setTableSortKey(key);
    setTableSortDirection(direction);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner icon="loader" message={loadingProgress} />
      </div>
    );
  }

  if (isRefreshing || isSyncing) {
    return (
      <div className="space-y-6">
        <LoadingSpinner icon="refresh" message={loadingProgress} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      {/* Header e filtri sticky */}
      <div className="sticky top-0 z-20 bg-transparent pb-2">
        <div className="mt-6">
          <DashboardHeader
            lastUpdate={lastUpdate}
            syncStatus={syncStatus}
            userSlug={userId}
          />
        </div>

        <div className="mt-6">
          <CardsFilters
            inSeasonOnly={filters.inSeasonOnly}
            league={filters.league}
            leagues={leagues}
            onInSeasonChange={setInSeasonOnly}
            onLeagueChange={setLeague}
            onPositionChange={setPosition}
            onRarityChange={setRarity}
            onSealedChange={setSealed}
            onSearchQueryChange={setSearchQuery}
            onSortChange={setSortBy}
            position={filters.position}
            rarity={filters.rarity}
            sealed={filters.sealed}
            searchQuery={filters.searchQuery}
            sortBy={filters.sortBy}
          />
        </div>

        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-bold text-2xl text-slate-200">
            Your Cards ({filteredCards.length})
          </h2>
          <ViewToggle onViewModeChange={setViewMode} viewMode={viewMode} />
        </div>
      </div>

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "grid" ? (
          <CardsGrid
            cards={filteredCards}
            columns={{ lg: 5, md: 4, mobile: 1 }}
            emptyMessage="Nessuna carta trovata con i filtri selezionati"
            showCardAverages
            showCardPositions={false}
          />
        ) : (
          <CardsList
            cards={filteredCards}
            emptyMessage="Nessuna carta trovata con i filtri selezionati"
            mode="dashboard"
            onSort={handleTableSort}
            sortDirection={tableSortDirection}
            sortKey={tableSortKey}
          />
        )}
      </div>
    </div>
  );
}
