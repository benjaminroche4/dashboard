import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { CompanyContactDialog } from '@/components/companies/company-contact-dialog';
import { Fold } from '@/components/leads/lead-show-body';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import { destroy as destroyContact } from '@/routes/companies/contacts';
import type { CompanyContact } from '@/types';

/**
 * Contacts d'une entreprise : liste, ajout, modification, retrait. Les
 * principaux ouvrent la liste et portent un badge ; il peut y en avoir
 * plusieurs. Chaque personne tient sur une ligne : identité à gauche,
 * coordonnées cliquables à droite, menu « ⋯ » au bout.
 */
export function CompanyContacts({
    companyUuid,
    contacts,
    canEdit = true,
}: {
    companyUuid: string;
    contacts: CompanyContact[];
    canEdit?: boolean;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CompanyContact | null>(null);
    const initials = useInitials();

    return (
        <Fold
            title="Contacts"
            icon={Users}
            count={contacts.length}
            defaultOpen={contacts.length > 0}
            storageKey={`company.${companyUuid}.contacts`}
            action={
                canEdit && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-7 rounded-full"
                        aria-label="Ajouter un contact"
                        title="Ajouter un contact"
                        onClick={() => {
                            setEditing(null);
                            setDialogOpen(true);
                        }}
                    >
                        <Plus aria-hidden />
                    </Button>
                )
            }
        >
            {contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucun contact enregistré. Ajoutez les référents de
                    l’entreprise, en marquant les principaux.
                </p>
            ) : (
                <ul role="list" className="grid gap-2">
                    {contacts.map((contact) => (
                        <li
                            key={contact.id}
                            className="bg-sidebar flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-3 text-sm"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <Avatar className="size-9 shrink-0">
                                    <AvatarFallback className="text-xs">
                                        {initials(contact.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid min-w-0 gap-0.5">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="truncate font-medium">
                                            {contact.name}
                                        </span>
                                        {contact.is_primary && (
                                            <Badge
                                                variant="outline"
                                                className="shrink-0 border-emerald-200 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                            >
                                                Principal
                                            </Badge>
                                        )}
                                    </span>
                                    {contact.position && (
                                        <span className="text-muted-foreground truncate text-xs">
                                            {contact.position}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-muted-foreground grid gap-0.5 text-right text-xs">
                                {contact.phone && (
                                    <a
                                        href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                                        className="hover:text-foreground tabular-nums underline-offset-4 hover:underline"
                                    >
                                        {contact.phone}
                                    </a>
                                )}
                                {contact.email && (
                                    <a
                                        href={`mailto:${contact.email}`}
                                        className="hover:text-foreground max-w-64 truncate underline-offset-4 hover:underline"
                                    >
                                        {contact.email}
                                    </a>
                                )}
                            </div>
                            {canEdit && (
                                <RealEstateRowActions
                                    name={contact.name}
                                    deleteUrl={
                                        destroyContact({
                                            company: companyUuid,
                                            contact: contact.id,
                                        }).url
                                    }
                                    deleteTitle={`Retirer ${contact.name} ?`}
                                    deleteDescription="Le contact disparaît de la fiche de l’entreprise."
                                    deleteLabel="Retirer"
                                    canDelete
                                    onEdit={() => {
                                        setEditing(contact);
                                        setDialogOpen(true);
                                    }}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <CompanyContactDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                companyUuid={companyUuid}
                contact={editing}
            />
        </Fold>
    );
}
