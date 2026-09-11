import type { AgencyImportRow, AgentImportRow } from '@/types';

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

/** Découpe une ligne collée : tabulations, points-virgules ou virgules. */
export function splitLine(line: string): string[] {
    const separator = line.includes('\t')
        ? '\t'
        : line.includes(';')
          ? ';'
          : ',';

    return line
        .split(separator)
        .map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

/** Intitulé de colonne ramené à une clé comparable (« Code postal » → `code_postal`). */
export function normalizeHeader(cell: string): string {
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

/** Colonnes d'un import d'agences, dans l'ordre : nom, e-mail, téléphone, ville. */
export const agencyImportColumns = ['name', 'email', 'phone', 'city'] as const;

const agencyHeaderAliases: Record<
    string,
    (typeof agencyImportColumns)[number]
> = {
    agence: 'name',
    agency: 'name',
    nom: 'name',
    name: 'name',
    raison_sociale: 'name',
    email: 'email',
    'e-mail': 'email',
    mail: 'email',
    telephone: 'phone',
    téléphone: 'phone',
    tel: 'phone',
    phone: 'phone',
    ville: 'city',
    city: 'city',
};

export type ParsedAgencyImport = {
    rows: AgencyImportRow[];
    /** Lignes ignorées faute de nom (numéros à partir de 1). */
    invalid: number[];
    hasHeader: boolean;
};

/**
 * Même lecture que les agents, pour un annuaire d'agences : la première ligne
 * sert d'en-tête si elle contient « agence » ou « nom », sinon l'ordre est
 * nom, e-mail, téléphone, ville.
 */
export function parseAgencyRows(text: string): ParsedAgencyImport {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '');

    if (lines.length === 0) {
        return { rows: [], invalid: [], hasHeader: false };
    }

    const firstCells = splitLine(lines[0] ?? '').map(normalizeHeader);
    const hasHeader = firstCells.some((cell) => cell in agencyHeaderAliases);
    const mapping: ((typeof agencyImportColumns)[number] | null)[] = hasHeader
        ? firstCells.map((cell) => agencyHeaderAliases[cell] ?? null)
        : [...agencyImportColumns];
    const body = hasHeader ? lines.slice(1) : lines;
    const rows: AgencyImportRow[] = [];
    const invalid: number[] = [];

    body.forEach((line, index) => {
        const cells = splitLine(line);
        const row: AgencyImportRow = {
            name: '',
            email: '',
            phone: '',
            city: '',
        };

        mapping.forEach((column, position) => {
            if (column) {
                row[column] = cells[position] ?? '';
            }
        });

        if (row.name === '') {
            invalid.push(index + 1 + (hasHeader ? 1 : 0));

            return;
        }

        rows.push(row);
    });

    return { rows, invalid, hasHeader };
}
