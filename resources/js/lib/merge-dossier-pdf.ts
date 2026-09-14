import { PDFDocument } from 'pdf-lib';
import {
    dossierFileName,
    dossierPlan,
    type DossierPart,
} from '@/lib/document-dossier';
import { notify } from '@/lib/toast';
import { cover } from '@/routes/tools/documents';
import type { DocumentRequestDetail } from '@/types';

/**
 * Résultat de la fusion : ce qui est parti dans le PDF, et ce qui a résisté.
 */
export type MergeResult = {
    merged: number;
    /** Fichiers refusés (PDF illisible ou protégé), nommés pour l'équipe. */
    skipped: string[];
};

/** Télécharge un PDF et renvoie ses octets, ou null si la requête échoue. */
async function fetchPdf(url: string): Promise<ArrayBuffer | null> {
    try {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/pdf' },
        });

        return response.ok ? await response.arrayBuffer() : null;
    } catch {
        return null;
    }
}

/** Ajoute toutes les pages d'un PDF au dossier ; faux si le fichier résiste. */
async function append(
    dossier: PDFDocument,
    bytes: ArrayBuffer,
): Promise<boolean> {
    try {
        // Un relevé de banque protégé contre la copie reste lisible : on ne
        // refuse pas un fichier pour son drapeau de chiffrement.
        const source = await PDFDocument.load(bytes, {
            ignoreEncryption: true,
        });
        const pages = await dossier.copyPages(source, source.getPageIndices());

        for (const page of pages) {
            dossier.addPage(page);
        }

        return pages.length > 0;
    } catch {
        return false;
    }
}

/**
 * Fusionne les pièces d'une liste en **un seul PDF**, dans l'ordre du dossier,
 * précédées de la page de garde. Tout se passe dans le navigateur : les pièces
 * (cartes d'identité, avis d'imposition) ne transitent chez aucun prestataire,
 * et l'hébergement n'a pas de fusionneur de PDF à installer.
 *
 * Un fichier illisible est sauté et nommé dans le toast : mieux vaut un dossier
 * de 11 pièces sur 12 qu'un échec sec.
 */
export async function mergeDossierPdf(
    request: DocumentRequestDetail,
    options: { withCover?: boolean } = {},
): Promise<MergeResult | null> {
    const parts = dossierPlan(request);

    if (parts.length === 0) {
        // Des pièces peuvent exister sans qu'aucune soit fusionnable : celles
        // que l'équipe a refusées ne partent pas dans le dossier.
        const received = request.persons.some((person) =>
            person.categories.some((category) =>
                category.documents.some(
                    (document) => (document.uploads ?? []).length > 0,
                ),
            ),
        );

        notify.warning(
            'Aucune pièce à fusionner',
            received
                ? 'Aucune pièce validée : le dossier ne part qu’avec des pièces vérifiées par l’équipe.'
                : 'Le client n’a encore rien déposé.',
        );

        return null;
    }

    const pending = notify.loading(
        `Fusion de ${parts.length} pièce(s)…`,
        'Le téléchargement démarre dès que le dossier est prêt.',
    );

    try {
        const dossier = await PDFDocument.create();
        dossier.setTitle(`Dossier de ${request.name}`);
        dossier.setCreator('Dashboard · Relocation in Paris');

        if (options.withCover !== false) {
            const bytes = await fetchPdf(
                cover({ documentRequest: request.uuid }).url,
            );

            // Sans DocRaptor (ou en cas de panne), le dossier part sans page
            // de garde plutôt que de ne pas partir du tout.
            if (bytes !== null) {
                await append(dossier, bytes);
            }
        }

        const skipped: string[] = [];
        let merged = 0;

        for (const part of parts) {
            const bytes = await fetchPdf(part.upload.download_url);
            const added = bytes === null ? false : await append(dossier, bytes);

            if (added) {
                merged++;
            } else {
                skipped.push(label(part));
            }
        }

        if (merged === 0) {
            notify.reject(
                pending,
                'Aucune pièce n’a pu être fusionnée.',
                'Les fichiers déposés ne sont pas des PDF lisibles.',
            );

            return { merged: 0, skipped };
        }

        download(await dossier.save(), dossierFileName(request.name));

        notify.resolve(
            pending,
            `Dossier de ${merged} pièce(s) téléchargé.`,
            skipped.length > 0
                ? `${skipped.length} fichier(s) illisible(s) écarté(s) : ${skipped.join(', ')}.`
                : undefined,
        );

        return { merged, skipped };
    } catch {
        notify.reject(
            pending,
            'Le dossier n’a pas pu être fusionné.',
            'Réessayez, ou téléchargez les pièces une par une.',
        );

        return null;
    }
}

/** « Léa Durand · RIB (releve.pdf) », pour nommer un fichier écarté. */
function label(part: DossierPart): string {
    return `${part.person} · ${part.document} (${part.upload.name})`;
}

/** Propose le fichier au navigateur, comme les autres téléchargements. */
function download(bytes: Uint8Array, name: string): void {
    const url = URL.createObjectURL(
        new Blob([bytes as BlobPart], { type: 'application/pdf' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    // Révoquer tout de suite annule parfois un téléchargement qui n'a pas
    // encore démarré : on laisse le navigateur prendre le fichier.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
