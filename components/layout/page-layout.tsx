import { SiteNav } from "@/components/site-nav";
import { cn } from "@/lib/utils";
import { AppPageShell, PageContainer, PageContent } from "./page-shell";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  containerSize?: "default" | "wide" | "full";
  shellVariant?: "default" | "wide" | "auth";
  showNav?: boolean;
}

/**
 * Layout standard per pagine autenticate.
 * Include SiteNav, shell e container configurabili.
 */
export function PageLayout({
  children,
  className,
  containerSize = "default",
  shellVariant = "default",
  showNav = true,
}: PageLayoutProps) {
  return (
    <AppPageShell variant={shellVariant}>
      <PageContainer size={containerSize}>
        <PageContent className={className}>
          {showNav && <SiteNav />}
          {children}
        </PageContent>
      </PageContainer>
    </AppPageShell>
  );
}

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Header di pagina con spacing standard.
 */
export function PageHeader({ children, className }: PageHeaderProps) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Titolo di pagina con stile standard.
 */
export function PageTitle({ children, className }: PageTitleProps) {
  return (
    <h1 className={cn("font-bold text-3xl tracking-tight", className)}>
      {children}
    </h1>
  );
}

interface PageDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Descrizione sotto il titolo con stile muted.
 */
export function PageDescription({ children, className }: PageDescriptionProps) {
  return <p className={cn("text-muted-foreground", className)}>{children}</p>;
}
