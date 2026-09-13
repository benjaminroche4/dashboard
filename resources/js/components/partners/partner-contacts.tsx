import { Link } from '@inertiajs/react';
import { Plus, Send } from 'lucide-react';
import { useState } from 'react';
import { PartnerContactDialog } from '@/components/partners/partner-contact-dialog';
import { PartnerForwardDialog } from '@/components/partners/partner-forward-dialog';
import { DetailSection } from '@/components/real-estate/detail-header';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import { destroy as destroyContact } from '@/routes/partners/contacts';
import { show as leadShow } from '@/routes/leads';
import type { PartnerContact, PartnerDetail, PartnerLead } from '@/types';

/**
 * Interlocuteurs d'un partenaire : liste, ajout, modification, retrait.
 * Chaque personne tient sur une ligne en deux colonnes : identité à gauche,
 * coordonnées alignées à droite, menu « ⋯ » au bout.
 */
export function PartnerContacts({
    partnerUuid,
    contacts,
}: {
    partnerUuid: string;
    contacts: PartnerContact[];
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<PartnerContact | null>(null);
    const initials = useInitials();

    return (
        <DetailSection
            title="Interlocuteurs"
            count={contacts.length}
            action={
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                    }}
                >
                    <Plus aria-hidden />
                    Ajouter un interlocuteur
                </Button>
            }
        >
            {contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucun interlocuteur enregistré.
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
                            {/* Modifier et retirer vivent dans le menu « ⋯ », comme partout ailleurs. */}
                            <RealEstateRowActions
                                name={contact.name}
                                deleteUrl={
                                    destroyContact({
                                        partner: partnerUuid,
                                        contact: contact.id,
                                    }).url
                                }
                                deleteTitle={`Retirer ${contact.name} ?`}
                                deleteDescription="L’interlocuteur disparaît de la fiche du partenaire."
                                deleteLabel="Retirer"
                                canDelete
                                onEdit={() => {
                                    setEditing(contact);
                                    setDialogOpen(true);
                                }}
                            />
                        </li>
                    ))}
                </ul>
            )}
            <PartnerContactDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                partnerUuid={partnerUuid}
                contact={editing}
            />
        </DetailSection>
    );
}

/**
 * Dossiers (leads) sur lesquels le partenaire intervient : rôles tenus, et
 * transmission du dossier depuis chaque ligne.
 */
export function PartnerLeads({
    leads,
    partner,
    roles = [],
}: {
    leads: PartnerLead[];
    /** Fourni sur la fiche : permet de transmettre le dossier au partenaire. */
    partner?: PartnerDetail;
    roles?: string[];
}) {
    const [forwarding, setForwarding] = useState<PartnerLead | null>(null);

    return (
        <DetailSection title="Dossiers" count={leads.length}>
            {roles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {roles.map((role) => (
                        <Badge
                            key={role}
                            variant="secondary"
                            className="font-medium"
                        >
                            {role}
                        </Badge>
                    ))}
                </div>
            )}
            {leads.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Ce partenaire n’intervient sur rien pour l’instant.
                    Rattachez-le depuis un lead, un dossier client, un
                    propriétaire ou un bien.
                </p>
            ) : (
                <ul role="list" className="divide-border grid divide-y">
                    {leads.map((lead) => (
                        <li
                            key={lead.id}
                            className="flex items-baseline justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                        >
                            <span className="grid min-w-0">
                                <Link
                                    href={leadShow({ lead: lead.uuid })}
                                    className="truncate font-medium underline-offset-4 hover:underline"
                                >
                                    {lead.name}
                                </Link>
                                <span className="text-muted-foreground truncate text-xs">
                                    {lead.role_label}
                                </span>
                            </span>
                            <span className="text-muted-foreground shrink-0 text-xs">
                                {lead.status_label}
                            </span>
                            {partner && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => setForwarding(lead)}
                                >
                                    <Send aria-hidden />
                                    Transmettre
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {partner && (
                <PartnerForwardDialog
                    partner={partner}
                    lead={forwarding}
                    onOpenChange={(open) => !open && setForwarding(null)}
                />
            )}
        </DetailSection>
    );
}
