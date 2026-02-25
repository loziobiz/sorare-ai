import { jsx, jsxs } from "react/jsx-runtime";
import { C as Card, a as CardContent } from "./input-DXlO4Tx1.js";
import { ArrowUpDown, ArrowUp, ArrowDown, Grid, List, Check } from "lucide-react";
import * as React from "react";
import { useState, useMemo } from "react";
import { d as cn, B as Button } from "./button-C7-Yro-a.js";
import { A as ACTIVE_LEAGUES, a as ETH_TO_EUR_RATE } from "./sorare-api-CM3Hu48J.js";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
function CardImage({ src, alt }) {
  return /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx(
    "img",
    {
      alt,
      className: "h-auto max-w-[200px] rounded-lg",
      height: 200,
      loading: "lazy",
      src,
      width: 200
    }
  ) });
}
function SorareCard({
  card,
  showPositions = true,
  showAverages = true
}) {
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-3", children: [
    card.pictureUrl && /* @__PURE__ */ jsx(CardImage, { alt: card.name, src: card.pictureUrl }),
    showPositions && card.anyPositions && card.anyPositions.length > 0 && /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
      /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Position:" }),
      " ",
      card.anyPositions.join(", ")
    ] }),
    showAverages && /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-4 gap-2 text-center text-xs", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "L5" }),
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.l5Average?.toFixed(1) ?? "-" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "L15" }),
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.l15Average?.toFixed(1) ?? "-" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "L40" }),
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.l40Average?.toFixed(1) ?? "-" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "XP" }),
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.power ? Math.round((Number.parseFloat(card.power) - 1) * 100) : "-" })
      ] })
    ] }),
    card.anyPlayer?.activeClub && /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-xs", children: [
      /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.anyPlayer.activeClub.name }),
      card.anyPlayer.activeClub.activeCompetitions && card.anyPlayer.activeClub.activeCompetitions.length > 0 && /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: (() => {
        const league = card.anyPlayer.activeClub.activeCompetitions.find(
          (c) => c.format === "DOMESTIC_LEAGUE"
        );
        return league?.name ?? card.anyPlayer.activeClub.activeCompetitions[0]?.name;
      })() })
    ] })
  ] }) });
}
function Table({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "relative w-full overflow-x-auto",
      "data-slot": "table-container",
      children: /* @__PURE__ */ jsx(
        "table",
        {
          className: cn("w-full caption-bottom text-sm", className),
          "data-slot": "table",
          ...props
        }
      )
    }
  );
}
function TableBody({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "tbody",
    {
      className: cn("[&_tr:last-child]:border-0", className),
      "data-slot": "table-body",
      ...props
    }
  );
}
function TableRow({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "tr",
    {
      className: cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      ),
      "data-slot": "table-row",
      ...props
    }
  );
}
function TableCell({ className, ...props }) {
  return /* @__PURE__ */ jsx(
    "td",
    {
      className: cn(
        "whitespace-nowrap p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      ),
      "data-slot": "table-cell",
      ...props
    }
  );
}
function formatLastUpdate(date) {
  const now = /* @__PURE__ */ new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 6e4);
  const hours = Math.floor(diff / 36e5);
  const days = Math.floor(diff / 864e5);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${days}d ago`;
}
function getPositionLabel(position) {
  const labels = {
    Goalkeeper: "POR",
    Defender: "DIF",
    Midfielder: "CEN",
    Forward: "ATT"
  };
  return labels[position] ?? position;
}
function extractLeagues(cards) {
  const leagueMap = /* @__PURE__ */ new Map();
  for (const card of cards) {
    const competitions = card.anyPlayer?.activeClub?.activeCompetitions ?? [];
    for (const competition of competitions) {
      if (competition.format !== "DOMESTIC_LEAGUE" || !competition.country) {
        continue;
      }
      const uniqueKey = `${competition.name}|${competition.country.code}`;
      const isAllowed = Object.hasOwn(ACTIVE_LEAGUES, uniqueKey);
      if (isAllowed && !leagueMap.has(uniqueKey)) {
        const displayName = ACTIVE_LEAGUES[uniqueKey] ?? uniqueKey;
        leagueMap.set(uniqueKey, displayName);
      }
    }
  }
  return Array.from(leagueMap.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
function filterByRarity(cards, rarity) {
  if (rarity === "all") {
    return cards;
  }
  return cards.filter((card) => card.rarityTyped.toLowerCase() === rarity);
}
function filterByPosition(cards, position) {
  if (position === "all") {
    return cards;
  }
  return cards.filter((card) => card.anyPositions?.includes(position));
}
function filterByLeague(cards, leagueFilter) {
  if (leagueFilter === "all") {
    return cards;
  }
  const [leagueName, countryCode] = leagueFilter.split("|");
  return cards.filter(
    (card) => card.anyPlayer?.activeClub?.activeCompetitions?.some(
      (c) => c.format === "DOMESTIC_LEAGUE" && c.name === leagueName && c.country?.code === countryCode
    )
  );
}
function filterByInSeason(cards, inSeasonOnly) {
  if (!inSeasonOnly) {
    return cards;
  }
  return cards.filter((card) => card.inSeasonEligible === true);
}
function filterBySealed(cards, sealed) {
  if (sealed === "all") {
    return cards;
  }
  return cards.filter((card) => card.sealed === (sealed === "sealed"));
}
function filterBySearch(cards, searchQuery) {
  if (!searchQuery.trim()) {
    return cards;
  }
  const query = searchQuery.toLowerCase().trim();
  return cards.filter(
    (card) => card.name.toLowerCase().includes(query) || card.anyPlayer?.activeClub?.name?.toLowerCase().includes(query)
  );
}
function sortCards(cards, sortBy) {
  return [...cards].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "team":
        return (a.anyPlayer?.activeClub?.name ?? "").localeCompare(
          b.anyPlayer?.activeClub?.name ?? ""
        );
      case "l5":
        return (b.l5Average ?? 0) - (a.l5Average ?? 0);
      case "l10":
        return (b.l10Average ?? 0) - (a.l10Average ?? 0);
      case "l15":
        return (b.l15Average ?? 0) - (a.l15Average ?? 0);
      case "l40":
        return (b.l40Average ?? 0) - (a.l40Average ?? 0);
      default:
        return 0;
    }
  });
}
function filterAndSortCards(cards, filters) {
  let result = filterByRarity(cards, filters.rarity);
  result = filterByPosition(result, filters.position);
  result = filterByLeague(result, filters.league);
  result = filterByInSeason(result, filters.inSeasonOnly);
  result = filterBySealed(result, filters.sealed);
  result = filterBySearch(result, filters.searchQuery);
  return sortCards(result, filters.sortBy);
}
function CardThumbnail({ src, alt, size = 60 }) {
  const [imageError, setImageError] = useState(false);
  if (imageError || !src) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: "flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500",
        style: { width: size, height: size },
        children: /* @__PURE__ */ jsx("span", { className: "font-medium text-xs", children: "N/A" })
      }
    );
  }
  return /* @__PURE__ */ jsx("div", { className: "relative shrink-0", style: { width: size, height: size }, children: /* @__PURE__ */ jsx(
    "img",
    {
      alt,
      className: "absolute inset-0 rounded-full object-cover",
      height: size,
      loading: "lazy",
      onError: () => setImageError(true),
      src,
      style: {
        objectPosition: "50% 16.67%",
        width: size,
        height: size
      },
      width: size
    }
  ) });
}
const COLUMN_WIDTHS = {
  name: 230,
  team: 250,
  forma: 100,
  l5: 50,
  l15: 50,
  l40: 50
};
const COLUMN_WIDTHS_STANDALONE = {
  name: 200,
  team: 300,
  forma: 90,
  price: 400,
  l5: 50,
  l15: 50,
  l40: 50
};
const PLAYER_NAME_REGEX = /^(.+?)\s+\d{4}-\d{2}/;
function getPlayerName(card) {
  const name = card.name;
  const match = name.match(PLAYER_NAME_REGEX);
  return match ? match[1] : name;
}
function getLeagueName(card) {
  if (!card.anyPlayer?.activeClub?.activeCompetitions) {
    return "-";
  }
  const league = card.anyPlayer.activeClub.activeCompetitions.find(
    (c) => c.format === "DOMESTIC_LEAGUE"
  );
  return league?.name ?? card.anyPlayer.activeClub.activeCompetitions[0]?.name ?? "-";
}
function getTeamName(card) {
  return card.anyPlayer?.activeClub?.name ?? "-";
}
function getXP(card) {
  if (!card.power) {
    return 0;
  }
  return Math.round((Number.parseFloat(card.power) - 1) * 100);
}
function formatPriceValue(valueInCents) {
  if (valueInCents === null || valueInCents === void 0) {
    return "-";
  }
  return `€${(valueInCents / 100).toFixed(2)}`;
}
function convertWeiToEur(weiString) {
  if (!weiString) {
    return null;
  }
  const weiValue = Number.parseFloat(weiString);
  if (Number.isNaN(weiValue) || weiValue === 0) {
    return null;
  }
  const ethValue = weiValue / 1e18;
  const eurCents = Math.round(ethValue * ETH_TO_EUR_RATE * 100);
  return eurCents;
}
function getPriceDisplay(card) {
  const parts = [];
  const marketPriceCents = convertWeiToEur(card.priceRange?.min);
  parts.push(formatPriceValue(marketPriceCents));
  const purchaseTypes = [
    "INSTANT_BUY",
    "ENGLISH_AUCTION",
    "SINGLE_BUY_OFFER",
    "SINGLE_SALE_OFFER",
    "DIRECT_OFFER"
  ];
  let purchasePrice = null;
  if (card.ownershipHistory && card.ownershipHistory.length > 0) {
    for (let i = card.ownershipHistory.length - 1; i >= 0; i--) {
      const entry = card.ownershipHistory[i];
      if (entry && purchaseTypes.includes(entry.transferType) && entry.amounts?.eurCents) {
        purchasePrice = entry.amounts.eurCents;
        break;
      }
    }
  }
  parts.push(formatPriceValue(purchasePrice));
  return parts.join(" | ");
}
function getScoreColor(score) {
  if (score === 0) {
    return "#9ca3af";
  }
  if (score <= 30) {
    return "#ef4444";
  }
  if (score <= 40) {
    return "#f97316";
  }
  if (score <= 59) {
    return "#84cc16";
  }
  if (score <= 79) {
    return "#22c55e";
  }
  return "#22d3ee";
}
function ScoreHistogram({ scores }) {
  const lastScores = [...scores].slice(-10);
  const displayScores = [];
  const missingCount = 10 - lastScores.length;
  for (let i = 0; i < missingCount; i++) {
    displayScores.push({ score: 0, position: i });
  }
  lastScores.forEach((s, idx) => {
    displayScores.push({ score: s.score, position: missingCount + idx });
  });
  const maxScore = 100;
  const reversedScores = [...displayScores].reverse();
  return /* @__PURE__ */ jsx("div", { className: "flex h-[45px] w-[80px] items-end rounded bg-gray-100 p-1", children: reversedScores.map((item) => {
    const heightPercent = item.score / maxScore * 100;
    const height = item.score === 0 ? "3px" : `${Math.max(heightPercent, 4)}%`;
    return /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          width: "7px",
          height,
          backgroundColor: getScoreColor(item.score)
        }
      },
      `bar-${item.position}`
    );
  }) });
}
function compareValues(a, b, direction) {
  if (a === b) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  let comparison = 0;
  if (typeof a === "string" && typeof b === "string") {
    comparison = a.localeCompare(b);
  } else if (typeof a === "number" && typeof b === "number") {
    comparison = a - b;
  } else {
    comparison = String(a).localeCompare(String(b));
  }
  return direction === "asc" ? comparison : -comparison;
}
function getSortIcon(columnKey, currentSortKey, currentSortDirection) {
  if (currentSortKey !== columnKey) {
    return /* @__PURE__ */ jsx(ArrowUpDown, { className: "ml-1 inline-block h-4 w-4" });
  }
  return currentSortDirection === "asc" ? /* @__PURE__ */ jsx(ArrowUp, { className: "ml-1 inline-block h-4 w-4" }) : /* @__PURE__ */ jsx(ArrowDown, { className: "ml-1 inline-block h-4 w-4" });
}
function CardsList({
  cards,
  showEmptyMessage = true,
  emptyMessage,
  onCardClick,
  disabled = false,
  showHeader = true,
  sortKey: externalSortKey,
  sortDirection: externalSortDirection,
  onSort,
  columnWidths = COLUMN_WIDTHS
}) {
  const [internalSortKey, setInternalSortKey] = useState("name");
  const [internalSortDirection, setInternalSortDirection] = useState("asc");
  const sortKey = externalSortKey ?? internalSortKey;
  const sortDirection = externalSortDirection ?? internalSortDirection;
  const widths = columnWidths;
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return compareValues(
            getPlayerName(a),
            getPlayerName(b),
            sortDirection
          );
        case "team":
          return compareValues(getTeamName(a), getTeamName(b), sortDirection);
        case "l5":
          return compareValues(
            a.l5Average ?? 0,
            b.l5Average ?? 0,
            sortDirection
          );
        case "l15":
          return compareValues(
            a.l15Average ?? 0,
            b.l15Average ?? 0,
            sortDirection
          );
        case "l40":
          return compareValues(
            a.l40Average ?? 0,
            b.l40Average ?? 0,
            sortDirection
          );
        default:
          return 0;
      }
    });
  }, [cards, sortKey, sortDirection]);
  const handleSort = (key) => {
    let newDirection = "asc";
    if (sortKey === key) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }
    if (onSort) {
      onSort(key, newDirection);
    } else {
      setInternalSortKey(key);
      setInternalSortDirection(newDirection);
    }
  };
  const renderSortIcon = (columnKey) => {
    return getSortIcon(columnKey, sortKey, sortDirection);
  };
  if (cards.length === 0 && showEmptyMessage) {
    return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground", children: emptyMessage ?? "No cards found" }) });
  }
  return /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-md border", children: /* @__PURE__ */ jsxs(Table, { className: "table-fixed", children: [
    showHeader && /* @__PURE__ */ jsx("thead", { className: "sticky top-0 z-10 bg-white shadow-sm [&_tr]:border-b", children: /* @__PURE__ */ jsxs("tr", { className: "border-b transition-colors hover:bg-muted/50", children: [
      /* @__PURE__ */ jsx(
        "th",
        {
          className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
          onClick: () => handleSort("name"),
          style: { width: widths.name },
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            "Giocatore",
            renderSortIcon("name")
          ] })
        }
      ),
      /* @__PURE__ */ jsx(
        "th",
        {
          className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
          onClick: () => handleSort("team"),
          style: { width: widths.team },
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            "Squadra",
            renderSortIcon("team")
          ] })
        }
      ),
      widths.price && /* @__PURE__ */ jsx(
        "th",
        {
          className: "h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground",
          style: { width: widths.price }
        }
      ),
      /* @__PURE__ */ jsx(
        "th",
        {
          className: "h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground",
          style: { width: widths.forma },
          children: /* @__PURE__ */ jsx("div", { className: "flex items-center", children: "Forma" })
        }
      ),
      /* @__PURE__ */ jsx(
        "th",
        {
          className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
          onClick: () => handleSort("l5"),
          style: { width: widths.l5 },
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            "L5",
            renderSortIcon("l5")
          ] })
        }
      ),
      /* @__PURE__ */ jsx(
        "th",
        {
          className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
          onClick: () => handleSort("l15"),
          style: { width: widths.l15 },
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            "L15",
            renderSortIcon("l15")
          ] })
        }
      ),
      /* @__PURE__ */ jsx(
        "th",
        {
          className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
          onClick: () => handleSort("l40"),
          style: { width: widths.l40 },
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            "L40",
            renderSortIcon("l40")
          ] })
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx(TableBody, { children: sortedCards.map((card) => /* @__PURE__ */ jsxs(
      TableRow,
      {
        className: cn(
          onCardClick && !disabled && "cursor-pointer hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-50"
        ),
        onClick: () => {
          if (onCardClick && !disabled) {
            onCardClick(card);
          }
        },
        children: [
          /* @__PURE__ */ jsx(TableCell, { style: { width: widths.name }, children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            card.pictureUrl && /* @__PURE__ */ jsx(
              CardThumbnail,
              {
                alt: card.name,
                size: 48,
                src: card.pictureUrl
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
              /* @__PURE__ */ jsx("div", { className: "font-oswald-medium text-[14px] uppercase", children: getPlayerName(card) }),
              card.anyPositions && card.anyPositions.length > 0 && /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground text-xs", children: [
                card.anyPositions.map((pos) => getPositionLabel(pos)).join(", "),
                " • XP ",
                getXP(card) || "-",
                "%"
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(TableCell, { className: "truncate", style: { width: widths.team }, children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
            /* @__PURE__ */ jsx("div", { children: getTeamName(card) }),
            /* @__PURE__ */ jsx("div", { className: "text-muted-foreground text-xs", children: getLeagueName(card) })
          ] }) }),
          widths.price && /* @__PURE__ */ jsx(TableCell, { style: { width: widths.price }, children: /* @__PURE__ */ jsx("div", { className: "text-xs", children: getPriceDisplay(card) }) }),
          /* @__PURE__ */ jsx(TableCell, { style: { width: widths.forma }, children: /* @__PURE__ */ jsx(ScoreHistogram, { scores: card.so5Scores ?? [] }) }),
          /* @__PURE__ */ jsx(TableCell, { style: { width: widths.l5 }, children: /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.l5Average?.toFixed(0) ?? "-" }) }),
          /* @__PURE__ */ jsx(TableCell, { style: { width: widths.l15 }, children: /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.l15Average?.toFixed(0) ?? "-" }) }),
          /* @__PURE__ */ jsx(TableCell, { style: { width: widths.l40 }, children: /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.l40Average?.toFixed(0) ?? "-" }) })
        ]
      },
      card.slug
    )) })
  ] }) });
}
function ViewToggle({ viewMode, onViewModeChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
    /* @__PURE__ */ jsx(
      Button,
      {
        "aria-label": "Vista griglia",
        onClick: () => onViewModeChange("grid"),
        size: "icon-sm",
        title: "Vista griglia",
        variant: viewMode === "grid" ? "default" : "outline",
        children: /* @__PURE__ */ jsx(Grid, {})
      }
    ),
    /* @__PURE__ */ jsx(
      Button,
      {
        "aria-label": "Vista lista",
        onClick: () => onViewModeChange("list"),
        size: "icon-sm",
        title: "Vista lista",
        variant: viewMode === "list" ? "default" : "outline",
        children: /* @__PURE__ */ jsx(List, {})
      }
    )
  ] });
}
const Checkbox = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  CheckboxPrimitive.Root,
  {
    className: cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    ),
    ref,
    ...props,
    children: /* @__PURE__ */ jsx(
      CheckboxPrimitive.Indicator,
      {
        className: cn("flex items-center justify-center text-current"),
        children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" })
      }
    )
  }
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
export {
  Checkbox as C,
  SorareCard as S,
  ViewToggle as V,
  COLUMN_WIDTHS as a,
  CardsList as b,
  getPositionLabel as c,
  filterAndSortCards as d,
  extractLeagues as e,
  formatLastUpdate as f,
  getSortIcon as g,
  COLUMN_WIDTHS_STANDALONE as h
};
