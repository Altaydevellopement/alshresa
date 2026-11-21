import "@fontsource-variable/plus-jakarta-sans";

import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})

const root = ReactDOM.createRoot(document.getElementById('root')!)

// Fichier introuvable après une mise à jour du site : recharger pour obtenir la nouvelle version
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

// Sans configuration Supabase, l'application ne peut pas fonctionner :
// on affiche un message explicite au lieu d'une page blanche.
const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter(
  (key) => !import.meta.env[key],
)

if (missing.length > 0) {
  root.render(
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg rounded-2xl border border-border bg-card p-8 shadow-md">
        <h1 className="text-xl font-extrabold">Configuration manquante</h1>
        <p className="mt-2 text-muted-foreground">
          Le site n'est pas relié à sa base de données. Variable(s) absente(s) pour ce déploiement :
        </p>
        <ul className="mt-3 list-disc pl-5 font-mono text-sm">
          {missing.map((key) => <li key={key}>{key}</li>)}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Dans Vercel : Settings → Environments → choisir l'environnement (Production ou Preview) → Environment
          Variables, puis redéployer.
        </p>
      </div>
    </main>,
  )
} else {
  import('./App').catch(() => {
    window.location.reload()
    return new Promise<never>(() => {})
  }).then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </React.StrictMode>,
    )
  })
}
