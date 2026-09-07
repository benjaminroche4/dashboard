import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { download } = vi.hoisted(() => ({
    download: vi.fn().mockResolvedValue(true),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        children,
    }: {
        href: { url: string };
        children: ReactNode;
    }) => <a href={href.url}>{children}</a>,
    router: { delete: vi.fn() },
    usePage: () => ({
        props: { auth: { user: { id: 1, name: 'Admin', role: 'admin' } } },
    }),
}));

vi.mock('@/lib/download-document-request-pdf', () => ({
    downloadDocumentRequestPdf: download,
}));

import DocumentsShow from '@/pages/documents/show';
import { makeDocumentRequestDetail } from '@/test/fixtures/document-request';

describe('Documents show page', () => {
    beforeEach(() => {
        download.mockClear();
    });

    it('shows each person by name with their documents, the client and the upload link, without sending', () => {
        render(
            <DocumentsShow
                request={makeDocumentRequestDetail({
                    person_count: 2,
                    persons: [
                        ...makeDocumentRequestDetail().persons,
                        {
                            name: 'Paul Martin',
                            role: 'Garant',
                            categories: [
                                {
                                    value: 'finance',
                                    label: 'Finance',
                                    documents: [
                                        {
                                            label: 'Avis d’imposition',
                                            hint: null,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                })}
                pdfAvailable
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: 'Liste de documents · Léa Martin',
            }),
        ).toBeInTheDocument();
        expect(screen.getByText('Locataire')).toBeInTheDocument();
        expect(screen.getByText('créée par')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('6 septembre 2026')).toBeInTheDocument();
        expect(screen.getByText('Paul Martin')).toBeInTheDocument();
        expect(screen.getByText('Garant')).toBeInTheDocument();
        expect(
            screen.getByText("Passeport ou carte d'identité"),
        ).toBeInTheDocument();
        expect(screen.getByText('Recto et verso')).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Identité' }),
        ).toHaveTextContent("Passeport ou carte d'identité");
        expect(
            screen.getByRole('region', { name: 'Finance' }),
        ).toHaveTextContent('Avis d’imposition');
        expect(
            screen.getByRole('link', { name: /drive.google.com/ }),
        ).toHaveAttribute('href', 'https://drive.google.com/drive/folders/abc');
        expect(
            screen.getByText('Merci de tout déposer avant le 15.'),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Envoyer au client/ }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Modifier/ })).toHaveAttribute(
            'href',
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001/edit',
        );
        expect(
            screen.getByRole('button', { name: 'Actions pour Léa Martin' }),
        ).toBeInTheDocument();
        expect(screen.queryByText('À envoyer')).not.toBeInTheDocument();
    });

    it('downloads the PDF', async () => {
        const user = userEvent.setup();
        render(
            <DocumentsShow
                request={makeDocumentRequestDetail()}
                pdfAvailable
            />,
        );

        await user.click(
            screen.getByRole('button', { name: /Télécharger le PDF/ }),
        );
        expect(download).toHaveBeenCalledWith(
            '0199b0c0-0000-7000-8000-000000000001',
            'Léa Martin',
        );
    });

    it('disables the PDF without DocRaptor and falls back to the person number', () => {
        render(
            <DocumentsShow
                request={makeDocumentRequestDetail({
                    persons: [
                        {
                            ...makeDocumentRequestDetail().persons[0]!,
                            name: '',
                        },
                    ],
                })}
                pdfAvailable={false}
            />,
        );

        expect(
            screen.getByRole('button', { name: /Télécharger le PDF/ }),
        ).toBeDisabled();
        expect(screen.getByText('Personne 1')).toBeInTheDocument();
    });
});
