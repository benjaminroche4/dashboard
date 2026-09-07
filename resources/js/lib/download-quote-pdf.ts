import { notify } from '@/lib/toast';
import { pdf } from '@/routes/tools/quotes';

/**
 * Télécharge le PDF d'un devis sans quitter la page (même mécanique que les factures).
 */
export async function downloadQuotePdf(
    quoteUuid: string,
    quoteNumber: string,
): Promise<boolean> {
    const pending = notify.loading(
        `Génération du PDF ${quoteNumber}…`,
        'Le téléchargement démarre dès que le fichier est prêt.',
    );

    try {
        const response = await fetch(pdf({ quote: quoteUuid }).url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/pdf' },
        });

        if (!response.ok) {
            throw new Error(String(response.status));
        }

        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = `devis-${quoteNumber}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        notify.resolve(pending, `PDF ${quoteNumber} téléchargé.`);

        return true;
    } catch {
        notify.reject(
            pending,
            `Impossible de générer le PDF ${quoteNumber}.`,
            'Réessayez dans un instant.',
        );

        return false;
    }
}
