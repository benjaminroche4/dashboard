import type { DocumentUploadStatus } from '@/types';

/**
 * Teinte de la carte d'une pièce déposée : verte une fois validée, rouge si
 * elle est refusée, neutre tant que l'équipe ne s'est pas prononcée. La même
 * lecture côté équipe et côté client.
 */
export const uploadStatusTones: Record<DocumentUploadStatus, string> = {
    pending: 'bg-background',
    accepted:
        'border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40',
    refused: 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
};

/** Teinte du libellé qui accompagne la carte. */
export const uploadStatusText: Record<DocumentUploadStatus, string> = {
    pending: 'text-muted-foreground',
    accepted: 'text-green-700 dark:text-green-300',
    refused: 'text-red-700 dark:text-red-300',
};
