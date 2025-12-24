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

  const gridClasses = [
    "grid",
    "grid-cols-1",
    "gap-4",
    columns.md > 1 && `md:grid-cols-${columns.md}`,
    columns.lg > 1 && `lg:grid-cols-${columns.lg}`,
  ]
    .filter(Boolean)
    .join(" ");

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
