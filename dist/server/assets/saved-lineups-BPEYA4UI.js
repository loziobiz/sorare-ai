import { jsx, jsxs } from "react/jsx-runtime";
import { d as db, A as ACTIVE_LEAGUES, L as LoadingSpinner, S as SiteNav, P as PageLayout } from "./sorare-api-CM3Hu48J.js";
import { useRouter } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { B as Button, A as Alert, a as AlertTitle, b as AlertDescription, c as AlertAction } from "./button-C7-Yro-a.js";
import { u as useCards } from "./use-cards-Drwfv-7M.js";
import "clsx";
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
import "dexie";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "tailwind-merge";
function CompactCard({ card }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-1", children: [
    card.pictureUrl && /* @__PURE__ */ jsx(
      "img",
      {
        alt: card.name,
        className: "h-auto max-w-[95px] rounded-lg",
        height: 100,
        loading: "lazy",
        src: card.pictureUrl,
        width: 85
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-1 text-center text-[10px]", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "L5" }),
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.l5Average?.toFixed(1) ?? "-" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "L15" }),
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.l15Average?.toFixed(1) ?? "-" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "XP" }),
        /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.power ? Math.round((Number.parseFloat(card.power) - 1) * 100) : "-" })
      ] })
    ] })
  ] });
}
function FormationCard({
  formation,
  onEdit,
  onDelete,
  currentCardsMap
}) {
  const positionOrder = {
    POR: 0,
    DIF: 1,
    CEN: 2,
    ATT: 3,
    EX: 4,
    EXTRA: 4
    // Handle both EX and EXTRA
  };
  const sortedCards = [...formation.cards].sort((a, b) => {
    const slotA = formation.slots.find((s) => s.cardSlug === a.slug);
    const slotB = formation.slots.find((s) => s.cardSlug === b.slug);
    if (!(slotA && slotB)) {
      return 0;
    }
    const orderA = positionOrder[slotA.position] ?? 999;
    const orderB = positionOrder[slotB.position] ?? 999;
    return orderA - orderB;
  }).map((card) => {
    const freshData = currentCardsMap.get(card.slug);
    if (freshData) {
      return { ...card, power: freshData.power };
    }
    return card;
  });
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm",
      style: { maxWidth: "480px" },
      children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("h3", { className: "font-bold text-slate-800 text-xl", children: formation.name }) }) }),
        /* @__PURE__ */ jsx("div", { className: "flex gap-1 overflow-x-auto pb-2", children: sortedCards.map((card) => /* @__PURE__ */ jsx(CompactCard, { card }, card.slug)) }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxs(
            Button,
            {
              className: "h-8 flex-1 px-2 text-xs",
              onClick: () => onEdit(formation),
              variant: "outline",
              children: [
                /* @__PURE__ */ jsx(Pencil, { className: "mr-1 h-3 w-3" }),
                "Modifica"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            Button,
            {
              className: "h-8 flex-1 px-2 text-xs",
              onClick: () => formation.id && onDelete(formation.id),
              variant: "destructive",
              children: [
                /* @__PURE__ */ jsx(Trash2, { className: "mr-1 h-3 w-3" }),
                "Cancella"
              ]
            }
          )
        ] })
      ]
    }
  );
}
function SavedLineups() {
  const router = useRouter();
  const { cards } = useCards();
  const [isLoading, setIsLoading] = useState(true);
  const [formations, setFormations] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const currentCardsMap = useMemo(
    () => new Map(
      cards.map((card) => [
        card.slug,
        { power: card.power }
      ])
    ),
    [cards]
  );
  const loadFormations = useCallback(async () => {
    try {
      const all = await db.savedFormations.toArray();
      const sorted = all.sort((a, b) => {
        if (a.league !== b.league) {
          return a.league.localeCompare(b.league);
        }
        return b.createdAt - a.createdAt;
      });
      setFormations(sorted);
    } catch (err) {
      console.error("Error loading formations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    loadFormations();
  }, [loadFormations]);
  const handleEdit = (formation) => {
    router.navigate({ to: "/lineup", search: { edit: formation.id } });
  };
  const handleDeleteClick = (id) => {
    setDeleteConfirm(id);
  };
  const handleConfirmDelete = async () => {
    if (deleteConfirm === null) {
      return;
    }
    try {
      await db.savedFormations.delete(deleteConfirm);
      setFormations((prev) => prev.filter((f) => f.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting formation:", err);
    }
  };
  const groupedFormations = useMemo(() => {
    const groups = {};
    for (const formation of formations) {
      const [leagueName, countryCode] = formation.league.split("|");
      const customName = ACTIVE_LEAGUES[formation.league];
      const leagueLabel = customName ?? `${leagueName} (${countryCode})`;
      if (!groups[leagueLabel]) {
        groups[leagueLabel] = [];
      }
      groups[leagueLabel].push(formation);
    }
    return groups;
  }, [formations]);
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "flex h-[80vh] items-center justify-center", children: /* @__PURE__ */ jsx(LoadingSpinner, { icon: "loader", message: "Caricamento formazioni..." }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(SiteNav, {}),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "font-bold text-3xl", children: "Formazioni Salvate" }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground", children: [
        formations.length,
        " ",
        formations.length === 1 ? "formazione" : "formazioni"
      ] })
    ] }),
    formations.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "py-12 text-center text-slate-500", children: [
      /* @__PURE__ */ jsx("p", { children: "Nessuna formazione salvata." }),
      /* @__PURE__ */ jsx(
        Button,
        {
          className: "mt-4",
          onClick: () => router.navigate({ to: "/lineup" }),
          children: "Crea una nuova formazione"
        }
      )
    ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-8", children: Object.entries(groupedFormations).map(([league, items]) => /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-4 font-bold text-slate-700 text-xl", children: league }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-2 lg:grid-cols-3", children: items.map((formation) => /* @__PURE__ */ jsx(
        FormationCard,
        {
          currentCardsMap,
          formation,
          onDelete: handleDeleteClick,
          onEdit: handleEdit
        },
        formation.id
      )) })
    ] }, league)) }),
    deleteConfirm !== null && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50", children: /* @__PURE__ */ jsxs(Alert, { className: "max-w-md", variant: "destructive", children: [
      /* @__PURE__ */ jsx(AlertTitle, { children: "Conferma cancellazione" }),
      /* @__PURE__ */ jsx(AlertDescription, { children: "Sei sicuro di voler cancellare questa formazione? Questa azione non può essere annullata." }),
      /* @__PURE__ */ jsxs(AlertAction, { className: "mt-4 flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { onClick: () => setDeleteConfirm(null), variant: "outline", children: "Annulla" }),
        /* @__PURE__ */ jsx(Button, { onClick: handleConfirmDelete, variant: "destructive", children: "Conferma cancellazione" })
      ] })
    ] }) })
  ] });
}
function SavedLineupsPage() {
  return /* @__PURE__ */ jsx(PageLayout, { containerSize: "default", showNav: true, children: /* @__PURE__ */ jsx(SavedLineups, {}) });
}
export {
  SavedLineupsPage as component
};
