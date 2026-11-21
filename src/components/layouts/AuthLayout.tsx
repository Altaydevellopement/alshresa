import { ReactNode } from "react";
import { CalendarCheck, Clock, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  subDescription?: string;
}

const POINTS = [
  { icon: CalendarCheck, text: "Réservez mercredis, vacances et Club Ado en quelques clics" },
  { icon: Clock, text: "Liste d'attente automatique quand une journée est complète" },
  { icon: ShieldCheck, text: "Vos données restent confidentielles et protégées" },
];

/** Écrans de connexion / inscription / mot de passe : panneau de marque + formulaire. */
export const AuthLayout = ({ children, title, description, subDescription }: AuthLayoutProps) => (
  <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
    <aside className="relative hidden overflow-hidden bg-gradient-warm lg:flex lg:flex-col lg:justify-between lg:p-12">
      <BrandMark to="/" subtitle="Centre social de Pîtres et du Manoir-sur-Seine" />
      <div className="relative z-10 max-w-md space-y-6">
        <h2 className="text-4xl font-extrabold leading-tight">
          L'accueil de loisirs de vos enfants, <span className="text-primary">simplement.</span>
        </h2>
        <ul className="space-y-4">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-xs" aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <span className="pt-1.5 font-medium">{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="relative z-10 text-sm text-muted-foreground">Espace des 2 Rives · 02 32 68 32 10</p>
      <span className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-coral/25" aria-hidden="true" />
      <span className="pointer-events-none absolute -top-16 right-20 h-40 w-40 rounded-full bg-sage/50" aria-hidden="true" />
    </aside>

    <main className="flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:min-h-0 lg:justify-center lg:py-12">
      <div className="lg:hidden">
        <BrandMark to="/" />
      </div>
      <div className="mx-auto my-auto w-full max-w-md py-8">
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-md sm:p-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-extrabold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {subDescription && <p className="text-sm text-muted-foreground">{subDescription}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  </div>
);
