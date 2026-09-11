import type {
    AccessLevel,
    AccessLevelOption,
    AccessMap,
    SiteSection,
    SiteSectionOption,
    StaffRole,
} from '@/types';

/** Rang croissant des niveaux, pour comparer et résumer. */
export const levelRank: Record<AccessLevel, number> = {
    none: 0,
    read: 1,
    write: 2,
    manage: 3,
};

/** Groupes de sections dans l'ordre d'apparition des options. */
export function groupSections(
    options: SiteSectionOption[],
): { group: string; options: SiteSectionOption[] }[] {
    const groups: { group: string; options: SiteSectionOption[] }[] = [];

    for (const option of options) {
        const existing = groups.find((entry) => entry.group === option.group);

        if (existing) {
            existing.options.push(option);
        } else {
            groups.push({ group: option.group, options: [option] });
        }
    }

    return groups;
}

/** Sections dont le niveau diffère de celui du rôle. */
export function customizedSections(
    permissions: AccessMap,
    defaults: AccessMap,
): SiteSection[] {
    return (Object.keys(permissions) as SiteSection[]).filter(
        (section) => permissions[section] !== defaults[section],
    );
}

/**
 * Même niveau sur toutes les sections, borné section par section : « Gérer »
 * n'existe pas là où il n'ajoute rien (miroir de SiteSection::clamp()).
 */
export function setEveryLevel(
    permissions: AccessMap,
    level: AccessLevel,
    sections: SiteSectionOption[] = [],
): AccessMap {
    const noManage = new Set(
        sections.filter((section) => !section.has_manage).map((s) => s.value),
    );

    return Object.fromEntries(
        Object.keys(permissions).map((section) => [
            section,
            level === 'manage' && noManage.has(section as SiteSection)
                ? 'write'
                : level,
        ]),
    ) as AccessMap;
}

/** Niveaux proposés par une section : « Gérer » seulement s'il ajoute une action. */
export function levelsFor(
    levels: AccessLevelOption[],
    section: SiteSectionOption,
): AccessLevelOption[] {
    return section.has_manage
        ? levels
        : levels.filter((level) => level.value !== 'manage');
}

/** Niveaux d'un rôle, tels qu'ils s'appliqueraient sans personnalisation. */
export function defaultsFor(
    roleDefaults: Record<StaffRole, AccessMap>,
    role: StaffRole,
): AccessMap {
    return { ...roleDefaults[role] };
}

/** Compte des sections par niveau, pour le résumé (« 3 fermées, 2 en consultation… »). */
export function summarize(permissions: AccessMap): Record<AccessLevel, number> {
    const counts: Record<AccessLevel, number> = {
        none: 0,
        read: 0,
        write: 0,
        manage: 0,
    };

    for (const level of Object.values(permissions)) {
        counts[level] += 1;
    }

    return counts;
}
