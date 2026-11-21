import { useState } from "react"
import { Baby, Info, Pencil, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmptyState, InitialsAvatar } from "@/components/design"
import { Child } from "@/types/profile"
import { useChildManagement } from "@/hooks/useChildManagement"
import { AddChildDialog } from "./dialogs/AddChildDialog"
import { EditChildDialog } from "./dialogs/EditChildDialog"
import { DeleteChildDialog } from "./dialogs/DeleteChildDialog"

interface ChildrenListProps {
  children: Child[]
  /** Affiche l'en-tête de section (titre + bouton) */
  showHeader?: boolean
}

/** Fiches enfants de la famille, avec ajout / modification / suppression. */
export function ChildrenList({ children, showHeader = true }: ChildrenListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)

  const {
    editingChild,
    setEditingChild,
    deletingChild,
    setDeletingChild,
    isDeleting,
    isChecking,
    handleEditClick,
    handleSuccessfulEdit,
    handleDeleteChild,
  } = useChildManagement()

  const addButton = (
    <Button onClick={() => setShowAddDialog(true)}>
      <UserPlus aria-hidden="true" />
      Ajouter un enfant
    </Button>
  )

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Enfants enregistrés</h2>
          {addButton}
        </div>
      )}

      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Pour vos enfants en petite section, seules les vacances d'été sont réservables en ligne.
        </AlertDescription>
      </Alert>

      {children.length === 0 ? (
        <Card>
          <EmptyState
            icon={Baby}
            title="Aucun enfant enregistré"
            description="Ajoutez vos enfants pour pouvoir réserver des journées d'accueil."
            action={addButton}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <li key={child.id} className="flex flex-col rounded-xl border border-border/80 bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <InitialsAvatar name={`${child.first_name} ${child.last_name}`} className="h-12 w-12 text-base" />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold">{child.first_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{child.last_name}</p>
                </div>
              </div>
              <p className="mt-4 inline-flex w-fit rounded-full bg-sage-soft px-3 py-1 text-xs font-semibold text-sage-foreground">
                Classe : {child.school_class}
              </p>
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(child)}
                  disabled={isChecking}
                  aria-label={`Modifier la fiche de ${child.first_name}`}
                >
                  <Pencil aria-hidden="true" />
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                  onClick={() => setDeletingChild(child)}
                  aria-label={`Supprimer la fiche de ${child.first_name}`}
                >
                  <Trash2 aria-hidden="true" />
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddChildDialog isOpen={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={() => setShowAddDialog(false)} />
      <EditChildDialog child={editingChild} onOpenChange={setEditingChild} onSuccess={handleSuccessfulEdit} />
      <DeleteChildDialog child={deletingChild} onOpenChange={setDeletingChild} onDelete={handleDeleteChild} isDeleting={isDeleting} />
    </div>
  )
}
