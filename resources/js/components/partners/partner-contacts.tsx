import { Link, router } from '@inertiajs/react';
import { Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PartnerContactDialog } from '@/components/partners/partner-contact-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { destroy as destroyContact } from '@/routes/partners/contacts';
import { show as leadShow } from '@/routes/leads';
import type { PartnerContact, PartnerLead } from '@/types';

/** Interlocuteurs d'un partenaire : liste, ajout, modification, retrait. */
export function PartnerContacts({
    partnerUuid,
    contacts,
}: {
    partnerUuid: string;
    contacts: PartnerContact[];
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<PartnerContact | null>(null);
    const [removing, setRemoving] = useState<PartnerContact | null>(null);
    const [busy, setBusy] = useState(false);

    const remove = () => {
        if (!removing) {
            return;
        }

        setBusy(true);
        router.delete(
            destroyContact({ partner: partnerUuid, contact: removing.id }).url,
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setRemoving(null);
                },
            },
        );
    };

    return (
        <section
            aria-label="Interlocuteurs"
            className="grid gap-3 py-8 first:pt-0 last:pb-0"
        >
            <header className="flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">Interlocuteurs</h2>
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
            </header>
            {contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucun interlocuteur enregistré.
                </p>
            ) : (
                <ul role="list" className="divide-y rounded-xl border">
                    {contacts.map((contact) => (
                        <li
                            key={contact.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                        >
                            <div className="grid min-w-0">
                                <span className="truncate font-medium">
                                    {contact.name}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {contact.position ??
                                        'Fonction non renseignée'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {contact.phone && (
                                    <Button variant="ghost" size="sm" asChild>
                                        <a
                                            href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                                        >
                                            <Phone aria-hidden />
                                            {contact.phone}
                                        </a>
                                    </Button>
                                )}
                                {contact.email && (
                                    <Button variant="ghost" size="sm" asChild>
                                        <a href={`mailto:${contact.email}`}>
                                            <Mail aria-hidden />
                                            {contact.email}
                                        </a>
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Modifier ${contact.name}`}
                                    onClick={() => {
                                        setEditing(contact);
                                        setDialogOpen(true);
                                    }}
                                >
                                    <Pencil aria-hidden />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Retirer ${contact.name}`}
                                    onClick={() => setRemoving(contact)}
                                >
                                    <Trash2 aria-hidden />
                                </Button>
                            </div>
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
            <Dialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
            >
                <DialogContent>
                    <DialogTitle>Retirer {removing?.name} ?</DialogTitle>
                    <DialogDescription>
                        L’interlocuteur disparaît de la fiche du partenaire.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={busy}
                            onClick={remove}
                        >
                            Retirer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}

/** Dossiers (leads) sur lesquels le partenaire intervient. */
export function PartnerLeads({ leads }: { leads: PartnerLead[] }) {
    return (
        <section
            aria-label="Dossiers"
            className="bg-sidebar grid gap-3 rounded-xl border p-4"
        >
            <h2 className="text-base font-medium">
                Dossiers{' '}
                <span className="text-muted-foreground tabular-nums">
                    {leads.length}
                </span>
            </h2>
            {leads.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Ce partenaire n’est intervenu sur aucun dossier. Ajoutez-le
                    depuis la carte « Partenaires du dossier » d’une fiche lead.
                </p>
            ) : (
                <ul role="list" className="grid gap-1">
                    {leads.map((lead) => (
                        <li
                            key={lead.id}
                            className="flex items-baseline justify-between gap-2 text-sm"
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
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
