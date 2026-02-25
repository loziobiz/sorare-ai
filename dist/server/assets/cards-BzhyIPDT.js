import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { C as Card, a as CardContent, I as Input } from "./input-DXlO4Tx1.js";
import { S as SorareCard, c as getPositionLabel, C as Checkbox, f as formatLastUpdate, e as extractLeagues, d as filterAndSortCards, V as ViewToggle, h as COLUMN_WIDTHS_STANDALONE, g as getSortIcon, b as CardsList } from "./checkbox-nP2YJIRg.js";
import { Search, RefreshCw, Trash2, LogOut } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { B as Button, A as Alert, b as AlertDescription } from "./button-C7-Yro-a.js";
import { l as logout } from "./auth-server-BVOMZ7KW.js";
import { L as LoadingSpinner, S as SiteNav, P as PageLayout } from "./sorare-api-CM3Hu48J.js";
import { u as useCards } from "./use-cards-Drwfv-7M.js";
import "@radix-ui/react-checkbox";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "../server.js";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core";
import "node:async_hooks";
import "@tanstack/router-core/ssr/server";
import "h3-v2";
import "tiny-invariant";
import "seroval";
import "@tanstack/react-router/ssr/server";
import "dexie";
const DEFAULT_COLUMNS = {
  mobile: 1,
  md: 4,
  lg: 5
};
function CardsGrid({
  cards,
  columns = DEFAULT_COLUMNS,
  showEmptyMessage = true,
  emptyMessage,
  showCardPositions = true,
  showCardAverages = true
}) {
  if (cards.length === 0 && showEmptyMessage) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground", children: emptyMessage ?? "No cards found" }) });
  }
  const getGridClasses = () => {
    const classes = ["grid", "grid-cols-1", "gap-4"];
    if (columns.md === 2) {
      classes.push("md:grid-cols-2");
    } else if (columns.md === 3) {
      classes.push("md:grid-cols-3");
    } else if (columns.md === 4) {
      classes.push("md:grid-cols-4");
    } else if (columns.md === 5) {
      classes.push("md:grid-cols-5");
    } else if (columns.md === 6) {
      classes.push("md:grid-cols-6");
    }
    if (columns.lg === 2) {
      classes.push("lg:grid-cols-2");
    } else if (columns.lg === 3) {
      classes.push("lg:grid-cols-3");
    } else if (columns.lg === 4) {
      classes.push("lg:grid-cols-4");
    } else if (columns.lg === 5) {
      classes.push("lg:grid-cols-5");
    } else if (columns.lg === 6) {
      classes.push("lg:grid-cols-6");
    }
    return classes.join(" ");
  };
  const gridClasses = getGridClasses();
  return /* @__PURE__ */ jsx("div", { className: gridClasses, children: cards.map((card) => /* @__PURE__ */ jsx(
    SorareCard,
    {
      card,
      showAverages: showCardAverages,
      showPositions: showCardPositions
    },
    card.slug
  )) });
}
const SELECT_CLASS = "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
function CardsFilters({
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
  onSearchQueryChange
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [
    /* @__PURE__ */ jsx(RaritySelect, { onChange: onRarityChange, value: rarity }),
    /* @__PURE__ */ jsx(PositionSelect, { onChange: onPositionChange, value: position }),
    /* @__PURE__ */ jsx(
      LeagueSelect,
      {
        leagues,
        onChange: onLeagueChange,
        value: league
      }
    ),
    /* @__PURE__ */ jsx(SortSelect, { onChange: onSortChange, value: sortBy }),
    /* @__PURE__ */ jsx(SealedSelect, { onChange: onSealedChange, value: sealed }),
    /* @__PURE__ */ jsx(InSeasonCheckbox, { checked: inSeasonOnly, onChange: onInSeasonChange }),
    /* @__PURE__ */ jsx(SearchInput, { onChange: onSearchQueryChange, value: searchQuery })
  ] });
}
function RaritySelect({ value, onChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx("label", { className: "font-medium text-sm", htmlFor: "rarity-filter", children: "Rarità:" }),
    /* @__PURE__ */ jsxs(
      "select",
      {
        className: SELECT_CLASS,
        id: "rarity-filter",
        onChange: (e) => onChange(e.target.value),
        value,
        children: [
          /* @__PURE__ */ jsx("option", { value: "all", children: "Tutte" }),
          /* @__PURE__ */ jsx("option", { value: "limited", children: "Limited" }),
          /* @__PURE__ */ jsx("option", { value: "rare", children: "Rare" })
        ]
      }
    )
  ] });
}
function PositionSelect({ value, onChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx("label", { className: "font-medium text-sm", htmlFor: "position-filter", children: "Ruolo:" }),
    /* @__PURE__ */ jsxs(
      "select",
      {
        className: SELECT_CLASS,
        id: "position-filter",
        onChange: (e) => onChange(e.target.value),
        value,
        children: [
          /* @__PURE__ */ jsx("option", { value: "all", children: "Tutti" }),
          /* @__PURE__ */ jsx("option", { value: "Goalkeeper", children: getPositionLabel("Goalkeeper") }),
          /* @__PURE__ */ jsx("option", { value: "Defender", children: getPositionLabel("Defender") }),
          /* @__PURE__ */ jsx("option", { value: "Midfielder", children: getPositionLabel("Midfielder") }),
          /* @__PURE__ */ jsx("option", { value: "Forward", children: getPositionLabel("Forward") })
        ]
      }
    )
  ] });
}
function LeagueSelect({ value, leagues, onChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx("label", { className: "font-medium text-sm", htmlFor: "league-filter", children: "Lega:" }),
    /* @__PURE__ */ jsxs(
      "select",
      {
        className: SELECT_CLASS,
        id: "league-filter",
        onChange: (e) => onChange(e.target.value),
        value,
        children: [
          /* @__PURE__ */ jsx("option", { value: "all", children: "Tutte" }),
          leagues.map((leagueOption) => /* @__PURE__ */ jsx("option", { value: leagueOption.value, children: leagueOption.label }, leagueOption.value))
        ]
      }
    )
  ] });
}
function SortSelect({ value, onChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx("label", { className: "font-medium text-sm", htmlFor: "sort-by", children: "Ordina per:" }),
    /* @__PURE__ */ jsxs(
      "select",
      {
        className: SELECT_CLASS,
        id: "sort-by",
        onChange: (e) => onChange(e.target.value),
        value,
        children: [
          /* @__PURE__ */ jsx("option", { value: "name", children: "Nome" }),
          /* @__PURE__ */ jsx("option", { value: "team", children: "Squadra" }),
          /* @__PURE__ */ jsx("option", { value: "l5", children: "Media L5" }),
          /* @__PURE__ */ jsx("option", { value: "l15", children: "Media L15" }),
          /* @__PURE__ */ jsx("option", { value: "l40", children: "Media L40" })
        ]
      }
    )
  ] });
}
function InSeasonCheckbox({ checked, onChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx(
      Checkbox,
      {
        checked,
        id: "in-season-filter",
        onCheckedChange: (value) => onChange(value === true)
      }
    ),
    /* @__PURE__ */ jsx(
      "label",
      {
        className: "cursor-pointer font-medium text-sm",
        htmlFor: "in-season-filter",
        children: "In-Season"
      }
    )
  ] });
}
function SealedSelect({ value, onChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx("label", { className: "font-medium text-sm", htmlFor: "sealed-filter", children: "Stato:" }),
    /* @__PURE__ */ jsxs(
      "select",
      {
        className: SELECT_CLASS,
        id: "sealed-filter",
        onChange: (e) => onChange(e.target.value),
        value,
        children: [
          /* @__PURE__ */ jsx("option", { value: "unsealed", children: "Libere" }),
          /* @__PURE__ */ jsx("option", { value: "sealed", children: "Cassaforte" }),
          /* @__PURE__ */ jsx("option", { value: "all", children: "Tutte" })
        ]
      }
    )
  ] });
}
function SearchInput({ value, onChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "relative min-w-[200px] flex-1", children: [
    /* @__PURE__ */ jsx(Search, { className: "absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" }),
    /* @__PURE__ */ jsx(
      Input,
      {
        className: "h-9 pl-10",
        onChange: (e) => onChange(e.target.value),
        placeholder: "Cerca giocatore o squadra...",
        value
      }
    )
  ] });
}
function DashboardHeader({
  userSlug,
  lastUpdate,
  isLoading,
  isRefreshing,
  onRefresh,
  onClearCache
}) {
  const router = useRouter();
  const handleLogout = async () => {
    await logout();
    router.navigate({ to: "/" });
  };
  const isDisabled = isRefreshing || isLoading;
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "font-bold text-3xl", children: "Sorare AI Dashboard" }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
        userSlug && `Benvenuto, ${userSlug}`,
        lastUpdate && /* @__PURE__ */ jsxs("span", { className: "ml-2 text-sm", children: [
          "· Updated ",
          formatLastUpdate(lastUpdate)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxs(Button, { disabled: isDisabled, onClick: onRefresh, variant: "outline", children: [
        /* @__PURE__ */ jsx(
          RefreshCw,
          {
            className: `mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`
          }
        ),
        "Aggiorna carte"
      ] }),
      /* @__PURE__ */ jsxs(Button, { disabled: isDisabled, onClick: onClearCache, variant: "outline", children: [
        /* @__PURE__ */ jsx(Trash2, { className: "mr-2 h-4 w-4" }),
        "Pulisci cache"
      ] }),
      /* @__PURE__ */ jsxs(Button, { onClick: handleLogout, variant: "outline", children: [
        /* @__PURE__ */ jsx(LogOut, { className: "mr-2 h-4 w-4" }),
        "Logout"
      ] })
    ] })
  ] });
}
function useCardFilters(cards) {
  const [rarity, setRarity] = useState("all");
  const [position, setPosition] = useState("all");
  const [league, setLeague] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [inSeasonOnly, setInSeasonOnly] = useState(false);
  const [sealed, setSealed] = useState("unsealed");
  const [searchQuery, setSearchQuery] = useState("");
  const filters = useMemo(
    () => ({
      rarity,
      position,
      league,
      sortBy,
      inSeasonOnly,
      sealed,
      searchQuery
    }),
    [rarity, position, league, sortBy, inSeasonOnly, sealed, searchQuery]
  );
  const leagues = useMemo(() => extractLeagues(cards), [cards]);
  const filteredCards = useMemo(
    () => filterAndSortCards(cards, filters),
    [cards, filters]
  );
  return {
    filters,
    setRarity,
    setPosition,
    setLeague,
    setSortBy,
    setInSeasonOnly,
    setSealed,
    setSearchQuery,
    leagues,
    filteredCards
  };
}
function CardsDashboard() {
  const [viewMode, setViewMode] = useState("list");
  const [tableSortKey, setTableSortKey] = useState("name");
  const [tableSortDirection, setTableSortDirection] = useState("asc");
  const {
    cards,
    userSlug,
    isLoading,
    isRefreshing,
    error,
    loadingProgress,
    lastUpdate,
    refresh,
    clearCache
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
    filteredCards
  } = useCardFilters(cards);
  const handleTableSort = (key, direction) => {
    setTableSortKey(key);
    setTableSortDirection(direction);
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsx(LoadingSpinner, { icon: "loader", message: loadingProgress }) });
  }
  if (isRefreshing) {
    return /* @__PURE__ */ jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsx(LoadingSpinner, { icon: "refresh", message: loadingProgress }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex h-[calc(100vh-2rem)] flex-col", children: [
    /* @__PURE__ */ jsxs("div", { className: "sticky top-0 z-20 bg-white pb-2", children: [
      /* @__PURE__ */ jsx(SiteNav, {}),
      /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(
        DashboardHeader,
        {
          isLoading,
          isRefreshing,
          lastUpdate,
          onClearCache: clearCache,
          onRefresh: refresh,
          userSlug
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(
        CardsFilters,
        {
          inSeasonOnly: filters.inSeasonOnly,
          league: filters.league,
          leagues,
          onInSeasonChange: setInSeasonOnly,
          onLeagueChange: setLeague,
          onPositionChange: setPosition,
          onRarityChange: setRarity,
          onSealedChange: setSealed,
          onSearchQueryChange: setSearchQuery,
          onSortChange: setSortBy,
          position: filters.position,
          rarity: filters.rarity,
          sealed: filters.sealed,
          searchQuery: filters.searchQuery,
          sortBy: filters.sortBy
        }
      ) }),
      error && /* @__PURE__ */ jsx(Alert, { className: "mt-4", variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("h2", { className: "font-bold text-2xl", children: [
          "Your Cards (",
          filteredCards.length,
          ")"
        ] }),
        /* @__PURE__ */ jsx(ViewToggle, { onViewModeChange: setViewMode, viewMode })
      ] }),
      viewMode === "list" && /* @__PURE__ */ jsx("div", { className: "mt-4 rounded-t-md border border-b-0 bg-white", children: /* @__PURE__ */ jsx("table", { className: "w-full table-fixed text-sm", children: /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b", children: [
        /* @__PURE__ */ jsx(
          "th",
          {
            className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
            onClick: () => handleTableSort(
              "name",
              tableSortKey === "name" && tableSortDirection === "asc" ? "desc" : "asc"
            ),
            style: { width: COLUMN_WIDTHS_STANDALONE.name },
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
              "Giocatore",
              getSortIcon("name", tableSortKey, tableSortDirection)
            ] })
          }
        ),
        /* @__PURE__ */ jsx(
          "th",
          {
            className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
            onClick: () => handleTableSort(
              "team",
              tableSortKey === "team" && tableSortDirection === "asc" ? "desc" : "asc"
            ),
            style: { width: COLUMN_WIDTHS_STANDALONE.team },
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
              "Squadra",
              getSortIcon("team", tableSortKey, tableSortDirection)
            ] })
          }
        ),
        /* @__PURE__ */ jsx(
          "th",
          {
            className: "h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground",
            style: { width: COLUMN_WIDTHS_STANDALONE.forma },
            children: /* @__PURE__ */ jsx("div", { className: "flex items-center", children: "Forma" })
          }
        ),
        /* @__PURE__ */ jsx(
          "th",
          {
            className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
            onClick: () => handleTableSort(
              "l5",
              tableSortKey === "l5" && tableSortDirection === "asc" ? "desc" : "asc"
            ),
            style: { width: COLUMN_WIDTHS_STANDALONE.l5 },
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
              "L5",
              getSortIcon("l5", tableSortKey, tableSortDirection)
            ] })
          }
        ),
        /* @__PURE__ */ jsx(
          "th",
          {
            className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
            onClick: () => handleTableSort(
              "l15",
              tableSortKey === "l15" && tableSortDirection === "asc" ? "desc" : "asc"
            ),
            style: { width: COLUMN_WIDTHS_STANDALONE.l15 },
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
              "L15",
              getSortIcon("l15", tableSortKey, tableSortDirection)
            ] })
          }
        ),
        /* @__PURE__ */ jsx(
          "th",
          {
            className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
            onClick: () => handleTableSort(
              "l40",
              tableSortKey === "l40" && tableSortDirection === "asc" ? "desc" : "asc"
            ),
            style: { width: COLUMN_WIDTHS_STANDALONE.l40 },
            children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
              "L40",
              getSortIcon("l40", tableSortKey, tableSortDirection)
            ] })
          }
        )
      ] }) }) }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: viewMode === "grid" ? /* @__PURE__ */ jsx(
      CardsGrid,
      {
        cards: filteredCards,
        columns: { lg: 5, md: 4, mobile: 1 },
        emptyMessage: "Nessuna carta trovata con i filtri selezionati",
        showCardAverages: true,
        showCardPositions: false
      }
    ) : /* @__PURE__ */ jsx(
      CardsList,
      {
        cards: filteredCards,
        columnWidths: COLUMN_WIDTHS_STANDALONE,
        emptyMessage: "Nessuna carta trovata con i filtri selezionati",
        onSort: handleTableSort,
        showHeader: false,
        sortDirection: tableSortDirection,
        sortKey: tableSortKey
      }
    ) })
  ] });
}
function CardsPage() {
  return /* @__PURE__ */ jsx(PageLayout, { containerSize: "default", showNav: true, children: /* @__PURE__ */ jsx(CardsDashboard, {}) });
}
export {
  CardsPage as component
};
