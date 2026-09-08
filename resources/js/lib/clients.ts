import type { Client } from '@/types';

/** Nombre de factures et de demandes de documents d'un dossier, au pluriel qui convient. */
export function dossierCounts(client: Client): string {
    const { invoices_count, document_requests_count } = client;

    return `${invoices_count} facture${invoices_count > 1 ? 's' : ''} · ${document_requests_count} demande${document_requests_count > 1 ? 's' : ''}`;
}

/** « 3 factures », « 1 devis », « 0 note » : le nombre suivi du nom au pluriel qui convient. */
export function countLabel(
    count: number,
    singular: string,
    plural = `${singular}s`,
): string {
    return `${count} ${count > 1 ? plural : singular}`;
}
