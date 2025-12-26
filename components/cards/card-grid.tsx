import { Card, CardContent } from "@/components/ui/card";
import type { CardData } from "@/lib/sorare-api";
import { SorareCard } from "./card";

export interface CardsGridProps {
  cards: CardData[];
  columns?: {
    mobile?: number;
    md?: number;
    lg?: number;
  };
  showEmptyMessage?: boolean;
  emptyMessage?: string;
  showCardPositions?: boolean;
  showCardAverages?: boolean;
}

const DEFAULT_COLUMNS = {
  mobile: 1,
  md: 4,
  lg: 5,
};

export function CardsGrid({
  cards,
  columns = DEFAULT_COLUMNS,
  showEmptyMessage = true,
  emptyMessage,
  showCardPositions = true,
  showCardAverages = true,
}: CardsGridProps) {
  if (cards.length === 0 && showEmptyMessage) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage ?? "No cards found"}
        </CardContent>
      </Card>
    );
  }

  const getGridClasses = (): string => {
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

  return (
    <div className={gridClasses}>
      {cards.map((card) => (
        <SorareCard
          card={card}
          key={card.slug}
          showAverages={showCardAverages}
          showPositions={showCardPositions}
        />
      ))}
    </div>
  );
}
