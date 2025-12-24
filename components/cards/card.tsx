import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { CardData } from "@/lib/sorare-api";

interface CardImageProps {
  src: string;
  alt: string;
}

export function CardImage({ src, alt }: CardImageProps) {
  return (
    <div className="flex justify-center">
      <Image
        alt={alt}
        className="h-auto max-w-[200px] rounded-lg"
        height={200}
        src={src}
        unoptimized
        width={200}
      />
    </div>
  );
}

interface SorareCardProps {
  card: CardData;
  showPositions?: boolean;
  showAverages?: boolean;
}

export function SorareCard({
  card,
  showPositions = true,
  showAverages = true,
}: SorareCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3">
        {card.pictureUrl && <CardImage alt={card.name} src={card.pictureUrl} />}
        {showPositions && card.anyPositions && card.anyPositions.length > 0 && (
          <div className="text-sm">
            <span className="font-medium">Position:</span>{" "}
            {card.anyPositions.join(", ")}
          </div>
        )}
        {showAverages && (
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <div className="text-muted-foreground">L5</div>
              <div className="font-medium">
                {card.l5Average?.toFixed(1) ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">L10</div>
              <div className="font-medium">
                {card.l10Average?.toFixed(1) ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">L15</div>
              <div className="font-medium">
                {card.l15Average?.toFixed(1) ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">L40</div>
              <div className="font-medium">
                {card.l40Average?.toFixed(1) ?? "-"}
              </div>
            </div>
          </div>
        )}
        <div className="text-muted-foreground text-sm">{card.slug}</div>
      </CardContent>
    </Card>
  );
}
