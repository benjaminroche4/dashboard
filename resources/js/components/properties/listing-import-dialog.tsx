import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { AiBadge } from '@/components/ai-badge';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { extract } from '@/routes/properties';
import type { PropertyForm } from '@/types';

/** Réponse de `properties.extract`. */
export type ListingExtraction = {
    property: Partial<PropertyForm>;
    /** Clés du formulaire remplies par l'assistant. */
    filled: string[];
    highlights: string[];
    agent_name: string | null;
    agency_name: string | null;
    source: 'url' | 'text';
};

/**
 * « Importer une annonce » : l'URL ou le texte d'une annonce est lu par
 * l'assistant IA, qui préremplit le formulaire du bien. Rien n'est enregistré
 * avant relecture.
 */
export function ListingImportDialog({
    open,
    onOpenChange,
    onExtracted,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onExtracted: (extraction: ListingExtraction) => void;
}) {
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyse = async () => {
        setBusy(true);
        setError(null);

        try {
            const response = await fetch(extract().url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(
                        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
                    ),
                },
                body: JSON.stringify({ input }),
            });
            const data = (await response.json()) as
                | ListingExtraction
                | { message?: string; errors?: Record<string, string[]> };

            if (!response.ok) {
                const failure = data as {
                    message?: string;
                    errors?: Record<string, string[]>;
                };
                setError(
                    failure.errors?.input?.[0] ??
                        failure.message ??
                        'L’assistant n’a pas pu lire cette annonce.',
                );

                return;
            }

            onExtracted(data as ListingExtraction);
            setInput('');
            onOpenChange(false);
        } catch {
            setError('L’assistant n’a pas pu lire cette annonce.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Importer une annonce
                        <AiBadge />
                    </DialogTitle>
                    <DialogDescription>
                        Collez le lien d’une annonce (SeLoger, PAP, site
                        d’agence…) ou son texte : l’assistant remplit le
                        formulaire, vous relisez avant d’enregistrer.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void analyse();
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="listing-input">
                            Lien ou texte de l’annonce
                        </Label>
                        <Textarea
                            id="listing-input"
                            rows={6}
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="https://www.seloger.com/annonces/… ou le texte reçu de l’agent"
                            autoFocus
                        />
                        <InputError message={error ?? undefined} />
                    </div>
                    <Alert>
                        <Sparkles aria-hidden />
                        <AlertDescription>
                            Certains sites bloquent la lecture automatique. Dans
                            ce cas, copiez le texte de l’annonce.
                        </AlertDescription>
                    </Alert>
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
                            disabled={busy || input.trim().length < 10}
                        >
                            {busy ? <Spinner /> : <Sparkles aria-hidden />}
                            {busy ? 'Lecture en cours…' : 'Analyser l’annonce'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
