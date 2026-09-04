import { toast } from 'sonner';
import { pdf } from '@/routes/invoices';

/**
 * Télécharge le PDF d'une facture sans quitter la page : le fichier est
 * récupéré en arrière-plan puis proposé au navigateur, avec un toast.
 */
export async function downloadInvoicePdf(
    invoiceId: number,
    invoiceNumber: string,
): Promise<boolean> {
    const pending = toast.loading(`Génération du PDF ${invoiceNumber}…`);

    try {
        const response = await fetch(pdf({ invoice: invoiceId }).url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/pdf' },
        });

        if (!response.ok) {
            throw new Error(String(response.status));
        }

        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = `facture-${invoiceNumber}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        toast.success(`PDF ${invoiceNumber} téléchargé.`, { id: pending });

        return true;
    } catch {
        toast.error(
            `Impossible de générer le PDF ${invoiceNumber}. Réessayez dans un instant.`,
            { id: pending },
        );

        return false;
    }
}
