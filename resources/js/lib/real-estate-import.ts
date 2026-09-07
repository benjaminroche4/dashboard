import type { AgentImportRow } from '@/types';

/** Colonnes attendues, dans l'ordre, quand la première ligne n'est pas un en-tête. */
export const importColumns = [
    'first_name',
    'last_name',
    'agency',
    'position',
    'email',
    'phone',
] as const;

const headerAliases: Record<string, (typeof importColumns)[number]> = {
    prenom: 'first_name',
    prénom: 'first_name',
    firstname: 'first_name',
    first_name: 'first_name',
    nom: 'last_name',
    lastname: 'last_name',
    last_name: 'last_name',
    agence: 'agency',
    agency: 'agency',
    fonction: 'position',
    poste: 'position',
    position: 'position',
    email: 'email',
    'e-mail': 'email',
    mail: 'email',
    telephone: 'phone',
    téléphone: 'phone',
    tel: 'phone',
    phone: 'phone',
};

function splitLine(line: string): string[] {
    const separator = line.includes('\t')
        ? '\t'
        : line.includes(';')
          ? ';'
          : ',';

    return line
        .split(separator)
        .map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

function normalizeHeader(cell: string): string {
    return cell.trim().toLowerCase().replace(/\s+/g, '_');
}

export type ParsedImport = {
    rows: AgentImportRow[];
    /** Lignes ignorées faute de prénom ou de nom (numéros à partir de 1). */
    invalid: number[];
    /** Vrai si la première ligne a été reconnue comme en-tête. */
    hasHeader: boolean;
};

/**
 * Lit un collage depuis un tableur (tabulations, points-virgules ou virgules).
 * La première ligne sert d'en-tête si elle contient « prénom » ou « nom » ;
 * sinon l'ordre est prénom, nom, agence, fonction, e-mail, téléphone.
 */
export function parseAgentRows(text: string): ParsedImport {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '');

    if (lines.length === 0) {
        return { rows: [], invalid: [], hasHeader: false };
    }

    const firstCells = splitLine(lines[0] ?? '').map(normalizeHeader);
    const hasHeader = firstCells.some((cell) => cell in headerAliases);
    const mapping: ((typeof importColumns)[number] | null)[] = hasHeader
        ? firstCells.map((cell) => headerAliases[cell] ?? null)
        : [...importColumns];
    const body = hasHeader ? lines.slice(1) : lines;
    const rows: AgentImportRow[] = [];
    const invalid: number[] = [];

    body.forEach((line, index) => {
        const cells = splitLine(line);
        const row: AgentImportRow = {
            first_name: '',
            last_name: '',
            agency: '',
            position: '',
            email: '',
            phone: '',
        };

        mapping.forEach((column, position) => {
            if (column) {
                row[column] = cells[position] ?? '';
            }
        });

        if (row.first_name === '' || row.last_name === '') {
            invalid.push(index + 1 + (hasHeader ? 1 : 0));

            return;
        }

        rows.push(row);
    });

    return { rows, invalid, hasHeader };
}
