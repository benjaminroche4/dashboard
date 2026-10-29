import { Link } from '@inertiajs/react';
import { FolderOpen, Handshake, Plus, Send, Users } from 'lucide-react';
import { useState } from 'react';
import { PartnerContactDialog } from '@/components/partners/partner-contact-dialog';
import { PartnerForwardDialog } from '@/components/partners/partner-forward-dialog';
import { Fold } from '@/components/leads/lead-show-body';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import { leadStatusClasses } from '@/components/leads/lead-status-menu';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
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
        <Fold
            title="Interlocuteurs"
            icon={Users}
            count={contacts.length}
            defaultOpen={contacts.length > 0}
            storageKey={`partner.${partnerUuid}.contacts`}
            action={
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground size-7 rounded-full"
                    aria-label="Ajouter un interlocuteur"
                    title="Ajouter un interlocuteur"
                    onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                    }}
                >
                    <Plus aria-hidden />
                </Button>
            }
        >
            {contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucun interlocuteur enregistré.
                </p>
            ) : (
                /* Chaque interlocuteur en carte grise, comme les agents d'une
                   agence et les leads d'un agent (28 octobre 2026). */
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
        </Fold>
    );
}

/**
 * Dossiers (leads) sur lesquels le partenaire intervient : rôles tenus, et
 * transmission du dossier depuis chaque ligne.
 */
export function PartnerLeads({
    leads,
    partner,
}: {
    leads: PartnerLead[];
    /** Fourni sur la fiche : permet de transmettre le dossier au partenaire. */
    partner?: PartnerDetail;
}) {
    const [forwarding, setForwarding] = useState<PartnerLead | null>(null);

    return (
        <Fold
            title="Dossiers"
            icon={FolderOpen}
            count={leads.length}
            defaultOpen={leads.length > 0}
            storageKey={partner ? `partner.${partner.uuid}.leads` : undefined}
        >
            {leads.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Ce partenaire n’intervient sur rien pour l’instant.
                    Rattachez-le depuis un lead, un dossier client, un
                    propriétaire ou un bien.
                </p>
            ) : (
                /* Chaque dossier en carte grise (28 octobre 2026) : qui, où
                   il en est, ce que le partenaire y fait et depuis quand, et
                   « Transmettre » en bouton rond discret. */
                <ul role="list" className="grid gap-2">
                    {leads.map((lead) => (
                        <li
                            key={lead.id}
                            className="bg-sidebar flex items-start gap-3 rounded-lg border p-3 text-sm"
                        >
                            <Avatar className="size-9 shrink-0">
                                <AvatarFallback
                                    className={cn(
                                        'text-xs',
                                        memberTone(lead.id),
                                    )}
                                >
                                    {initials(lead.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid min-w-0 flex-1 gap-1">
                                <span className="flex min-w-0 flex-wrap items-center gap-2">
                                    <Link
                                        href={leadShow({ lead: lead.uuid })}
                                        className="truncate font-medium underline-offset-4 hover:underline"
                                    >
                                        {lead.name}
                                    </Link>
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            'font-medium',
                                            lead.status &&
                                                leadStatusClasses[lead.status],
                                        )}
                                    >
                                        {lead.status_label}
                                    </Badge>
                                </span>
                                <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                    <span className="inline-flex items-center gap-1">
                                        <Handshake
                                            className="size-3.5"
                                            aria-hidden
                                        />
                                        {lead.role_label}
                                    </span>
                                    {lead.at && (
                                        <span>
                                            Depuis le{' '}
                                            {formatDate(lead.at.slice(0, 10))}
                                        </span>
                                    )}
                                </span>
                            </div>
                            {partner && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-foreground size-7 shrink-0 rounded-full"
                                    aria-label={`Transmettre le dossier de ${lead.name}`}
                                    title="Transmettre le dossier"
                                    onClick={() => setForwarding(lead)}
                                >
                                    <Send aria-hidden />
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
        </Fold>
    );
}
