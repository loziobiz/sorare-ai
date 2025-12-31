import { Loader2, RefreshCw } from "lucide-react";

type LoadingIcon = "loader" | "refresh";

interface LoadingSpinnerProps {
  icon?: LoadingIcon;
  message?: string;
}

const ICON_MAP = {
  loader: Loader2,
  refresh: RefreshCw,
} as const;

export function LoadingSpinner({
  icon = "loader",
  message,
}: LoadingSpinnerProps) {
  const Icon = ICON_MAP[icon];
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );
}
