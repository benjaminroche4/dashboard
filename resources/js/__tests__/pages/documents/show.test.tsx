import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { download, post } = vi.hoisted(() => ({
    download: vi.fn().mockResolvedValue(true),
    post: vi.fn(),
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
    router: { delete: vi.fn(), post },
    usePage: () => ({
        props: { auth: { user: { id: 1, name: 'Admin', role: 'admin' } } },
    }),
}));

vi.mock('@/lib/download-document-request-pdf', () => ({
    downloadDocumentRequestPdf: download,
}));

import DocumentsShow from '@/pages/documents/show';
import {
    makeDocumentRequestDetail,
    makeDocumentUpload,
} from '@/test/fixtures/document-request';

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
            screen.getByRole('link', { name: /depot\/tok-abc/ }),
        ).toHaveAttribute('href', 'https://dashboard.test/depot/tok-abc');
        expect(
            screen.getByRole('button', { name: 'Copier le lien' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Aucun fichier reçu pour le moment.'),
        ).toBeInTheDocument();
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

    it('lists the files received for a document with download links and hides the external folder without one', () => {
        const detail = makeDocumentRequestDetail({
            upload_url: null,
            uploads_count: 1,
        });
        detail.persons[0].categories[0].documents[0].uploads = [
            makeDocumentUpload(),
        ];
        render(<DocumentsShow request={detail} pdfAvailable />);

        expect(screen.getByText('1 fichier reçu.')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'passeport.pdf' }),
        ).toHaveAttribute(
            'href',
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001/uploads/0199b0c0-0000-7000-8000-0000000000aa',
        );
        expect(screen.getByText(/239 Ko/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Supprimer passeport.pdf' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /drive.google.com/ }),
        ).not.toBeInTheDocument();
    });

    it('shows the pairing code and emails the upload link to the lead address', async () => {
        const user = userEvent.setup();
        render(
            <DocumentsShow
                request={makeDocumentRequestDetail()}
                pdfAvailable
            />,
        );

        expect(
            screen.getByLabelText('Code d’appairage 482913'),
        ).toHaveTextContent('482913');

        await user.click(
            screen.getByRole('button', { name: 'Envoyer par e-mail' }),
        );
        expect(screen.getByLabelText('E-mail du client')).toHaveValue(
            'lea@example.com',
        );
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));

        expect(post).toHaveBeenCalledWith(
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001/send-link',
            { email: 'lea@example.com' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('recalls the last sending of the link', () => {
        render(
            <DocumentsShow
                request={makeDocumentRequestDetail({
                    link_sent_to: 'lea@example.com',
                    link_sent_at: '2026-09-08T10:00:00+02:00',
                })}
                pdfAvailable
            />,
        );

        expect(
            screen.getByText(/Envoyé à lea@example.com le 8 septembre/),
        ).toBeInTheDocument();
    });
});
