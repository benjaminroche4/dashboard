import { expect, type Page } from '@playwright/test';

/**
 * Renvoie les éléments qui dépassent horizontalement du cadre (à droite ou à gauche).
 * Sont ignorés : les éléments invisibles, ceux en `position: fixed` et leurs descendants
 * (le tiroir mobile de la sidebar est hors écran par conception), et les descendants d'un
 * conteneur dont le débordement horizontal est contrôlé (`overflow-x: auto|scroll|hidden|clip`).
 * Chaque fautif est décrit par un identifiant lisible : balise, id, premières classes,
 * position et début du texte.
 */
export async function findOverflowingElements(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const width = window.innerWidth;
        const offenders: string[] = [];
        const tolerance = 1;

        const isClipped = (element: Element): boolean => {
            let parent = element.parentElement;
            while (parent && parent !== document.body) {
                const style = getComputedStyle(parent);
                if (style.position === 'fixed') {
                    return true;
                }
                if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
                    return true;
                }
                parent = parent.parentElement;
            }
            return false;
        };

        for (const element of document.querySelectorAll('body *')) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                continue;
            }
            const style = getComputedStyle(element);
            if (
                style.position === 'fixed' ||
                style.visibility === 'hidden' ||
                style.display === 'contents'
            ) {
                continue;
            }
            if (rect.right <= width + tolerance && rect.left >= -tolerance) {
                continue;
            }
            if (isClipped(element)) {
                continue;
            }
            const classes = String(element.className || '')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 4)
                .join('.');
            const label =
                element.tagName.toLowerCase() +
                (element.id ? `#${element.id}` : '') +
                (classes ? `.${classes}` : '');
            const text = (element.textContent ?? '').trim().slice(0, 40);
            offenders.push(
                `${label.slice(0, 140)} [left=${Math.round(rect.left)} right=${Math.round(rect.right)} width=${Math.round(rect.width)}]${text ? ` « ${text} »` : ''}`,
            );
        }

        return offenders.slice(0, 10);
    });
}

/**
 * Vérifie qu'aucun élément ne dépasse du cadre. La détection est sondée pendant
 * quelques instants pour laisser passer les états transitoires (transitions de la
 * sidebar, hydratation) ; le message d'échec liste les fautifs.
 */
export async function expectNoOverflow(
    page: Page,
    label: string,
): Promise<void> {
    let offenders: string[] = [];
    await expect
        .poll(
            async () => {
                offenders = await findOverflowingElements(page);
                return offenders.length;
            },
            {
                message: `${label} : des éléments dépassent du cadre`,
                timeout: 2_000,
                intervals: [250, 500, 750],
            },
        )
        .toBe(0)
        .catch(() => {
            throw new Error(
                `${label} : ${offenders.length} élément(s) dépassent du cadre\n  ${offenders.join('\n  ')}`,
            );
        });
}
