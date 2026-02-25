import { cn } from "@/lib/utils";

interface AppPageShellProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "wide" | "auth";
}

/**
 * Shell di pagina con background e padding standard.
 * Gestisce min-height, gradiente di sfondo e padding responsive.
 */
export function AppPageShell({
  children,
  className,
  variant = "default",
}: AppPageShellProps) {
  const variantClasses = {
    default:
      "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pt-4 md:p-6 md:pt-6 lg:p-8 lg:pt-8 dark:from-slate-900 dark:to-slate-800",
    wide: "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pt-4 md:p-6 md:pt-6 dark:from-slate-900 dark:to-slate-800",
    auth: "min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800",
  };

  return (
    <main className={cn(variantClasses[variant], className)}>{children}</main>
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "full";
}

/**
 * Container per contenuto pagina con max-width standard.
 * Centralizza il contenuto e gestisce il responsive.
 */
export function PageContainer({
  children,
  className,
  size = "default",
}: PageContainerProps) {
  const sizeClasses = {
    default: "mx-auto w-full max-w-7xl",
    wide: "mx-auto w-full max-w-[1600px]",
    full: "mx-auto w-full",
  };

  return <div className={cn(sizeClasses[size], className)}>{children}</div>;
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper per il contenuto principale della pagina.
 * Gestisce spacing verticale tra elementi.
 */
export function PageContent({ children, className }: PageContentProps) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
}
