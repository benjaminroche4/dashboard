import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { store as uploadStore } from '@/routes/tools/documents/uploads';

/**
 * Verser une pièce depuis le backoffice : un membre l'a reçue par e-mail,
 * WhatsApp ou en main propre, il la range sous la bonne pièce sans repasser
 * par la page de dépôt du client. PDF seulement, comme côté client ; le
 * fichier part dès qu'il est choisi et rejoint la liste, à vérifier.
 */
export function DocumentUploadField({
    requestUuid,
    personIndex,
    documentKey,
    label,
}: {
    requestUuid: string;
    personIndex: number;
    documentKey: string;
    /** Libellé de la pièce, pour le nom accessible du bouton. */
    label: string;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const send = (files: FileList | null) => {
        if (!files || files.length === 0) {
            return;
        }

        setBusy(true);
        router.post(
            uploadStore({ documentRequest: requestUuid }).url,
            {
                person: personIndex,
                document: documentKey,
                files: [...files],
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    if (input.current) {
                        input.current.value = '';
                    }
                },
            },
        );
    };

    return (
        <>
            <input
                ref={input}
                type="file"
                accept="application/pdf"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => send(event.target.files)}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 border-dashed px-2 text-xs"
                aria-label={`Ajouter un fichier pour ${label}`}
                disabled={busy}
                onClick={() => input.current?.click()}
            >
                {busy ? <Spinner /> : <Plus aria-hidden />}
                Ajouter un fichier
            </Button>
        </>
    );
}
