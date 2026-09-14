import { usePage } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { askAssistant } from '@/lib/assistant-request';
import { notify } from '@/lib/toast';

/**
 * « Rédiger avec l'IA » : demande une proposition à l'assistant et la remet au
 * formulaire, qui reste maître du texte — l'équipe relit avant d'envoyer.
 * Masqué sans clé API (`features.assistant`) : le front masque, le serveur refuse.
 */
export function AssistantDraftButton<T>({
    url,
    body,
    onDraft,
    label = 'Rédiger avec l’IA',
    disabled = false,
    size = 'sm',
}: {
    url: string;
    body?: Record<string, unknown>;
    onDraft: (draft: T) => void;
    label?: string;
    disabled?: boolean;
    size?: 'sm' | 'default';
}) {
    const enabled = usePage().props.features?.assistant ?? false;
    const [busy, setBusy] = useState(false);

    if (!enabled) {
        return null;
    }

    const draft = async () => {
        setBusy(true);

        try {
            onDraft(await askAssistant<T>(url, body));
        } catch (error) {
            notify.error(
                'Assistant IA',
                error instanceof Error
                    ? error.message
                    : 'L’assistant n’a pas répondu.',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            size={size}
            disabled={disabled || busy}
            onClick={draft}
        >
            {busy ? <Spinner /> : <Sparkles aria-hidden />}
            {label}
        </Button>
    );
}
