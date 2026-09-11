import { capitalizeName } from '@/lib/format';
import type {
    CatalogGroup,
    DocumentRequestForm,
    DocumentRequestLeadOption,
    HouseholdPersonForm,
} from '@/types';

/** Nombre maximal de personnes dans un foyer. */
export const MAX_PERSONS = 4;

export function emptyPerson(): HouseholdPersonForm {
    return { first_name: '', last_name: '', role: 'tenant', documents: [] };
}

export function emptyDocumentRequestForm(): DocumentRequestForm {
    return {
        language: 'fr',
        message: '',
        upload_url: '',
        persons: [emptyPerson()],
    };
}

/**
 * Préremplit le foyer depuis un lead : la personne principale prend le nom du
 * lead, et chaque garant physique déclaré ajoute un garant au foyer. Rien
 * n'est écrasé : une personne déjà nommée est conservée, et la limite de
 * MAX_PERSONS est respectée.
 */
export function prefillFromLead(
    form: DocumentRequestForm,
    lead: DocumentRequestLeadOption,
): DocumentRequestForm {
    const persons = [...form.persons];
    const tenant = persons.findIndex(
        (person) =>
            person.role === 'tenant' &&
            person.first_name.trim() === '' &&
            person.last_name.trim() === '',
    );

    const named: HouseholdPersonForm = {
        ...(persons[tenant] ?? emptyPerson()),
        role: 'tenant',
        first_name: lead.first_name,
        last_name: lead.last_name,
    };

    if (tenant === -1) {
        persons.push(named);
    } else {
        persons[tenant] = named;
    }

    // Un garant physique est une personne du foyer ; Garantme et la garantie
    // bancaire n'en sont pas et n'ajoutent personne.
    const wanted = lead.guarantors.filter(
        (guarantor) => guarantor === 'physique',
    ).length;
    const already = persons.filter(
        (person) => person.role === 'guarantor',
    ).length;

    for (let index = 0; index < wanted - already; index++) {
        if (persons.length >= MAX_PERSONS) {
            break;
        }

        persons.push({ ...emptyPerson(), role: 'guarantor' });
    }

    return {
        ...form,
        language: lead.language,
        persons: persons.slice(0, MAX_PERSONS),
    };
}

/** Nom affiché d'une personne, ou « Personne n » tant qu'il n'est pas saisi. */
export function personName(
    person: Pick<HouseholdPersonForm, 'first_name' | 'last_name'>,
    index: number,
): string {
    const name = capitalizeName(
        `${person.first_name.trim()} ${person.last_name.trim()}`,
    );

    return name === '' ? `Personne ${index + 1}` : name;
}

/** Coche ou décoche une pièce pour une personne, sans doublon. */
export function toggleDocument(
    person: HouseholdPersonForm,
    key: string,
    checked: boolean,
): HouseholdPersonForm {
    const without = person.documents.filter((document) => document !== key);

    return {
        ...person,
        documents: checked ? [...without, key] : without,
    };
}

/** Vrai si toutes les pièces de la catégorie sont cochées. */
export function isCategoryChecked(
    person: HouseholdPersonForm,
    group: CatalogGroup,
): boolean {
    return (
        group.items.length > 0 &&
        group.items.every((item) => person.documents.includes(item.key))
    );
}

/**
 * « Tous » : coche toute la catégorie, ou la décoche entièrement si elle
 * l'était déjà.
 */
export function toggleCategory(
    person: HouseholdPersonForm,
    group: CatalogGroup,
): HouseholdPersonForm {
    const keys = group.items.map((item) => item.key);
    const without = person.documents.filter((key) => !keys.includes(key));

    return {
        ...person,
        documents: isCategoryChecked(person, group)
            ? without
            : [...without, ...keys],
    };
}

/** Nombre de pièces cochées dans une catégorie. */
export function countInCategory(
    person: HouseholdPersonForm,
    group: CatalogGroup,
): number {
    return group.items.filter((item) => person.documents.includes(item.key))
        .length;
}

/** État affiché dans le récapitulatif : « à compléter » tant qu'il manque le nom ou une pièce. */
export function personStatus(person: HouseholdPersonForm): {
    label: string;
    complete: boolean;
} {
    const count = person.documents.length;
    const named =
        person.first_name.trim() !== '' && person.last_name.trim() !== '';

    if (count === 0) {
        return { label: 'Aucune pièce', complete: false };
    }

    const label = count === 1 ? '1 pièce' : `${count} pièces`;

    return named
        ? { label, complete: true }
        : { label: `${label} · nom manquant`, complete: false };
}

export type DocumentRequestFormErrors = Partial<
    Record<
        | 'upload_url'
        | 'persons'
        | `persons.${number}.first_name`
        | `persons.${number}.last_name`
        | `persons.${number}.documents`,
        string
    >
>;

/** Index de la personne visée par une clé d'erreur `persons.N.champ`, sinon null. */
export function personIndexFromErrorKey(key: string): number | null {
    const match = /^persons\.(\d+)\./.exec(key);

    return match ? Number(match[1]) : null;
}

/**
 * Validation locale, mêmes clés que Laravel : les erreurs serveur priment.
 */
export function validateDocumentRequestForm(
    data: DocumentRequestForm,
): DocumentRequestFormErrors {
    const errors: DocumentRequestFormErrors = {};

    // Lien externe facultatif : la page publique de dépôt est générée automatiquement.
    if (
        data.upload_url.trim() !== '' &&
        !/^https:\/\/\S+$/.test(data.upload_url.trim())
    ) {
        errors.upload_url =
            'Le dossier Google Drive doit être une adresse https valide.';
    }

    if (data.persons.length === 0) {
        errors.persons = 'Ajoutez au moins une personne.';
    } else if (data.persons.length > MAX_PERSONS) {
        errors.persons = 'Quatre personnes au maximum.';
    }

    data.persons.forEach((person, index) => {
        if (person.first_name.trim() === '') {
            errors[`persons.${index}.first_name`] =
                'Le prénom est obligatoire.';
        }

        if (person.last_name.trim() === '') {
            errors[`persons.${index}.last_name`] = 'Le nom est obligatoire.';
        }

        if (person.documents.length === 0) {
            errors[`persons.${index}.documents`] =
                'Cochez au moins une pièce pour cette personne.';
        }
    });

    return errors;
}
