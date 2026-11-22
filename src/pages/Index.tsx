import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Trees, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/ui/navbar";
import { useNavbarData } from "@/components/ui/nav/hooks/useNavbarData";

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
  const { isAuthenticated } = useNavbarData();
  // Logo officiel (public/images/Logolong.png) s'il est présent, sinon titre texte
  const [logoOk, setLogoOk] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Accueil : aquarelle du bâtiment en plein écran, comme l'ancienne version */}
      <section className="relative isolate flex h-[calc(100svh-4rem)] min-h-[560px] max-h-[900px] flex-col overflow-hidden">
        <picture>
          <source srcSet="/images/accueil-aquarelle.webp" type="image/webp" />
          <img
            src="/images/accueil-aquarelle.jpg"
            alt="Aquarelle du bâtiment de l'Espace des 2 Rives"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[10%_center] md:object-center"
            fetchPriority="high"
          />
        </picture>
        {/* Voiles pour garder le logo et les boutons lisibles sur l'image */}
        <div className="absolute inset-x-0 top-0 -z-10 h-1/3 bg-gradient-to-b from-white/70 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />

        <div className="mx-auto w-full max-w-6xl px-4 pt-8 md:px-8 md:pt-12">
          {logoOk ? (
            <img
              src="/images/Logolong.png"
              alt="Espace des 2 Rives — Centre social intercommunal Pîtres - Le Manoir-sur-Seine"
              className="mx-auto h-20 w-auto md:h-28"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm md:text-6xl">
                Espace des 2 Rives
              </h1>
              <p className="mt-2 text-base font-semibold text-foreground/80 md:text-lg">
                <span className="block sm:inline">Centre social intercommunal</span>
                <span className="hidden sm:inline"> · </span>
                <span className="block sm:inline">Pîtres – Le Manoir-sur-Seine</span>
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto mx-auto w-full max-w-xl px-4 pb-8 md:pb-12">
          {isAuthenticated ? (
            <Button asChild size="xl" className="w-full shadow-lg">
              <Link to="/dashboard">
                <LayoutDashboard aria-hidden="true" />
                Accéder à mon espace
              </Link>
            </Button>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl" className="w-full shadow-lg sm:flex-1">
                <Link to="/login">Connexion</Link>
              </Button>
              <Button asChild size="xl" className="w-full shadow-lg sm:flex-1">
                <Link to="/register">Inscription</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 text-center md:px-8">
        <p className="text-lg text-muted-foreground">
          Bienvenue sur la plateforme de réservation du centre social de Pîtres et du Manoir-sur-Seine, votre partenaire
          de confiance pour l'épanouissement de vos enfants.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-8" aria-labelledby="features-title">
        <h2 id="features-title" className="sr-only">Pourquoi l'Espace des 2 Rives</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-border/80 bg-card p-6 text-center shadow-sm">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-peach text-primary" aria-hidden="true">
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
