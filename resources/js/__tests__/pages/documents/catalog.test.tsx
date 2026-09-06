import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, patch, del } = vi.hoisted(() => ({
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: del },
    useForm: (initial: Record<string, string>) => useFormStub(initial),
}));

function useFormStub(initial: Record<string, string>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {} as Record<string, string | undefined>,
        processing: false,
        setData: (key: string | Record<string, string>, value?: string) =>
            setDataState((current) =>
                typeof key === 'string'
                    ? { ...current, [key]: value ?? '' }
                    : { ...current, ...key },
            ),
        clearErrors: () => undefined,
        post,
        patch,
    };
}

import DocumentsCatalog from '@/pages/documents/catalog';
import {
    catalogAdminGroups,
    catalogCategories,
} from '@/test/fixtures/catalog-document';

const renderPage = () =>
    render(
        <DocumentsCatalog
            groups={catalogAdminGroups}
            categories={catalogCategories}
        />,
    );

describe('Documents catalog page', () => {
    beforeEach(() => {
        post.mockClear();
        patch.mockClear();
        del.mockClear();
    });

    it('lists the categories with their documents, translations and empty state', () => {
        renderPage();

        expect(
            screen.getByRole('heading', { name: 'Catalogue des pièces' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/2 pièce\(s\)/)).toBeInTheDocument();

        const identity = screen.getByRole('region', { name: 'Identité' });
        expect(identity).toHaveTextContent("Passeport ou carte d'identité");
        expect(identity).toHaveTextContent('Recto et verso');
        expect(identity).toHaveTextContent('Passport or ID card');
        expect(identity).toHaveTextContent('non traduit');

        expect(
            screen.getByRole('region', { name: 'Travail' }),
        ).toHaveTextContent('Aucune pièce dans cette catégorie.');
    });

    it('opens the dialog to add a document in a category and posts it', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole('button', {
                name: 'Ajouter une pièce dans Travail',
            }),
        );

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('Ajouter une pièce');
        await user.type(
            within(dialog).getByLabelText('Libellé'),
            'Attestation de télétravail',
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Ajouter la pièce' }),
        );

        expect(post).toHaveBeenCalledWith(
            '/tools/documents/catalog',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('edits an existing document with PATCH', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole('button', {
                name: "Modifier Passeport ou carte d'identité",
            }),
        );

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent(
            "Modifier « Passeport ou carte d'identité »",
        );
        expect(within(dialog).getByLabelText('Libellé')).toHaveValue(
            "Passeport ou carte d'identité",
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Enregistrer' }),
        );

        expect(patch).toHaveBeenCalledWith(
            '/tools/documents/catalog/1',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('asks for confirmation before deleting', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(
            screen.getByRole('button', { name: 'Supprimer Livret de famille' }),
        );
        expect(await screen.findByRole('dialog')).toHaveTextContent(
            'Supprimer « Livret de famille » ?',
        );
        await user.click(
            screen.getByRole('button', { name: 'Supprimer la pièce' }),
        );

        expect(del).toHaveBeenCalledWith(
            '/tools/documents/catalog/2',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
