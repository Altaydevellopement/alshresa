import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, LayoutDashboard } from "lucide-react";
import { Button } from "./button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./sheet";
import { BrandMark } from "@/components/layout/BrandMark";
import { useNavbarData } from "./nav/hooks/useNavbarData";
import { cn } from "@/lib/utils";

const PUBLIC_LINKS = [
  { label: "Programme des vacances", href: "/holiday-program" },
  { label: "Tarifs", href: "/prices" },
  { label: "Règlement", href: "/terms-of-operation" },
];

/**
 * Barre de navigation des pages publiques (accueil, tarifs, règlement…).
 * Les pages de l'espace familles utilisent FamilyLayout.
 */
const Navbar = () => {
  const { isAuthenticated } = useNavbarData();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      isActive ? "bg-peach-soft text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-muted",
    );

  const actions = isAuthenticated ? (
    <Button asChild>
      <Link to="/dashboard">
        <LayoutDashboard aria-hidden="true" />
        Mon espace
      </Link>
    </Button>
  ) : (
    <>
      <Button asChild variant="ghost">
        <Link to="/login">Connexion</Link>
      </Button>
      <Button asChild>
        <Link to="/register">Créer un compte</Link>
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-8">
        <BrandMark to="/" />
        <nav aria-label="Informations" className="ml-auto hidden items-center gap-1 lg:flex">
          {PUBLIC_LINKS.map((l) => (
            <NavLink key={l.href} to={l.href} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 sm:flex lg:ml-4">{actions}</div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto sm:ml-0 lg:hidden" aria-label="Ouvrir le menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-xs">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Liens d'information et connexion</SheetDescription>
            <nav className="mt-8 flex flex-col gap-1" aria-label="Informations">
              {PUBLIC_LINKS.map((l) => (
                <NavLink key={l.href} to={l.href} className={linkClass} onClick={() => setOpen(false)}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2">{actions}</div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export { Navbar };
