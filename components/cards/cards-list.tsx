import { Card, CardContent } from "@/components/ui/card";
import type { CardData } from "@/lib/sorare-api";
import { CardThumbnail } from "./card-thumbnail";

export interface CardsListProps {
  cards: CardData[];
  showEmptyMessage?: boolean;
  emptyMessage?: string;
}

export function CardsList({
  cards,
  showEmptyMessage = true,
  emptyMessage,
}: CardsListProps) {
  if (cards.length === 0 && showEmptyMessage) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage ?? "No cards found"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <Card key={card.slug}>
          <CardContent className="flex items-center gap-4 p-4">
            {card.pictureUrl && (
              <CardThumbnail alt={card.name} src={card.pictureUrl} size={60} />
            )}

            <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{card.name}</div>
                {card.anyPlayer?.activeClub && (
                  <div className="text-muted-foreground text-xs">
                    <div>{card.anyPlayer.activeClub.name}</div>
                    {card.anyPlayer.activeClub.activeCompetitions &&
                      card.anyPlayer.activeClub.activeCompetitions.length >
                        0 && (
                        <div>
                          {(() => {
                            const league =
                              card.anyPlayer.activeClub.activeCompetitions.find(
                                (c) => c.format === "DOMESTIC_LEAGUE"
                              );
                            return (
                              league?.name ??
                              card.anyPlayer.activeClub.activeCompetitions[0]
                                ?.name
                            );
                          })()}
                        </div>
                      )}
                  </div>
                )}
              </div>

              <div className="flex gap-4 text-center text-xs md:gap-6">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">L5</span>
                  <span className="font-medium">
                    {card.l5Average?.toFixed(1) ?? "-"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">L15</span>
                  <span className="font-medium">
                    {card.l15Average?.toFixed(1) ?? "-"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">L40</span>
                  <span className="font-medium">
                    {card.l40Average?.toFixed(1) ?? "-"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">XP</span>
                  <span className="font-medium">
                    {card.power
                      ? Math.round((Number.parseFloat(card.power) - 1) * 100)
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
