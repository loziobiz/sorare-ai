import { CreditCard, Layers, Save } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/cards", label: "Le mie Carte", icon: CreditCard },
  { href: "/lineup", label: "Crea Formazione", icon: Layers },
  { href: "/saved-lineups", label: "Formazioni Salvate", icon: Save },
];

export function SiteNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="mb-4 flex items-center gap-2 border-slate-200 border-b pb-0">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-colors ${
              isActive
                ? "bg-violet-100 text-violet-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
            `}
            to={item.href}
            key={item.href}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
