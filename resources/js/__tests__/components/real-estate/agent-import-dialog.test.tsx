import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentImportDialog } from '@/components/real-estate/agent-import-dialog';

const post = vi.fn();

vi.mock('@inertiajs/react', () => ({
    router: { post: (...args: unknown[]) => post(...args) },
}));

describe('AgentImportDialog', () => {
    beforeEach(() => post.mockReset());

    it('previews the pasted rows and posts them', async () => {
        const user = userEvent.setup();
        render(<AgentImportDialog open onOpenChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Importer' })).toBeDisabled();

        await user.click(screen.getByLabelText('Lignes à importer'));
        await user.paste(
            'Zoé\tMartin\tAgence du Marais\tNégociatrice\tzoe@marais.fr\t+33 6 12 34 56 78\n\tSansPrenom',
        );

        const preview = screen.getByTestId('import-preview');
        expect(preview).toHaveTextContent(
            '1 agent(s) reconnu(s), 1 ligne(s) ignorée(s) sans prénom ou nom (2).',
        );
        expect(preview).toHaveTextContent('Zoé Martin · Négociatrice');

        await user.click(screen.getByRole('button', { name: 'Importer (1)' }));
        expect(post).toHaveBeenCalledWith(
            '/real-estate/agents/import',
            {
                rows: [
                    {
                        first_name: 'Zoé',
                        last_name: 'Martin',
                        agency: 'Agence du Marais',
                        position: 'Négociatrice',
                        email: 'zoe@marais.fr',
                        phone: '+33 6 12 34 56 78',
                    },
                ],
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
