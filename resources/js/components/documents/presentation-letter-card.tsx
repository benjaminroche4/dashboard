import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AssistantDraftButton } from '@/components/assistant-draft-button';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { letter as saveLetter } from '@/routes/tools/documents';
import { draft as draftLetter } from '@/routes/tools/documents/letter';

/**
 * Lettre de présentation du foyer, imprimée en tête du dossier fusionné :
 * proposée par l'assistant depuis le projet et les fiches, relue et
 * enregistrée par l'équipe. Vide, rien ne s'imprime.
 */
export function PresentationLetterCard({
    requestUuid,
    letter,
}: {
    requestUuid: string;
    letter: string | null;
}) {
    const [text, setText] = useState(letter ?? '');
    const [saving, setSaving] = useState(false);
    const dirty = text.trim() !== (letter ?? '').trim();

    // Une lettre enregistrée ailleurs (autre onglet) remplace le brouillon non modifié.
    useEffect(() => setText(letter ?? ''), [letter]);

    const save = () => {
        setSaving(true);
        router.patch(
            saveLetter({ documentRequest: requestUuid }).url,
            { letter: text.trim() || null },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    return (
        <div className="grid gap-3">
            <p className="text-muted-foreground text-sm">
                Elle ouvre le dossier fusionné : qui est le foyer, sa situation,
                ses garanties. L’assistant la propose, vous la relisez.
            </p>
            <Textarea
                aria-label="Lettre de présentation"
                rows={8}
                maxLength={4000}
                value={text}
                placeholder="Aucune lettre pour l’instant."
                onChange={(event) => setText(event.target.value)}
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
                <AssistantDraftButton<{ letter: string }>
                    url={draftLetter({ documentRequest: requestUuid }).url}
                    disabled={saving}
                    onDraft={(draft) => setText(draft.letter)}
                />
                <Button
                    type="button"
                    size="sm"
                    disabled={saving || !dirty}
                    onClick={save}
                >
                    {saving && <Spinner />}
                    Enregistrer
                </Button>
            </div>
        </div>
    );
}
