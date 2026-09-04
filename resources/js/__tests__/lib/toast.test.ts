import { describe, expect, it, vi } from 'vitest';

const { add, update, close } = vi.hoisted(() => ({
    add: vi.fn(() => 'id-1'),
    update: vi.fn(),
    close: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ toast: { add, update, close } }));

import { notify } from '@/lib/toast';

describe('notify', () => {
    it('adds typed toasts with a title and an optional description', () => {
        notify.success('Enregistré', 'Tout est en ordre.');
        notify.error('Erreur');

        expect(add).toHaveBeenCalledWith({
            type: 'success',
            title: 'Enregistré',
            description: 'Tout est en ordre.',
        });
        expect(add).toHaveBeenCalledWith({
            type: 'error',
            title: 'Erreur',
            description: undefined,
        });
    });

    it('keeps a loading toast open and updates it in place on resolve or reject', () => {
        const id = notify.loading('Génération…');
        notify.resolve(id, 'Terminé');
        notify.reject(id, 'Échec', 'Réessayez.');

        expect(add).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'loading', timeout: 0 }),
        );
        expect(update).toHaveBeenCalledWith(
            'id-1',
            expect.objectContaining({ type: 'success', title: 'Terminé' }),
        );
        expect(update).toHaveBeenCalledWith(
            'id-1',
            expect.objectContaining({
                type: 'error',
                description: 'Réessayez.',
            }),
        );
    });
});
