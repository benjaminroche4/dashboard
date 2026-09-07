import { Link, router, useForm } from '@inertiajs/react';
import { Plus, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { PartnerTypeBadge } from '@/components/partners/columns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
    destroy as detachPartner,
    forward as forwardDossier,
    store as attachPartner,
} from '@/routes/leads/partners';
import { show as partnerShow } from '@/routes/partners';
import type {
    LeadDetail,
    LeadPartnerLink,
    PartnerOption,
    PartnerRole,
    PartnerRoleOption,
} from '@/types';

/** Partenaires groupés par type, pour le sélecteur. */
export function groupPartners(
    partners: PartnerOption[],
): { label: string; partners: PartnerOption[] }[] {
    const groups = new Map<string, PartnerOption[]>();

    for (const partner of partners) {
        groups.set(partner.type_label, [
            ...(groups.get(partner.type_label) ?? []),
            partner,
        ]);
    }

    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, members]) => ({ label, partners: members }));
}

type AttachForm = { partner_id: string; role: PartnerRole | ''; note: string };

/** Ajout d'un partenaire au dossier : partenaire, rôle, précision. */
function AttachDialog({
    open,
    onOpenChange,
    lead,
    partners,
    roles,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lead: LeadDetail;
    partners: PartnerOption[];
    roles: PartnerRoleOption[];
}) {
    const form = useForm<AttachForm>({ partner_id: '', role: '', note: '' });

    useEffect(() => {
        if (open) {
            form.setData({ partner_id: '', role: '', note: '' });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajouter un partenaire au dossier</DialogTitle>
                    <DialogDescription>
                        Qui intervient pour {lead.name}, et pour quoi.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(attachPartner({ lead: lead.uuid }).url, {
                            preserveScroll: true,
                            onSuccess: () => onOpenChange(false),
                        });
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="lead-partner">Partenaire</Label>
                        <Select
                            value={form.data.partner_id}
                            onValueChange={(value) =>
                                form.setData('partner_id', value)
                            }
                        >
                            <SelectTrigger id="lead-partner" className="w-full">
                                <SelectValue placeholder="Choisir un partenaire" />
                            </SelectTrigger>
                            <SelectContent>
                                {groupPartners(partners).map((group) => (
                                    <SelectGroup key={group.label}>
                                        <SelectLabel>{group.label}</SelectLabel>
                                        {group.partners.map((partner) => (
                                            <SelectItem
                                                key={partner.id}
                                                value={String(partner.id)}
                                            >
                                                {partner.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.partner_id} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="lead-partner-role">Rôle</Label>
                        <Select
                            value={form.data.role}
                            onValueChange={(value) =>
                                form.setData('role', value as PartnerRole)
                            }
                        >
                            <SelectTrigger
                                id="lead-partner-role"
                                className="w-full"
                            >
                                <SelectValue placeholder="Ce qu’il fait sur ce dossier" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem
                                        key={role.value}
                                        value={role.value}
                                    >
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.role} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="lead-partner-note">Précision</Label>
                        <Input
                            id="lead-partner-note"
                            value={form.data.note}
                            onChange={(event) =>
                                form.setData('note', event.target.value)
                            }
                            placeholder="Devis demandé, référence du contrat…"
                            autoComplete="off"
                        />
                        <InputError message={form.errors.note} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                form.processing ||
                                form.data.partner_id === '' ||
                                form.data.role === ''
                            }
                        >
                            {form.processing && <Spinner />}
                            Ajouter
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

type ForwardForm = { email: string; message: string };

/** Transmission du dossier à un partenaire : destinataire et mot d'accompagnement. */
function ForwardDialog({
    link,
    lead,
    onOpenChange,
}: {
    link: LeadPartnerLink | null;
    lead: LeadDetail;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm<ForwardForm>({ email: '', message: '' });
    const recipients = link
        ? [
              ...(link.partner.email
                  ? [
                        {
                            email: link.partner.email,
                            label: `${link.partner.name} · ${link.partner.email}`,
                        },
                    ]
                  : []),
              ...link.partner.contacts
                  .filter((contact) => contact.email)
                  .map((contact) => ({
                      email: contact.email as string,
                      label: `${contact.name} · ${contact.email}`,
                  })),
          ]
        : [];

    useEffect(() => {
        if (link) {
            form.setData({ email: recipients[0]?.email ?? '', message: '' });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [link]);

    return (
        <Dialog open={link !== null} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Transmettre le dossier à {link?.partner.name}
                    </DialogTitle>
                    <DialogDescription>
                        Un e-mail récapitulant le projet de {lead.name} part au
                        destinataire, avec vos coordonnées en réponse.
                    </DialogDescription>
                </DialogHeader>
                {link && (
                    <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(
                                forwardDossier({
                                    lead: lead.uuid,
                                    partnerLink: link.id,
                                }).url,
                                {
                                    preserveScroll: true,
                                    onSuccess: () => onOpenChange(false),
                                },
                            );
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="forward-email">Destinataire</Label>
                            {recipients.length > 0 ? (
                                <Select
                                    value={form.data.email}
                                    onValueChange={(value) =>
                                        form.setData('email', value)
                                    }
                                >
                                    <SelectTrigger
                                        id="forward-email"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Choisir un destinataire" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {recipients.map((recipient) => (
                                            <SelectItem
                                                key={recipient.email}
                                                value={recipient.email}
                                            >
                                                {recipient.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="forward-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="contact@partenaire.fr"
                                    required
                                />
                            )}
                            <InputError message={form.errors.email} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-message">
                                Mot d’accompagnement
                            </Label>
                            <Textarea
                                id="forward-message"
                                rows={4}
                                value={form.data.message}
                                onChange={(event) =>
                                    form.setData('message', event.target.value)
                                }
                                placeholder="Bonjour, merci de traiter ce dossier en priorité…"
                            />
                            <InputError message={form.errors.message} />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    form.processing || form.data.email === ''
                                }
                            >
                                {form.processing ? (
                                    <Spinner />
                                ) : (
                                    <Send aria-hidden />
                                )}
                                Transmettre
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Carte « Partenaires du dossier » de la fiche lead : qui intervient et pour
 * quoi, transmission du dossier par e-mail, retrait.
 */
export function LeadPartnersCard({
    lead,
    links,
    partners,
    roles,
}: {
    lead: LeadDetail;
    links: LeadPartnerLink[];
    partners: PartnerOption[];
    roles: PartnerRoleOption[];
}) {
    const [adding, setAdding] = useState(false);
    const [forwarding, setForwarding] = useState<LeadPartnerLink | null>(null);
    const [removing, setRemoving] = useState<number | null>(null);

    const remove = (link: LeadPartnerLink) => {
        setRemoving(link.id);
        router.delete(
            detachPartner({ lead: lead.uuid, partnerLink: link.id }).url,
            { preserveScroll: true, onFinish: () => setRemoving(null) },
        );
    };

    return (
        <section
            aria-label="Partenaires du dossier"
            className="bg-sidebar grid gap-3 rounded-xl border p-4"
        >
            <header className="flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">
                    Partenaires du dossier
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdding(true)}
                    disabled={partners.length === 0}
                >
                    <Plus aria-hidden />
                    Ajouter
                </Button>
            </header>
            {links.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    {partners.length === 0
                        ? 'Aucun partenaire dans l’annuaire pour le moment.'
                        : 'Aucun partenaire n’intervient sur ce dossier.'}
                </p>
            ) : (
                <ul role="list" className="grid gap-2">
                    {links.map((link) => (
                        <li
                            key={link.id}
                            className="bg-background grid gap-1.5 rounded-lg border p-3 text-sm"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="grid min-w-0 gap-0.5">
                                    <Link
                                        href={partnerShow({
                                            partner: link.partner.uuid,
                                        })}
                                        className="truncate font-medium underline-offset-4 hover:underline"
                                    >
                                        {link.partner.name}
                                    </Link>
                                    <div className="flex flex-wrap items-center gap-1">
                                        <PartnerTypeBadge
                                            type={link.partner.type}
                                            label={link.partner.type_label}
                                        />
                                        <Badge
                                            variant="outline"
                                            className="font-medium"
                                        >
                                            {link.role_label}
                                        </Badge>
                                    </div>
                                    {link.note && (
                                        <span className="text-muted-foreground text-xs">
                                            {link.note}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Retirer ${link.partner.name}`}
                                    disabled={removing === link.id}
                                    onClick={() => remove(link)}
                                >
                                    <X aria-hidden />
                                </Button>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="justify-center"
                                onClick={() => setForwarding(link)}
                            >
                                <Send aria-hidden />
                                Transmettre le dossier
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <AttachDialog
                open={adding}
                onOpenChange={setAdding}
                lead={lead}
                partners={partners}
                roles={roles}
            />
            <ForwardDialog
                link={forwarding}
                lead={lead}
                onOpenChange={(open) => !open && setForwarding(null)}
            />
        </section>
    );
}
