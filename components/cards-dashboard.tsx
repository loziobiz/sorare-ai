"use client";

import { CardsGrid } from "@/components/cards/card-grid";
import { CardsFilters } from "@/components/cards/cards-filters";
import { DashboardHeader } from "@/components/cards/dashboard-header";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SiteNav } from "@/components/site-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCardFilters } from "@/hooks/use-card-filters";
import { useCards } from "@/hooks/use-cards";

export function CardsDashboard() {
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
    <div className="space-y-6">
      <SiteNav />

      <DashboardHeader
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        lastUpdate={lastUpdate}
        onClearCache={clearCache}
        onRefresh={refresh}
        userSlug={userSlug}
      />

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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h2 className="font-bold text-2xl">
          Your Cards ({filteredCards.length})
        </h2>
        <CardsGrid
          cards={filteredCards}
          columns={{ lg: 5, md: 4, mobile: 1 }}
          emptyMessage="Nessuna carta trovata con i filtri selezionati"
          showCardAverages
          showCardPositions={false}
        />
      </div>
    </div>
  );
}
