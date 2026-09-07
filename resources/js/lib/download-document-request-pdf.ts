import { notify } from '@/lib/toast';
import { pdf } from '@/routes/tools/documents';

/**
 * Télécharge le PDF d'une demande de pièces sans quitter la page, avec un
 * toast qui suit la génération.
 */
export async function downloadDocumentRequestPdf(
    requestUuid: string,
    clientName: string,
): Promise<boolean> {
    const pending = notify.loading(
        `Génération du PDF pour ${clientName}…`,
        'Le téléchargement démarre dès que le fichier est prêt.',
    );

    try {
        const response = await fetch(
            pdf({ documentRequest: requestUuid }).url,
            {
                credentials: 'same-origin',
                headers: { Accept: 'application/pdf' },
            },
        );

        if (!response.ok) {
            throw new Error(String(response.status));
        }

        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = `pieces-${clientName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        notify.resolve(pending, 'PDF téléchargé.');

        return true;
    } catch {
        notify.reject(
            pending,
            'Impossible de générer le PDF.',
            'Réessayez dans un instant.',
        );

        return false;
    }
}
