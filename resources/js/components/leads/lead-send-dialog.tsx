import { router } from '@inertiajs/react';
import { CreditCard, FileSignature, FileText, Send } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { send } from '@/routes/leads';
import type {
    LeadDetail,
    LeadMailItem,
    LeadSending,
    PaymentPlan,
} from '@/types';

type Choice = {
    value: LeadMailItem;
    label: string;
    description: string;
    icon: ReactNode;
    /** Raison pour laquelle l'élément n'est pas disponible, sinon null. */
    unavailable: string | null;
};

/** Les trois éléments proposés, avec leur disponibilité selon la configuration. */
export function sendChoices(lead: LeadDetail, sending: LeadSending): Choice[] {
    const needsOffer = lead.offer_label
        ? null
        : 'Choisissez d’abord une formule.';

    return [
        {
            value: 'recap',
            label: 'Récapitulatif du dossier',
            description:
                'Formule, budget, emménagement, quartiers et conditions, tels que saisis.',
            icon: <FileText className="size-4" aria-hidden />,
            unavailable: null,
        },
        {
            value: 'payment_link',
            label: 'Lien de paiement',
            description: lead.offer_label
                ? `Page de paiement sécurisée pour la formule ${lead.offer_label}, dans la langue du lead.`
                : 'Page de paiement sécurisée pour la formule choisie.',
            icon: <CreditCard className="size-4" aria-hidden />,
            unavailable: sending.paymentLink
                ? needsOffer
                : 'Aucun lien de paiement configuré.',
        },
        {
            value: 'contract_link',
            label: 'Lien du contrat',
            description:
                'Contrat généré automatiquement et signé en ligne via Yousign.',
            icon: <FileSignature className="size-4" aria-hidden />,
            unavailable: sending.contractLink
                ? needsOffer
                : 'Yousign ou DocRaptor n’est pas configuré.',
        },
    ];
}

/**
 * « Envoyer au lead » : une modale avec le récapitulatif, le lien de paiement
 * et le lien du contrat à cocher. L'e-mail part au clic sur Envoyer.
 */
export function LeadSendDialog({
    lead,
    sending,
    className,
    onSent,
}: {
    lead: LeadDetail;
    sending: LeadSending;
    className?: string;
    /** Appelé après un envoi réussi (ex. proposer « Devis envoyé »). */
    onSent?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<LeadMailItem[]>(['recap']);
    const [processing, setProcessing] = useState(false);
    // Acompte de 50 % coché par défaut quand la formule le propose (Confié).
    const defaultPlan = (): PaymentPlan =>
        sending.paymentPlans.some((option) => option.value === 'deposit')
            ? 'deposit'
            : 'full';
    const [plan, setPlan] = useState<PaymentPlan>(defaultPlan);
    const choices = sendChoices(lead, sending);
    // Le choix de la modalité n'a de sens qu'avec un lien de paiement et plusieurs modalités.
    const showPlans =
        items.includes('payment_link') && sending.paymentPlans.length > 1;

    const toggle = (value: LeadMailItem, checked: boolean) =>
        setItems((current) =>
            checked
                ? [...current, value]
                : current.filter((item) => item !== value),
        );

    const submit = () => {
        const id = notify.loading(
            'Envoi en cours…',
            `E-mail à ${lead.email ?? 'ce lead'}`,
        );
        router.post(
            send({ lead: lead.uuid }).url,
            {
                items,
                payment_plan: items.includes('payment_link') ? plan : null,
            },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    notify.resolve(id, 'E-mail envoyé', `À ${lead.email}.`);
                    setOpen(false);
                    setItems(['recap']);
                    setPlan(defaultPlan());
                    onSent?.();
                },
                onError: (errors) => {
                    notify.reject(
                        id,
                        'Envoi impossible',
                        Object.values(errors)[0] ?? 'Réessayez.',
                    );
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className={className}
                    disabled={!sending.email}
                    title={
                        sending.email
                            ? undefined
                            : 'Ajoutez un e-mail au lead pour lui écrire.'
                    }
                >
                    <Send />
                    Envoyer au lead
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Envoyer au lead</DialogTitle>
                    <DialogDescription>
                        Un seul e-mail à {lead.email}, avec les éléments cochés.
                        L'envoi est ajouté aux notes du lead.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    {choices.map((choice) => {
                        const disabled = choice.unavailable !== null;
                        const checked = items.includes(choice.value);
                        const id = `send-${choice.value}`;

                        return (
                            <label
                                key={choice.value}
                                htmlFor={id}
                                className={cn(
                                    'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                                    disabled
                                        ? 'cursor-not-allowed opacity-60'
                                        : 'hover:bg-sidebar-accent/60 cursor-pointer',
                                    checked && !disabled && 'border-primary',
                                )}
                            >
                                <Checkbox
                                    id={id}
                                    checked={checked && !disabled}
                                    disabled={disabled}
                                    onCheckedChange={(state) =>
                                        toggle(choice.value, state === true)
                                    }
                                    className="mt-0.5"
                                />
                                <span className="grid gap-0.5">
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        {choice.icon}
                                        {choice.label}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {choice.unavailable ??
                                            choice.description}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </div>
                {showPlans && (
                    <fieldset className="grid gap-2 rounded-lg border p-3">
                        <legend className="px-1 text-sm font-medium">
                            Modalité de paiement
                        </legend>
                        <RadioGroup
                            value={plan}
                            onValueChange={(value) =>
                                setPlan(value as PaymentPlan)
                            }
                            aria-label="Modalité de paiement"
                            className="grid gap-2"
                        >
                            {sending.paymentPlans.map((option) => (
                                <Label
                                    key={option.value}
                                    htmlFor={`plan-${option.value}`}
                                    className="flex cursor-pointer items-center gap-2 font-normal"
                                >
                                    <RadioGroupItem
                                        id={`plan-${option.value}`}
                                        value={option.value}
                                        aria-label={option.label}
                                    />
                                    {option.label}
                                </Label>
                            ))}
                        </RadioGroup>
                    </fieldset>
                )}
                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        disabled={
                            processing ||
                            items.filter(
                                (item) =>
                                    choices.find((c) => c.value === item)
                                        ?.unavailable === null,
                            ).length === 0
                        }
                        onClick={submit}
                    >
                        {processing ? <Spinner /> : <Send />}
                        Envoyer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
