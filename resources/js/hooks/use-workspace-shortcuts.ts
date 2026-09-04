import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { dashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';

/**
 * Raccourcis annoncés dans le menu d'espace de travail :
 * ⌘D (ou Ctrl+D) → tableau de bord, ⌘, (ou Ctrl+,) → paramètres.
 */
export function useWorkspaceShortcuts(): void {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.altKey) {
                return;
            }

            if (event.key.toLowerCase() === 'd') {
                event.preventDefault();
                router.visit(dashboard().url);
            } else if (event.key === ',') {
                event.preventDefault();
                router.visit(editProfile().url);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
}
