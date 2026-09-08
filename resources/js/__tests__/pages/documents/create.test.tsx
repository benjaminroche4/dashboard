import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, put, transform, toastError } = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    transform: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({ notify: { error: toastError } }));

vi.mock('@inertiajs/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/react')>();

    return {
        ...actual,
        Head: () => null,
        Link: ({ href, children }: { href: unknown; children: ReactNode }) => (
            <a
                href={
                    typeof href === 'string'
                        ? href
                        : (href as { url: string }).url
                }
            >
                {children}
            </a>
        ),
        useForm: (initial: Record<string, unknown>) => useFormStub(initial),
    };
});

function useFormStub(initial: Record<string, unknown>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {},
        processing: false,
        setData: (key: string, value: unknown) =>
            setDataState((current) => ({ ...current, [key]: value })),
        transform,
        post,
        put,
    };
}

import DocumentsCreate from '@/pages/documents/create';
import {
    catalog,
    languages,
    makeDocumentRequestEdit,
    roles,
} from '@/test/fixtures/document-request';

const renderPage = () =>
    render(
        <DocumentsCreate
            catalog={catalog}
            roles={roles}
            languages={languages}
        />,
    );

/** Boutons de navigation du récapitulatif « Personnes du foyer ». */
const tabs = () =>
    within(screen.getByRole('complementary', { name: 'Personnes du foyer' }))
        .getAllByRole('listitem')
        .map((item) => within(item).getByRole('button'));

const selected = (index: number) =>
    tabs()[index]?.getAttribute('aria-current') === 'true';

describe('Documents create page', () => {
    beforeEach(() => {
        post.mockClear();
        transform.mockClear();
        toastError.mockClear();
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('renders one person tab, its card, the PDF settings and the household summary, without e-mail', () => {
        renderPage();

        expect(
            screen.getByRole('heading', { name: 'Liste de documents' }),
        ).toBeInTheDocument();
        expect(tabs()).toHaveLength(1);
        expect(selected(0)).toBe(true);
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Personne 1' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/Prénom/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Nom/)).toBeInTheDocument();
        expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
        const language = screen.getByRole('radiogroup', {
            name: 'Langue du PDF',
        });
        expect(within(language).getByLabelText('Français')).toBeChecked();
        expect(within(language).getByLabelText('Anglais')).not.toBeChecked();
        expect(language.querySelectorAll('[data-country]')).toHaveLength(2);
        expect(screen.getByLabelText(/Lien sécurisé de dépôt/)).toHaveAttribute(
            'placeholder',
            'https://drive.google.com/...',
        );

        const summary = screen.getByRole('complementary', {
            name: 'Personnes du foyer',
        });
        expect(within(summary).getByText('1/4 max')).toBeInTheDocument();
        expect(
            within(summary).getByText('à compléter · Aucune pièce'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Créer la demande' }),
        ).toBeInTheDocument();
    });

    it('shows one person at a time, switches with the tabs and removes the active one', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText(/Prénom/), 'Léa');
        await user.type(screen.getByLabelText(/^Nom/), 'Martin');

        const add = screen.getByRole('button', {
            name: 'Ajouter une personne',
        });
        await user.click(add);

        // La nouvelle personne devient active, la première est repliée.
        expect(tabs()).toHaveLength(2);
        expect(selected(1)).toBe(true);
        expect(
            screen.getByRole('region', { name: 'Personne 2' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Personne 1' }),
        ).not.toBeInTheDocument();
        expect(screen.getByLabelText(/Prénom/)).toHaveValue('');

        await user.click(tabs()[0]!);
        expect(
            screen.getByRole('region', { name: 'Personne 1' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/Prénom/)).toHaveValue('Léa');
        expect(tabs()[0]).toHaveTextContent('Léa Martin');
        expect(screen.getByText('Personne 1 sur 2')).toBeInTheDocument();

        await user.click(add);
        await user.click(add);
        expect(screen.getByText('4/4 max')).toBeInTheDocument();
        expect(add).toBeDisabled();
        expect(tabs()).toHaveLength(4);

        await user.click(
            screen.getByRole('button', { name: 'Retirer la personne 4' }),
        );
        expect(screen.getByText('3/4 max')).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Personne 3' }),
        ).toBeInTheDocument();
    });

    it('blocks an incomplete submission, shows the errors and jumps to the faulty person', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText(/Prénom/), 'Léa');
        await user.type(screen.getByLabelText(/^Nom/), 'Martin');
        await user.click(screen.getByLabelText(/3 derniers bulletins/));
        await user.click(
            screen.getByRole('button', { name: 'Ajouter une personne' }),
        );
        await user.click(tabs()[0]!);

        await user.click(
            screen.getByRole('button', { name: 'Créer la demande' }),
        );

        expect(post).not.toHaveBeenCalled();
        expect(toastError).toHaveBeenCalledWith(
            'Formulaire incomplet',
            expect.any(String),
        );
        // La personne 2, incomplète, est affichée.
        expect(selected(1)).toBe(true);
        expect(
            screen.getByText('Le prénom est obligatoire.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Cochez au moins une pièce pour cette personne.'),
        ).toBeInTheDocument();
        expect(
            screen.queryByText('Le lien de dépôt est obligatoire.'),
        ).not.toBeInTheDocument();
    });

    it('posts the request once complete, trimming the empty message', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText(/Prénom/), 'Léa');
        await user.type(screen.getByLabelText(/^Nom/), 'Martin');
        await user.type(
            screen.getByLabelText(/Lien sécurisé de dépôt/),
            'https://drive.google.com/x',
        );
        await user.click(screen.getByLabelText(/3 derniers bulletins/));
        await user.click(
            screen.getByRole('button', { name: 'Créer la demande' }),
        );

        expect(toastError).not.toHaveBeenCalled();
        expect(post).toHaveBeenCalledWith('/tools/documents');

        const transformer = transform.mock.calls[0]?.[0] as (
            data: Record<string, unknown>,
        ) => Record<string, unknown>;
        expect(transformer({ message: '  ', language: 'fr' })).toMatchObject({
            message: null,
            language: 'fr',
        });
    });

    it('prefills an existing list, shows its persons and saves with PUT', async () => {
        const user = userEvent.setup();
        render(
            <DocumentsCreate
                catalog={catalog}
                roles={roles}
                languages={languages}
                request={makeDocumentRequestEdit()}
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: 'Modifier la liste de Léa Martin',
            }),
        ).toBeInTheDocument();
        expect(tabs()).toHaveLength(2);
        expect(tabs()[1]).toHaveTextContent('Paul Martin');
        expect(screen.getByLabelText(/Prénom/)).toHaveValue('Léa');
        expect(screen.getByLabelText('Anglais')).toBeChecked();
        expect(screen.getByLabelText(/Lien sécurisé de dépôt/)).toHaveValue(
            'https://drive.google.com/drive/folders/abc',
        );
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001',
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Enregistrer les modifications',
            }),
        );

        expect(toastError).not.toHaveBeenCalled();
        expect(post).not.toHaveBeenCalled();
        expect(put).toHaveBeenCalledWith(
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001',
        );
    });
});
