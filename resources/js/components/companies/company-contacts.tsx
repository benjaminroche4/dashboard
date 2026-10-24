import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CompanyContactDialog } from '@/components/companies/company-contact-dialog';
import { DetailSection } from '@/components/real-estate/detail-header';
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
        <DetailSection
            title="Contacts"
            count={contacts.length}
            action={
                canEdit && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setEditing(null);
                            setDialogOpen(true);
                        }}
                    >
                        <Plus aria-hidden />
                        Ajouter un contact
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
                <ul role="list" className="divide-border grid divide-y">
                    {contacts.map((contact) => (
                        <li
                            key={contact.id}
                            className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm first:pt-0 last:pb-0"
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
        </DetailSection>
    );
}
