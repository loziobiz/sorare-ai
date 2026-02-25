import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { X, AlertCircle, XCircle, CheckCircle, Plus, Check, Search } from "lucide-react";
import { useRouter, useSearch } from "@tanstack/react-router";
import { V as ViewToggle, C as Checkbox, a as COLUMN_WIDTHS, g as getSortIcon, S as SorareCard, b as CardsList } from "./checkbox-CQ7xt4HU.js";
import { u as useCacheCleanup, d as db, D as DEFAULT_TTL, f as fetchAllCards, L as LoadingSpinner, S as SiteNav, A as ACTIVE_LEAGUES } from "./sorare-api-B0wH0OGg.js";
import { d as cn, B as Button, A as Alert, b as AlertDescription } from "./button-C7-Yro-a.js";
import { I as Input } from "./input-DXlO4Tx1.js";
import "@radix-ui/react-checkbox";
import "dexie";
import "./auth-server-BVOMZ7KW.js";
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
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
function Toast({
  message,
  type = "success",
  duration = 3e3,
  onClose
}) {
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };
  const icons = {
    success: /* @__PURE__ */ jsx(CheckCircle, { className: "h-5 w-5 text-green-500" }),
    error: /* @__PURE__ */ jsx(XCircle, { className: "h-5 w-5 text-red-500" }),
    info: /* @__PURE__ */ jsx(AlertCircle, { className: "h-5 w-5 text-blue-500" })
  };
  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200"
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300",
        bgColors[type],
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      ),
      children: [
        icons[type],
        /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-700 text-sm", children: message }),
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "text-slate-400 hover:text-slate-600",
            onClick: handleClose,
            type: "button",
            children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
          }
        )
      ]
    }
  );
}
function ToastContainer({ toasts, onRemove }) {
  return /* @__PURE__ */ jsx("div", { className: "fixed right-4 bottom-4 z-50 flex flex-col gap-2", children: toasts.map((toast) => /* @__PURE__ */ jsx(
    Toast,
    {
      message: toast.message,
      onClose: () => onRemove(toast.id),
      type: toast.type
    },
    toast.id
  )) });
}
let toastId = 0;
function showToast(setToasts, message, type = "success") {
  const id = `toast-${toastId++}`;
  setToasts((prev) => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 3e3);
}
function PitchSlot({ label, card, isActive, onClick }) {
  if (card) {
    return /* @__PURE__ */ jsxs(
      "button",
      {
        "aria-label": `Rimuovi ${card.name}`,
        className: "group relative transition-transform hover:scale-105",
        onClick,
        type: "button",
        children: [
          /* @__PURE__ */ jsx("div", { className: "absolute top-1 right-1 z-20 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4 text-white" }) }),
          card.pictureUrl ? /* @__PURE__ */ jsx(
            "img",
            {
              alt: card.name,
              className: "h-50 w-32 rounded-lg object-cover shadow-lg",
              height: 176,
              loading: "lazy",
              src: card.pictureUrl,
              width: 128
            }
          ) : /* @__PURE__ */ jsx("div", { className: "flex h-44 w-32 items-center justify-center rounded-lg bg-slate-700 font-bold text-white text-xl shadow-lg", children: card.name.charAt(0) })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsx(
    "button",
    {
      "aria-label": `Seleziona ${label}`,
      className: cn(
        "group flex flex-col items-center transition-transform hover:scale-105",
        isActive && "scale-105"
      ),
      onClick,
      type: "button",
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: cn(
            "flex h-44 w-32 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
            isActive ? "border-violet-400 bg-violet-500/20" : "border-white/40 bg-white/10 hover:border-white/60 hover:bg-white/20"
          ),
          children: [
            /* @__PURE__ */ jsx(
              "span",
              {
                className: cn(
                  "mb-2 font-semibold text-sm",
                  isActive ? "text-violet-200" : "text-white/70"
                ),
                children: label
              }
            ),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed transition-colors",
                  isActive ? "border-violet-300 text-violet-200" : "border-white/40 text-white/50 group-hover:border-white/60"
                ),
                children: /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" })
              }
            )
          ]
        }
      )
    }
  );
}
const POSITION_MAPPING = {
  ATT: ["Forward"],
  EX: ["Forward", "Midfielder", "Defender"],
  // Extra può essere qualsiasi posizione
  DIF: ["Defender"],
  CEN: ["Midfielder"],
  POR: ["Goalkeeper"]
};
const INITIAL_FORMATION = [
  { position: "ATT", card: null },
  { position: "EX", card: null },
  { position: "DIF", card: null },
  { position: "CEN", card: null },
  { position: "POR", card: null }
];
function getEmptyMessage(leagueFilter, activeSlot) {
  if (!leagueFilter) {
    return "Seleziona una lega per vedere le carte disponibili";
  }
  if (!activeSlot) {
    return "Seleziona uno slot per vedere le carte disponibili";
  }
  return "Nessuna carta disponibile per questa posizione";
}
function isLeagueAllowed(uniqueKey) {
  return Object.hasOwn(ACTIVE_LEAGUES, uniqueKey);
}
function getLeagueDisplayName(uniqueKey) {
  const customName = ACTIVE_LEAGUES[uniqueKey];
  return customName ?? uniqueKey;
}
function buildLeagueMap(cards) {
  const leagueMap = /* @__PURE__ */ new Map();
  for (const card of cards) {
    for (const competition of card.anyPlayer?.activeClub?.activeCompetitions ?? []) {
      if (competition.name === "NBA") {
        leagueMap.set("NBA", "NBA");
      } else if (competition.format === "DOMESTIC_LEAGUE" && competition.country) {
        const uniqueKey = `${competition.name}|${competition.country.code}`;
        if (isLeagueAllowed(uniqueKey)) {
          leagueMap.set(uniqueKey, getLeagueDisplayName(uniqueKey));
        }
      }
    }
  }
  return leagueMap;
}
function restoreFormationFromSlots(saved) {
  const newFormation = [...INITIAL_FORMATION];
  if (!saved.slots || saved.slots.length === 0) {
    return newFormation;
  }
  for (const slot of saved.slots) {
    const card = saved.cards.find((c) => c.slug === slot.cardSlug);
    if (card) {
      const slotIndex = newFormation.findIndex(
        (s) => s.position === slot.position
      );
      if (slotIndex !== -1) {
        newFormation[slotIndex] = {
          position: slot.position,
          card
        };
      }
    }
  }
  return newFormation;
}
function restoreFormationLegacy(saved) {
  const newFormation = [...INITIAL_FORMATION];
  for (const savedCard of saved.cards) {
    const position = getPositionForCard(savedCard);
    if (position) {
      const slotIndex = newFormation.findIndex((s) => s.position === position);
      if (slotIndex !== -1) {
        newFormation[slotIndex] = { position, card: savedCard };
      }
    }
  }
  return newFormation;
}
function loadSavedFormation(saved) {
  if (saved.slots && saved.slots.length > 0) {
    return restoreFormationFromSlots(saved);
  }
  return restoreFormationLegacy(saved);
}
function getPositionForCard(card) {
  if (!card.anyPositions || card.anyPositions.length === 0) {
    return null;
  }
  const position = card.anyPositions[0];
  if (position === "Goalkeeper") {
    return "POR";
  }
  if (position === "Defender") {
    return "DIF";
  }
  if (position === "Midfielder") {
    return "CEN";
  }
  if (position === "Forward") {
    return "ATT";
  }
  return null;
}
function LineupBuilder() {
  const router = useRouter();
  const search = useSearch({ from: "/lineup" });
  const searchParams = new URLSearchParams(search);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cards, setCards] = useState([]);
  const [formation, setFormation] = useState(INITIAL_FORMATION);
  const [activeSlot, setActiveSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("l5");
  const [inSeasonOnly, setInSeasonOnly] = useState(false);
  const [formationName, setFormationName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [tableSortKey, setTableSortKey] = useState("name");
  const [tableSortDirection, setTableSortDirection] = useState("asc");
  const [toasts, setToasts] = useState([]);
  const handleTableSort = (key, direction) => {
    setTableSortKey(key);
    setTableSortDirection(direction);
  };
  useCacheCleanup();
  const leagues = useMemo(() => {
    const leagueMap = buildLeagueMap(cards);
    return Array.from(leagueMap.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [cards]);
  const usedCardSlugs = useMemo(
    () => new Set(formation.filter((s) => s.card).map((s) => s.card?.slug)),
    [formation]
  );
  const filteredCards = useMemo(() => {
    let filtered = cards.filter((card) => !usedCardSlugs.has(card.slug));
    filtered = filtered.filter((card) => card.sealed !== true);
    if (leagueFilter) {
      const [leagueName, countryCode] = leagueFilter.split("|");
      filtered = filtered.filter(
        (card) => card.anyPlayer?.activeClub?.activeCompetitions?.some(
          (c) => c.format === "DOMESTIC_LEAGUE" && c.name === leagueName && c.country?.code === countryCode
        )
      );
    }
    if (rarityFilter !== "all") {
      filtered = filtered.filter(
        (card) => card.rarityTyped.toLowerCase() === rarityFilter
      );
    }
    if (activeSlot) {
      const allowedPositions = POSITION_MAPPING[activeSlot];
      filtered = filtered.filter(
        (card) => card.anyPositions?.some((pos) => allowedPositions.includes(pos))
      );
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) => card.name.toLowerCase().includes(query) || card.anyPlayer?.activeClub?.name?.toLowerCase().includes(query)
      );
    }
    if (inSeasonOnly) {
      filtered = filtered.filter((card) => card.inSeasonEligible === true);
    }
    filtered.sort((a, b) => {
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
    return filtered;
  }, [
    cards,
    usedCardSlugs,
    leagueFilter,
    rarityFilter,
    activeSlot,
    searchQuery,
    sortBy,
    inSeasonOnly
  ]);
  useMemo(() => {
    const filledSlots = formation.filter((s) => s.card).length;
    return filledSlots >= 3 ? 2 : 0;
  }, [formation]);
  const loadCardsFromDb = useCallback(async () => {
    try {
      const cached = await db.cache.get("user_cards");
      if (!cached) {
        return false;
      }
      const { timestamp, value, ttl } = cached;
      const cacheAge = Date.now() - timestamp;
      if (ttl && cacheAge > ttl) {
        await db.cache.delete("user_cards");
        return false;
      }
      const data = value;
      setCards(data.cards);
      setIsLoading(false);
      return true;
    } catch {
      return false;
    }
  }, []);
  const saveCardsToDb = useCallback(
    async (cardsData, userSlug) => {
      await db.cache.put({
        key: "user_cards",
        value: { cards: cardsData, userSlug },
        timestamp: Date.now(),
        ttl: DEFAULT_TTL.LONG
      });
    },
    []
  );
  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetchAllCards({
        enablePagination: true
      });
      setCards(result.cards);
      await saveCardsToDb(result.cards, result.userSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento");
    } finally {
      setIsLoading(false);
    }
  }, [saveCardsToDb]);
  const loadCards = useCallback(async () => {
    const found = await loadCardsFromDb();
    if (!found) {
      await fetchCards();
    }
  }, [loadCardsFromDb, fetchCards]);
  useEffect(() => {
    loadCards();
  }, [loadCards]);
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!(editId && cards.length)) {
      return;
    }
    const loadFormation = async () => {
      try {
        const id = Number.parseInt(editId, 10);
        const saved = await db.savedFormations.get(id);
        if (saved) {
          setEditingId(id);
          setFormationName(saved.name);
          setLeagueFilter(saved.league);
          setFormation(loadSavedFormation(saved));
        }
      } catch (err) {
        console.error("Error loading formation:", err);
      }
    };
    loadFormation();
  }, [searchParams, cards]);
  const handleSlotClick = (position) => {
    const slot = formation.find((s) => s.position === position);
    if (slot?.card) {
      setFormation(
        (prev) => prev.map((s) => s.position === position ? { ...s, card: null } : s)
      );
      setActiveSlot(null);
    } else {
      setActiveSlot(activeSlot === position ? null : position);
    }
  };
  const handleCardSelect = (card) => {
    if (!activeSlot) {
      return;
    }
    setFormation((prev) => {
      const updated = prev.map(
        (s) => s.position === activeSlot ? { ...s, card } : s
      );
      const slotOrder = ["POR", "DIF", "CEN", "ATT", "EX"];
      const currentIndex = slotOrder.indexOf(activeSlot);
      let nextIndex = (currentIndex + 1) % slotOrder.length;
      let foundNext = false;
      for (const _ of slotOrder) {
        const nextPosition = slotOrder[nextIndex];
        const slot = updated.find((s) => s.position === nextPosition);
        if (slot && !slot.card) {
          setActiveSlot(nextPosition);
          foundNext = true;
          break;
        }
        nextIndex = (nextIndex + 1) % slotOrder.length;
      }
      if (!foundNext) {
        setActiveSlot(null);
      }
      return updated;
    });
    setSearchQuery("");
  };
  const handleConfirmFormation = async () => {
    const filledSlots = formation.filter((s) => s.card).length;
    if (filledSlots < 5) {
      setError("Completa la formazione prima di confermare");
      return;
    }
    if (!formationName.trim()) {
      setError("Inserisci un nome per la formazione");
      return;
    }
    try {
      const formationCards = formation.map((s) => s.card).filter((c) => c !== null);
      const slots = formation.filter((s) => s.card !== null).map((s) => ({ position: s.position, cardSlug: s.card?.slug ?? "" })).filter((s) => s.cardSlug !== "");
      if (editingId) {
        await db.savedFormations.update(editingId, {
          name: formationName.trim(),
          league: leagueFilter,
          cards: formationCards,
          slots
        });
        showToast(setToasts, "Formazione aggiornata con successo!", "success");
      } else {
        await db.savedFormations.add({
          name: formationName.trim(),
          league: leagueFilter,
          cards: formationCards,
          slots,
          createdAt: Date.now()
        });
        showToast(setToasts, "Formazione salvata con successo!", "success");
      }
      setFormationName("");
      setFormation(INITIAL_FORMATION);
      setEditingId(null);
      setError("");
      router.navigate({ to: "/saved-lineups" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "flex h-[80vh] items-center justify-center", children: /* @__PURE__ */ jsx(LoadingSpinner, { icon: "loader", message: "Caricamento carte..." }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(SiteNav, {}),
    /* @__PURE__ */ jsx(
      ToastContainer,
      {
        onRemove: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
        toasts
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex max-h-[calc(100vh-6rem)] shrink-0 flex-col overflow-y-auto lg:w-[420px]", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-3", children: /* @__PURE__ */ jsx(
          Input,
          {
            className: "h-9",
            id: "formation-name",
            onChange: (e) => setFormationName(e.target.value),
            placeholder: "Nome formazione (obbligatorio)",
            required: true,
            value: formationName
          }
        ) }),
        /* @__PURE__ */ jsxs(
          Button,
          {
            className: "mb-2 h-9 gap-2 bg-violet-600 font-semibold text-base hover:bg-violet-700",
            disabled: !formationName.trim() || formation.filter((s) => s.card).length < 5,
            onClick: handleConfirmFormation,
            children: [
              /* @__PURE__ */ jsx(Check, { className: "h-5 w-5" }),
              editingId ? "Aggiorna formazione" : "Salva formazione"
            ]
          }
        ),
        error && /* @__PURE__ */ jsx(Alert, { className: "mb-3", variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
        /* @__PURE__ */ jsxs("div", { className: "relative flex aspect-[21/31] flex-col overflow-hidden rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-lg", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute inset-5 rounded-lg border-2 border-white/30" }),
          /* @__PURE__ */ jsx("div", { className: "absolute top-1/2 right-5 left-5 h-0.5 -translate-y-1/2 bg-white/30" }),
          /* @__PURE__ */ jsx("div", { className: "absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" }),
          /* @__PURE__ */ jsx("div", { className: "absolute bottom-5 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-b-0" }),
          /* @__PURE__ */ jsx("div", { className: "absolute top-5 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-t-0" }),
          /* @__PURE__ */ jsxs("div", { className: "relative z-10 flex h-full flex-col justify-between gap-2 px-4 py-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-around", children: [
              /* @__PURE__ */ jsx(
                PitchSlot,
                {
                  card: formation.find((s) => s.position === "ATT")?.card ?? null,
                  isActive: activeSlot === "ATT",
                  label: "ATT",
                  onClick: () => handleSlotClick("ATT")
                }
              ),
              /* @__PURE__ */ jsx(
                PitchSlot,
                {
                  card: formation.find((s) => s.position === "EX")?.card ?? null,
                  isActive: activeSlot === "EX",
                  label: "EX",
                  onClick: () => handleSlotClick("EX")
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex justify-around", children: [
              /* @__PURE__ */ jsx(
                PitchSlot,
                {
                  card: formation.find((s) => s.position === "DIF")?.card ?? null,
                  isActive: activeSlot === "DIF",
                  label: "DIF",
                  onClick: () => handleSlotClick("DIF")
                }
              ),
              /* @__PURE__ */ jsx(
                PitchSlot,
                {
                  card: formation.find((s) => s.position === "CEN")?.card ?? null,
                  isActive: activeSlot === "CEN",
                  label: "CEN",
                  onClick: () => handleSlotClick("CEN")
                }
              )
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx(
              PitchSlot,
              {
                card: formation.find((s) => s.position === "POR")?.card ?? null,
                isActive: activeSlot === "POR",
                label: "POR",
                onClick: () => handleSlotClick("POR")
              }
            ) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex max-h-[calc(100vh-6rem)] max-w-[1000px] flex-1 flex-col", children: [
        /* @__PURE__ */ jsxs("div", { className: "sticky top-0 z-20 bg-white pb-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("h2", { className: "font-bold text-slate-800 text-xl", children: [
              "Seleziona",
              " ",
              activeSlot ? /* @__PURE__ */ jsx("span", { className: "text-violet-600", children: activeSlot }) : "Giocatore"
            ] }),
            /* @__PURE__ */ jsx(ViewToggle, { onViewModeChange: setViewMode, viewMode })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mb-4 flex flex-wrap gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("label", { className: "font-medium text-sm", htmlFor: "league-filter", children: "Lega:" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  id: "league-filter",
                  onChange: (e) => {
                    setLeagueFilter(e.target.value);
                    setFormation(INITIAL_FORMATION);
                    setActiveSlot(null);
                  },
                  value: leagueFilter,
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "", children: "Seleziona lega" }),
                    leagues.map((league) => /* @__PURE__ */ jsx("option", { value: league.value, children: league.label }, league.value))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("label", { className: "font-medium text-sm", htmlFor: "rarity-filter", children: "Rarità:" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  id: "rarity-filter",
                  onChange: (e) => setRarityFilter(e.target.value),
                  value: rarityFilter,
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "all", children: "Tutte" }),
                    /* @__PURE__ */ jsx("option", { value: "limited", children: "Limited" }),
                    /* @__PURE__ */ jsx("option", { value: "rare", children: "Rare" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("label", { className: "font-medium text-sm", htmlFor: "sort-by", children: "Ordina:" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  id: "sort-by",
                  onChange: (e) => setSortBy(e.target.value),
                  value: sortBy,
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "name", children: "Nome" }),
                    /* @__PURE__ */ jsx("option", { value: "team", children: "Squadra" }),
                    /* @__PURE__ */ jsx("option", { value: "l5", children: "Media L5" }),
                    /* @__PURE__ */ jsx("option", { value: "l15", children: "Media L15" }),
                    /* @__PURE__ */ jsx("option", { value: "l40", children: "Media L40" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(
                Checkbox,
                {
                  checked: inSeasonOnly,
                  id: "in-season-filter",
                  onCheckedChange: (checked) => setInSeasonOnly(checked === true)
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
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative min-w-[200px] flex-1", children: [
              /* @__PURE__ */ jsx(Search, { className: "absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  className: "h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-700 placeholder:text-slate-400",
                  onChange: (e) => setSearchQuery(e.target.value),
                  placeholder: "Cerca giocatore...",
                  value: searchQuery
                }
              )
            ] })
          ] }),
          viewMode === "list" && /* @__PURE__ */ jsx("div", { className: "mt-2 overflow-x-auto rounded-t-md border border-b-0 bg-white", children: /* @__PURE__ */ jsx("table", { className: "w-full max-w-[1000px] table-fixed text-sm", children: /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b", children: [
            /* @__PURE__ */ jsx(
              "th",
              {
                className: "h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80",
                onClick: () => handleTableSort(
                  "name",
                  tableSortKey === "name" && tableSortDirection === "asc" ? "desc" : "asc"
                ),
                style: { width: COLUMN_WIDTHS.name },
                children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
                  "Giocatore",
                  getSortIcon(
                    "name",
                    tableSortKey,
                    tableSortDirection
                  )
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
                style: { width: COLUMN_WIDTHS.team },
                children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
                  "Squadra",
                  getSortIcon(
                    "team",
                    tableSortKey,
                    tableSortDirection
                  )
                ] })
              }
            ),
            /* @__PURE__ */ jsx(
              "th",
              {
                className: "h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground",
                style: { width: COLUMN_WIDTHS.forma },
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
                style: { width: COLUMN_WIDTHS.l5 },
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
                style: { width: COLUMN_WIDTHS.l15 },
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
                style: { width: COLUMN_WIDTHS.l40 },
                children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
                  "L40",
                  getSortIcon("l40", tableSortKey, tableSortDirection)
                ] })
              }
            )
          ] }) }) }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: viewMode === "grid" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4", children: filteredCards.map((card) => /* @__PURE__ */ jsx(
            "button",
            {
              "aria-label": `Seleziona ${card.name}`,
              className: cn(
                "text-left transition-all",
                activeSlot ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg" : "cursor-not-allowed opacity-50"
              ),
              disabled: !activeSlot,
              onClick: () => handleCardSelect(card),
              type: "button",
              children: /* @__PURE__ */ jsx(
                SorareCard,
                {
                  card,
                  showAverages: true,
                  showPositions: false
                }
              )
            },
            card.slug
          )) }),
          filteredCards.length === 0 && /* @__PURE__ */ jsx("div", { className: "py-12 text-center text-slate-500", children: getEmptyMessage(leagueFilter, activeSlot) })
        ] }) : /* @__PURE__ */ jsx(
          CardsList,
          {
            cards: filteredCards,
            disabled: !activeSlot,
            emptyMessage: getEmptyMessage(leagueFilter, activeSlot),
            onCardClick: handleCardSelect,
            onSort: handleTableSort,
            showHeader: false,
            sortDirection: tableSortDirection,
            sortKey: tableSortKey
          }
        ) })
      ] })
    ] })
  ] });
}
function LineupPage() {
  return /* @__PURE__ */ jsx("main", { className: "min-h-screen from-slate-50 to-white p-4 md:p-4", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-[1600px]", children: /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx("div", { className: "flex h-[50vh] items-center justify-center", children: /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Caricamento..." }) }), children: /* @__PURE__ */ jsx(LineupBuilder, {}) }) }) });
}
export {
  LineupPage as component
};
