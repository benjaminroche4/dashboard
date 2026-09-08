import type {
    AccessMap,
    NavGroup,
    NavItem,
    NavSubItem,
    SiteSection,
} from '@/types';

/** Vrai si la section est au moins consultable (`access` absent = tout ouvert). */
export function canAccessSection(
    access: AccessMap | null | undefined,
    section: SiteSection,
): boolean {
    return !access || (access[section] ?? 'none') !== 'none';
}

function subItemVisible(
    access: AccessMap | null | undefined,
    sub: NavSubItem,
): boolean {
    if (sub.anySection) {
        return sub.anySection.some((section) =>
            canAccessSection(access, section),
        );
    }

    return sub.section === undefined || canAccessSection(access, sub.section);
}

/**
 * Menu limité aux sections ouvertes au membre : les sous-liens fermés
 * disparaissent, un menu dépliable sans sous-lien restant aussi, et un groupe
 * vide n'est plus affiché. Un lien sans section reste toujours visible.
 */
export function filterNavGroups(
    groups: NavGroup[],
    access: AccessMap | null | undefined,
): NavGroup[] {
    if (!access) {
        return groups;
    }

    return groups
        .map((group): NavGroup => ({
            ...group,
            items: group.items.flatMap((item): NavItem[] => {
                if (item.items) {
                    const items = item.items.filter((sub) =>
                        subItemVisible(access, sub),
                    );

                    return items.length === 0
                        ? []
                        : [
                              {
                                  ...item,
                                  items,
                                  href: items[0]?.href ?? item.href,
                              },
                          ];
                }

                return item.section === undefined ||
                    canAccessSection(access, item.section)
                    ? [item]
                    : [];
            }),
        }))
        .filter((group) => group.items.length > 0);
}
