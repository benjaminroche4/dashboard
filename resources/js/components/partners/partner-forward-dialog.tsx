import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { forward as forwardDossier } from '@/routes/leads/partners';
import type { PartnerDetail, PartnerLead } from '@/types';

/**
 * Transmet le dossier d'un client au partenaire, depuis sa fiche : même route
 * que la carte « Partenaires » d'une fiche lead. Le destinataire ne peut être
 * que le partenaire ou l'un de ses interlocuteurs.
 */
export function PartnerForwardDialog({
    partner,
    lead,
    onOpenChange,
}: {
    partner: PartnerDetail;
    /** Dossier à transmettre ; `null` ferme le dialogue. */
    lead: PartnerLead | null;
    onOpenChange: (open: boolean) => void;
}) {
    const recipients = [
        ...(partner.email
            ? [
                  {
                      email: partner.email,
                      label: `${partner.name} · ${partner.email}`,
                  },
              ]
            : []),
        ...partner.contacts
            .filter((contact) => contact.email)
            .map((contact) => ({
                email: contact.email as string,
                label: `${contact.name} · ${contact.email}`,
            })),
    ];

    const form = useForm({ email: recipients[0]?.email ?? '', message: '' });

    const submit = () => {
        if (!lead) return;

        form.post(
            forwardDossier({ lead: lead.uuid, partnerLink: lead.id }).url,
            {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset('message');
                    onOpenChange(false);
                },
            },
        );
    };

    return (
        <Dialog open={lead !== null} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Transmettre le dossier {lead?.name} à {partner.name}
                    </DialogTitle>
                    <DialogDescription>
                        L’e-mail reprend les coordonnées et le projet du client.
                        Les réponses arrivent au conseiller du dossier.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="partner-forward-email">
                            Destinataire
                        </Label>
                        {recipients.length > 0 ? (
                            <Select
                                value={form.data.email}
                                onValueChange={(value) =>
                                    form.setData('email', value)
                                }
                            >
                                <SelectTrigger
                                    id="partner-forward-email"
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
                            <p className="text-muted-foreground text-sm">
                                Ce partenaire n’a aucune adresse e-mail :
                                ajoutez-en une ou renseignez un interlocuteur.
                            </p>
                        )}
                        <InputError message={form.errors.email} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="partner-forward-message">
                            Mot d’accompagnement
                        </Label>
                        <Textarea
                            id="partner-forward-message"
                            rows={4}
                            value={form.data.message}
                            onChange={(event) =>
                                form.setData('message', event.target.value)
                            }
                            placeholder="Bonjour, je vous transmets le dossier de…"
                        />
                        <InputError message={form.errors.message} />
                    </div>
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
                        type="button"
                        onClick={submit}
                        disabled={form.processing || recipients.length === 0}
                    >
                        Transmettre
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
