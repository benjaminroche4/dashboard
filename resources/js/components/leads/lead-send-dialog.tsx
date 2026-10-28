import { router } from '@inertiajs/react';
import { CreditCard, FileText, Home, Minus, Plus, Send } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { propertyMatch, send } from '@/routes/leads';
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

/**
 * Les deux éléments proposés, avec leur disponibilité selon la configuration.
 * Le « Lien du contrat » (Yousign) a été retiré de la modale le 28 octobre
 * 2026 : la route `leads.send` l'accepte toujours, l'écran ne le propose plus.
 */
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
    ];
}

/**
 * « Envoyer au lead » : une modale à deux onglets. « Dossier » envoie un
 * e-mail avec le récapitulatif et le lien de paiement cochés ; « Biens
 * correspondants » envoie **un e-mail à part** qui dit au lead combien de
 * biens de l'annuaire correspondent à sa recherche (le chiffre, rien sur
 * les biens) et l'invite à contacter son conseiller. Chaque envoi est noté.
 */
export function LeadSendDialog({
    lead,
    sending,
    matchingCount = 0,
    className,
    onSent,
}: {
    lead: LeadDetail;
    sending: LeadSending;
    /** Nombre de biens de l'annuaire qui correspondent à la recherche, prérempli dans l'onglet « Biens correspondants ». */
    matchingCount?: number;
    className?: string;
    /** Appelé après un envoi réussi (ex. proposer « Devis envoyé »). */
    onSent?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'dossier' | 'property'>('dossier');
    const [count, setCount] = useState(String(Math.max(matchingCount, 1)));
    const [sendingProperty, setSendingProperty] = useState(false);
    const countValue = Number.parseInt(count, 10);
    const countValid =
        Number.isInteger(countValue) && countValue >= 1 && countValue <= 50;
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

    const submitProperty = () => {
        if (!countValid) {
            return;
        }

        const id = notify.loading(
            'Envoi en cours…',
            `E-mail « biens correspondants » à ${lead.email ?? 'ce lead'}`,
        );
        router.post(
            propertyMatch({ lead: lead.uuid }).url,
            { count: countValue },
            {
                preserveScroll: true,
                onStart: () => setSendingProperty(true),
                onFinish: () => setSendingProperty(false),
                onSuccess: () => {
                    notify.resolve(
                        id,
                        'E-mail envoyé',
                        `${countValue} bien${countValue > 1 ? 's' : ''} annoncé${countValue > 1 ? 's' : ''} à ${lead.email}.`,
                    );
                    setOpen(false);
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
                        Un e-mail à {lead.email}. L'envoi est ajouté aux notes
                        du lead.
                    </DialogDescription>
                </DialogHeader>
                <Tabs
                    value={tab}
                    onValueChange={(value) =>
                        setTab(value as 'dossier' | 'property')
                    }
                    className="gap-4"
                >
                    <TabsList variant="line" className="w-full justify-start">
                        <TabsTrigger value="dossier" className="flex-none px-3">
                            Dossier
                        </TabsTrigger>
                        <TabsTrigger
                            value="property"
                            className="flex-none px-3"
                        >
                            Biens correspondants
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="dossier" className="grid gap-4">
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
                                            checked &&
                                                !disabled &&
                                                'border-primary',
                                        )}
                                    >
                                        <Checkbox
                                            id={id}
                                            checked={checked && !disabled}
                                            disabled={disabled}
                                            onCheckedChange={(state) =>
                                                toggle(
                                                    choice.value,
                                                    state === true,
                                                )
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
                            <fieldset className="bg-sidebar grid gap-2 rounded-lg border p-3">
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
                    </TabsContent>
                    {/* E-mail à part : le chiffre, ce que l'équipe fait, et
                        « Contacter mon conseiller ». Rien sur les biens. Le
                        compteur est la pièce maîtresse, l'aperçu dit ce que
                        le lead lira. */}
                    <TabsContent value="property" className="grid gap-3">
                        <div className="bg-sidebar grid gap-3 rounded-lg border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="grid gap-0.5">
                                    <Label htmlFor="match-count">
                                        Nombre de biens correspondants
                                    </Label>
                                    <p className="text-muted-foreground text-xs">
                                        C’est le chiffre que le lead lira.
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Un bien de moins"
                                        disabled={
                                            !countValid || countValue <= 1
                                        }
                                        onClick={() =>
                                            setCount(String(countValue - 1))
                                        }
                                    >
                                        <Minus aria-hidden />
                                    </Button>
                                    <Input
                                        id="match-count"
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={50}
                                        value={count}
                                        onChange={(event) =>
                                            setCount(event.target.value)
                                        }
                                        className="bg-background h-9 w-16 text-center text-base font-semibold tabular-nums"
                                        aria-invalid={!countValid}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Un bien de plus"
                                        disabled={
                                            !countValid || countValue >= 50
                                        }
                                        onClick={() =>
                                            setCount(String(countValue + 1))
                                        }
                                    >
                                        <Plus aria-hidden />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t pt-2 text-xs">
                                {matchingCount > 0 ? (
                                    <>
                                        <span>
                                            {matchingCount} bien
                                            {matchingCount > 1 ? 's' : ''} de
                                            l’annuaire{' '}
                                            {matchingCount > 1
                                                ? 'correspondent'
                                                : 'correspond'}{' '}
                                            au projet (budget, quartiers, type
                                            de bien).
                                        </span>
                                        {countValue !== matchingCount && (
                                            <Button
                                                type="button"
                                                variant="link"
                                                size="sm"
                                                className="h-auto p-0 text-xs"
                                                onClick={() =>
                                                    setCount(
                                                        String(matchingCount),
                                                    )
                                                }
                                            >
                                                Reprendre ce chiffre
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    'Aucun bien de l’annuaire ne correspond encore au projet : indiquez le nombre que vous annoncez.'
                                )}
                            </p>
                        </div>
                        <div
                            className="bg-background grid gap-1 rounded-lg border p-3"
                            data-test="property-match-preview"
                        >
                            <span className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
                                Ce que le lead lira
                            </span>
                            <p className="text-sm font-medium">
                                « {countValid ? countValue : '…'} bien
                                {countValid && countValue > 1 ? 's' : ''}{' '}
                                {countValid && countValue > 1
                                    ? 'correspondent'
                                    : 'correspond'}{' '}
                                à votre recherche »
                            </p>
                            <p className="text-muted-foreground text-xs">
                                Le chiffre, ce que nous faisons pour lui, et
                                l’invitation à contacter son conseiller. Rien
                                sur les biens eux-mêmes.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOpen(false)}
                    >
                        Annuler
                    </Button>
                    {tab === 'dossier' ? (
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
                    ) : (
                        <Button
                            type="button"
                            disabled={sendingProperty || !countValid}
                            onClick={submitProperty}
                        >
                            {sendingProperty ? <Spinner /> : <Home />}
                            Envoyer
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
