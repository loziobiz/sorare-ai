"use client";

import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  getPositionLabel,
  type LeagueOption,
  type PositionFilter,
  type RarityFilter,
  type SealedFilter,
  type SortOption,
} from "@/lib/cards-utils";

interface CardsFiltersProps {
  rarity: RarityFilter;
  position: PositionFilter;
  league: string;
  sortBy: SortOption;
  inSeasonOnly: boolean;
  sealed: SealedFilter;
  searchQuery: string;
  leagues: LeagueOption[];
  onRarityChange: (rarity: RarityFilter) => void;
  onPositionChange: (position: PositionFilter) => void;
  onLeagueChange: (league: string) => void;
  onSortChange: (sortBy: SortOption) => void;
  onInSeasonChange: (inSeasonOnly: boolean) => void;
  onSealedChange: (sealed: SealedFilter) => void;
  onSearchQueryChange: (searchQuery: string) => void;
}

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CardsFilters({
  rarity,
  position,
  league,
  sortBy,
  inSeasonOnly,
  sealed,
  searchQuery,
  leagues,
  onRarityChange,
  onPositionChange,
  onLeagueChange,
  onSortChange,
  onInSeasonChange,
  onSealedChange,
  onSearchQueryChange,
}: CardsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <RaritySelect onChange={onRarityChange} value={rarity} />
      <PositionSelect onChange={onPositionChange} value={position} />
      <LeagueSelect
        leagues={leagues}
        onChange={onLeagueChange}
        value={league}
      />
      <SortSelect onChange={onSortChange} value={sortBy} />
      <SealedSelect onChange={onSealedChange} value={sealed} />
      <InSeasonCheckbox checked={inSeasonOnly} onChange={onInSeasonChange} />
      <SearchInput onChange={onSearchQueryChange} value={searchQuery} />
    </div>
  );
}

interface RaritySelectProps {
  value: RarityFilter;
  onChange: (value: RarityFilter) => void;
}

function RaritySelect({ value, onChange }: RaritySelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-sm" htmlFor="rarity-filter">
        Rarità:
      </label>
      <select
        className={SELECT_CLASS}
        id="rarity-filter"
        onChange={(e) => onChange(e.target.value as RarityFilter)}
        value={value}
      >
        <option value="all">Tutte</option>
        <option value="limited">Limited</option>
        <option value="rare">Rare</option>
      </select>
    </div>
  );
}

interface PositionSelectProps {
  value: PositionFilter;
  onChange: (value: PositionFilter) => void;
}

function PositionSelect({ value, onChange }: PositionSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-sm" htmlFor="position-filter">
        Ruolo:
      </label>
      <select
        className={SELECT_CLASS}
        id="position-filter"
        onChange={(e) => onChange(e.target.value as PositionFilter)}
        value={value}
      >
        <option value="all">Tutti</option>
        <option value="Goalkeeper">{getPositionLabel("Goalkeeper")}</option>
        <option value="Defender">{getPositionLabel("Defender")}</option>
        <option value="Midfielder">{getPositionLabel("Midfielder")}</option>
        <option value="Forward">{getPositionLabel("Forward")}</option>
      </select>
    </div>
  );
}

interface LeagueSelectProps {
  value: string;
  leagues: LeagueOption[];
  onChange: (value: string) => void;
}

function LeagueSelect({ value, leagues, onChange }: LeagueSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-sm" htmlFor="league-filter">
        Lega:
      </label>
      <select
        className={SELECT_CLASS}
        id="league-filter"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        <option value="all">Tutte</option>
        {leagues.map((leagueOption) => (
          <option key={leagueOption.value} value={leagueOption.value}>
            {leagueOption.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-sm" htmlFor="sort-by">
        Ordina per:
      </label>
      <select
        className={SELECT_CLASS}
        id="sort-by"
        onChange={(e) => onChange(e.target.value as SortOption)}
        value={value}
      >
        <option value="name">Nome</option>
        <option value="team">Squadra</option>
        <option value="l5">Media L5</option>
        <option value="l15">Media L15</option>
        <option value="l40">Media L40</option>
      </select>
    </div>
  );
}

interface InSeasonCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function InSeasonCheckbox({ checked, onChange }: InSeasonCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        id="in-season-filter"
        onCheckedChange={(value) => onChange(value === true)}
      />
      <label
        className="cursor-pointer font-medium text-sm"
        htmlFor="in-season-filter"
      >
        In-Season
      </label>
    </div>
  );
}

interface SealedSelectProps {
  value: SealedFilter;
  onChange: (value: SealedFilter) => void;
}

function SealedSelect({ value, onChange }: SealedSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-sm" htmlFor="sealed-filter">
        Stato:
      </label>
      <select
        className={SELECT_CLASS}
        id="sealed-filter"
        onChange={(e) => onChange(e.target.value as SealedFilter)}
        value={value}
      >
        <option value="unsealed">Libere</option>
        <option value="sealed">Cassaforte</option>
        <option value="all">Tutte</option>
      </select>
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        className="h-9 pl-10"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cerca giocatore o squadra..."
        value={value}
      />
    </div>
  );
}
