import { useForm } from '@inertiajs/react';
import { Send } from 'lucide-react';
import { useEffect } from 'react';
import { AssistantDraftButton } from '@/components/assistant-draft-button';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { draft, send } from '@/routes/clients/agencies';
import type { ClientAgentSuggestion, SuggestedAgent } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientUuid: string;
    suggestion: ClientAgentSuggestion;
    /** Agent présélectionné (le meilleur, par défaut). */
    agent?: SuggestedAgent | null;
};

type Recipient = { email: string; label: string; agentId: number | null };

/** Adresses possibles : l'agence, puis chacun de ses agents qui en a une. */
export function searchRecipients(
    suggestion: ClientAgentSuggestion,
): Recipient[] {
    const recipients: Recipient[] = [];
    if (suggestion.agency?.email) {
        recipients.push({
            email: suggestion.agency.email,
            label: `${suggestion.agency.name} (agence)`,
            agentId: null,
        });
    }
    for (const agent of suggestion.agents) {
        if (agent.email && !recipients.some((r) => r.email === agent.email)) {
            recipients.push({
                email: agent.email,
                label: agent.name,
                agentId: agent.id,
            });
        }
    }

    return recipients;
}

/**
 * « Envoyer la recherche » : le projet du client part à l'agence (ou à l'un de
 * ses agents) avec un mot du conseiller, que l'assistant peut rédiger. Les
 * coordonnées du client ne partent pas ; les réponses reviennent au conseiller.
 */
export function SendHousingSearchDialog({
    open,
    onOpenChange,
    clientUuid,
    suggestion,
    agent = null,
}: Props) {
    const recipients = searchRecipients(suggestion);
    const preferred =
        recipients.find(
            (r) => r.agentId === (agent ?? suggestion.best_agent)?.id,
        ) ?? recipients[0];
    const form = useForm({
        email: preferred?.email ?? '',
        message: '',
    });
    const chosen = recipients.find((r) => r.email === form.data.email);

    useEffect(() => {
        if (open) {
            form.setData({ email: preferred?.email ?? '', message: '' });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, suggestion.key]);

    const submit = () => {
        form.transform((data) => ({
            ...data,
            agency_id: suggestion.agency?.id ?? null,
            agent_id: chosen?.agentId ?? null,
        }));
        form.post(send({ lead: clientUuid }).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const target = suggestion.agency?.name ?? suggestion.best_agent?.name ?? '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Envoyer la recherche à {target}</DialogTitle>
                    <DialogDescription>
                        Le projet du client part sans ses coordonnées ; les
                        réponses vous reviennent directement.
                    </DialogDescription>
                </DialogHeader>
                {recipients.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucune adresse e-mail connue pour cette agence ni ses
                        agents : complétez la fiche avant d’envoyer.
                    </p>
                ) : (
                    <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submit();
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="search-recipient">
                                Destinataire
                            </Label>
                            <Select
                                value={form.data.email}
                                onValueChange={(value) =>
                                    form.setData('email', value)
                                }
                            >
                                <SelectTrigger
                                    id="search-recipient"
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
                                            {recipient.label} ·{' '}
                                            {recipient.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.email} />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="search-message">
                                    Votre mot
                                </Label>
                                <AssistantDraftButton<{ message: string }>
                                    url={draft({ lead: clientUuid }).url}
                                    body={{
                                        agency_id:
                                            suggestion.agency?.id ?? null,
                                        agent_id: chosen?.agentId ?? null,
                                    }}
                                    onDraft={(result) =>
                                        form.setData('message', result.message)
                                    }
                                />
                            </div>
                            <Textarea
                                id="search-message"
                                rows={8}
                                value={form.data.message}
                                onChange={(event) =>
                                    form.setData('message', event.target.value)
                                }
                                placeholder="Bonjour, nous cherchons pour l’un de nos clients…"
                            />
                            <InputError message={form.errors.message} />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    form.processing ||
                                    form.data.message.trim().length < 20
                                }
                            >
                                {form.processing ? (
                                    <Spinner />
                                ) : (
                                    <Send aria-hidden />
                                )}
                                Envoyer la recherche
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
