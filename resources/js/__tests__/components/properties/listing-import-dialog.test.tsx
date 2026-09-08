import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListingImportDialog } from '@/components/properties/listing-import-dialog';

const extraction = {
    property: {
        street: '12 rue Oberkampf',
        postal_code: '75011',
        district: '11',
        rent: '1500',
    },
    filled: ['street', 'postal_code', 'district', 'rent'],
    highlights: ['Ascenseur'],
    agent_name: 'Zoé Martin',
    agency_name: null,
    source: 'url' as const,
};

describe('ListingImportDialog', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('posts the pasted listing to the extraction route and hands the result back', async () => {
        const user = userEvent.setup();
        const fetchMock = vi
            .fn()
            .mockResolvedValue({ ok: true, json: async () => extraction });
        vi.stubGlobal('fetch', fetchMock);
        const onExtracted = vi.fn();
        const onOpenChange = vi.fn();
        render(
            <ListingImportDialog
                open
                onOpenChange={onOpenChange}
                onExtracted={onExtracted}
            />,
        );

        const dialog = within(screen.getByRole('dialog'));
        expect(
            dialog.getByLabelText('Proposé par l’assistant IA'),
        ).toBeInTheDocument();
        const button = dialog.getByRole('button', {
            name: 'Analyser l’annonce',
        });
        expect(button).toBeDisabled();
        await user.type(
            dialog.getByLabelText('Lien ou texte de l’annonce'),
            'https://www.seloger.com/annonces/123.htm',
        );
        await user.click(button);

        await waitFor(() =>
            expect(onExtracted).toHaveBeenCalledWith(extraction),
        );
        expect(fetchMock).toHaveBeenCalledWith(
            '/properties/extract',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    input: 'https://www.seloger.com/annonces/123.htm',
                }),
            }),
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows the server message when the page cannot be read', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                json: async () => ({
                    message: 'Impossible de lire cette page.',
                }),
            }),
        );
        const onExtracted = vi.fn();
        render(
            <ListingImportDialog
                open
                onOpenChange={vi.fn()}
                onExtracted={onExtracted}
            />,
        );

        await user.type(
            screen.getByLabelText('Lien ou texte de l’annonce'),
            'https://blocked.example/annonce',
        );
        await user.click(
            screen.getByRole('button', { name: 'Analyser l’annonce' }),
        );

        expect(
            await screen.findByText('Impossible de lire cette page.'),
        ).toBeInTheDocument();
        expect(onExtracted).not.toHaveBeenCalled();
    });
});
