"use client";

import { useState } from "react";
import { CardsGrid } from "@/components/cards/card-grid";
import { CardsFilters } from "@/components/cards/cards-filters";
import {
  CardsList,
  COLUMN_WIDTHS_STANDALONE,
  getSortIcon,
  type SortDirection,
  type SortKey,
} from "@/components/cards/cards-list";
import { DashboardHeader } from "@/components/cards/dashboard-header";
import { type ViewMode, ViewToggle } from "@/components/cards/view-toggle";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SiteNav } from "@/components/site-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCardFilters } from "@/hooks/use-card-filters";
import { useCards } from "@/hooks/use-cards";

export function CardsDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tableSortKey, setTableSortKey] = useState<SortKey>("name");
  const [tableSortDirection, setTableSortDirection] =
    useState<SortDirection>("asc");
  const {
    cards,
    userSlug,
    isLoading,
    isRefreshing,
    error,
    loadingProgress,
    lastUpdate,
    refresh,
    clearCache,
  } = useCards();

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

  if (isRefreshing) {
    return (
      <div className="space-y-6">
        <LoadingSpinner icon="refresh" message={loadingProgress} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      {/* Header e filtri sticky */}
      <div className="sticky top-0 z-20 bg-white pb-2">
        <SiteNav />

        <div className="mt-6">
          <DashboardHeader
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            lastUpdate={lastUpdate}
            onClearCache={clearCache}
            onRefresh={refresh}
            userSlug={userSlug}
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
          <h2 className="font-bold text-2xl">
            Your Cards ({filteredCards.length})
          </h2>
          <ViewToggle onViewModeChange={setViewMode} viewMode={viewMode} />
        </div>

        {/* Header tabella sticky - solo in vista lista */}
        {viewMode === "list" && (
          <div className="mt-4 rounded-t-md border border-b-0 bg-white">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b">
                  <th
                    className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                    onClick={() =>
                      handleTableSort(
                        "name",
                        tableSortKey === "name" && tableSortDirection === "asc"
                          ? "desc"
                          : "asc"
                      )
                    }
                    style={{ width: COLUMN_WIDTHS_STANDALONE.name }}
                  >
                    <div className="flex items-center">
                      Giocatore
                      {getSortIcon("name", tableSortKey, tableSortDirection)}
                    </div>
                  </th>
                  <th
                    className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                    onClick={() =>
                      handleTableSort(
                        "team",
                        tableSortKey === "team" && tableSortDirection === "asc"
                          ? "desc"
                          : "asc"
                      )
                    }
                    style={{ width: COLUMN_WIDTHS_STANDALONE.team }}
                  >
                    <div className="flex items-center">
                      Squadra
                      {getSortIcon("team", tableSortKey, tableSortDirection)}
                    </div>
                  </th>
                  <th
                    className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground"
                    style={{ width: COLUMN_WIDTHS_STANDALONE.forma }}
                  >
                    <div className="flex items-center">Forma</div>
                  </th>
                  <th
                    className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                    onClick={() =>
                      handleTableSort(
                        "l5",
                        tableSortKey === "l5" && tableSortDirection === "asc"
                          ? "desc"
                          : "asc"
                      )
                    }
                    style={{ width: COLUMN_WIDTHS_STANDALONE.l5 }}
                  >
                    <div className="flex items-center">
                      L5
                      {getSortIcon("l5", tableSortKey, tableSortDirection)}
                    </div>
                  </th>
                  <th
                    className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                    onClick={() =>
                      handleTableSort(
                        "l15",
                        tableSortKey === "l15" && tableSortDirection === "asc"
                          ? "desc"
                          : "asc"
                      )
                    }
                    style={{ width: COLUMN_WIDTHS_STANDALONE.l15 }}
                  >
                    <div className="flex items-center">
                      L15
                      {getSortIcon("l15", tableSortKey, tableSortDirection)}
                    </div>
                  </th>
                  <th
                    className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                    onClick={() =>
                      handleTableSort(
                        "l40",
                        tableSortKey === "l40" && tableSortDirection === "asc"
                          ? "desc"
                          : "asc"
                      )
                    }
                    style={{ width: COLUMN_WIDTHS_STANDALONE.l40 }}
                  >
                    <div className="flex items-center">
                      L40
                      {getSortIcon("l40", tableSortKey, tableSortDirection)}
                    </div>
                  </th>
                </tr>
              </thead>
            </table>
          </div>
        )}
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
            columnWidths={COLUMN_WIDTHS_STANDALONE}
            emptyMessage="Nessuna carta trovata con i filtri selezionati"
            onSort={handleTableSort}
            showHeader={false}
            sortDirection={tableSortDirection}
            sortKey={tableSortKey}
          />
        )}
      </div>
    </div>
  );
}
