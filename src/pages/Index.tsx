import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Trees, ArrowRight, Clock, Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/ui/navbar";

const FEATURES = [
  {
    icon: Calendar,
    title: "Activités variées",
    text: "Un programme riche en activités éducatives, sportives et créatives pour les mercredis et les vacances scolaires.",
  },
  {
    icon: Users,
    title: "Équipe qualifiée",
    text: "Une équipe d'animateurs professionnels et passionnés pour accompagner vos enfants dans leur développement.",
  },
  {
    icon: Trees,
    title: "Cadre exceptionnel",
    text: "Un environnement sécurisé et adapté, avec des espaces intérieurs et extérieurs propices à l'épanouissement des enfants.",
  },
];

const Index = () => {
  const [imageOk, setImageOk] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-warm">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:px-8 lg:grid-cols-2 lg:py-20">
          <div className="relative z-10 space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary shadow-xs">
              <Palmtree className="h-3.5 w-3.5" aria-hidden="true" />
              Accueil de loisirs · Pîtres et Le Manoir-sur-Seine
            </p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
              Réservez les journées de loisirs de vos enfants, <span className="text-primary">en toute simplicité.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Bienvenue sur la plateforme de réservation du centre social de Pîtres et du Manoir-Sur-Seine, votre
              partenaire de confiance pour l'épanouissement de vos enfants.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/login">
                  Se connecter
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/register">Créer un compte</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
              <li className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" aria-hidden="true" />Mercredis</li>
              <li className="inline-flex items-center gap-2"><Palmtree className="h-4 w-4 text-primary" aria-hidden="true" />Vacances scolaires</li>
              <li className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-primary" aria-hidden="true" />Liste d'attente automatique</li>
            </ul>
          </div>

          <div className="relative">
            <span className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-sage/60" aria-hidden="true" />
            <span className="absolute -bottom-8 -right-4 h-40 w-40 rounded-full bg-coral/30" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border-4 border-card bg-peach shadow-lg aspect-[4/3]">
              {imageOk ? (
                <img
                  src="/images/Newfront.jpg"
                  alt="Enfants pendant une activité à l'Espace des 2 Rives"
                  className="h-full w-full object-cover"
                  onError={() => setImageOk(false)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-coral" aria-hidden="true">
                  <Palmtree className="h-24 w-24 text-white/80" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-8" aria-labelledby="features-title">
        <h2 id="features-title" className="sr-only">Pourquoi l'Espace des 2 Rives</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-peach text-primary" aria-hidden="true">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
          <p>Espace des 2 Rives — accueil@e2rives.fr · 02 32 68 32 10</p>
          <nav className="flex gap-4" aria-label="Liens légaux">
            <Link to="/terms-of-operation" className="hover:text-foreground">Règlement</Link>
            <Link to="/terms-of-service" className="hover:text-foreground">CGU</Link>
            <Link to="/prices" className="hover:text-foreground">Tarifs</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Index;
