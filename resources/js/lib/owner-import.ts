import { normalizeHeader, splitLine } from '@/lib/real-estate-import';
import type { OwnerImportRow } from '@/types';

/** Colonnes attendues, dans l'ordre, quand la première ligne n'est pas un en-tête. */
export const ownerImportColumns = [
    'first_name',
    'last_name',
    'company',
    'email',
    'phone',
    'street',
    'postal_code',
    'city',
] as const;

const headerAliases: Record<string, (typeof ownerImportColumns)[number]> = {
    prenom: 'first_name',
    prénom: 'first_name',
    firstname: 'first_name',
    first_name: 'first_name',
    nom: 'last_name',
    lastname: 'last_name',
    last_name: 'last_name',
    societe: 'company',
    société: 'company',
    raison_sociale: 'company',
    company: 'company',
    email: 'email',
    'e-mail': 'email',
    mail: 'email',
    telephone: 'phone',
    téléphone: 'phone',
    tel: 'phone',
    phone: 'phone',
    rue: 'street',
    adresse: 'street',
    street: 'street',
    code_postal: 'postal_code',
    cp: 'postal_code',
    postal_code: 'postal_code',
    ville: 'city',
    city: 'city',
};

export type ParsedOwnerImport = {
    rows: OwnerImportRow[];
    /** Lignes ignorées faute de nom ou de moyen de contact (numéros à partir de 1). */
    invalid: number[];
    hasHeader: boolean;
};

const empty = (): OwnerImportRow => ({
    first_name: '',
    last_name: '',
    company: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
});

/**
 * Lit un collage de propriétaires depuis un tableur. La première ligne sert
 * d'en-tête si elle nomme une colonne connue ; sinon l'ordre est prénom, nom,
 * société, e-mail, téléphone, rue, code postal, ville. Une ligne sans nom ni
 * raison sociale, ou sans e-mail ni téléphone, est écartée — ce sont les
 * mêmes règles que le serveur.
 */
export function parseOwnerRows(text: string): ParsedOwnerImport {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '');

    if (lines.length === 0) {
        return { rows: [], invalid: [], hasHeader: false };
    }

    const firstCells = splitLine(lines[0] ?? '').map(normalizeHeader);
    const hasHeader = firstCells.some((cell) => cell in headerAliases);
    const mapping: ((typeof ownerImportColumns)[number] | null)[] = hasHeader
        ? firstCells.map((cell) => headerAliases[cell] ?? null)
        : [...ownerImportColumns];
    const body = hasHeader ? lines.slice(1) : lines;
    const rows: OwnerImportRow[] = [];
    const invalid: number[] = [];

    body.forEach((line, index) => {
        const cells = splitLine(line);
        const row = empty();

        mapping.forEach((column, position) => {
            if (column) {
                row[column] = cells[position] ?? '';
            }
        });

        const named = row.last_name !== '' || row.company !== '';
        const reachable = row.email !== '' || row.phone !== '';

        if (!named || !reachable) {
            invalid.push(index + 1 + (hasHeader ? 1 : 0));

            return;
        }

        rows.push(row);
    });

    return { rows, invalid, hasHeader };
}
