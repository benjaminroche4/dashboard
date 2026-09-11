import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { download, post, patch } = vi.hoisted(() => ({
    download: vi.fn().mockResolvedValue(true),
    post: vi.fn(),
    patch: vi.fn(),
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
    router: { delete: vi.fn(), post, patch },
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
                name: 'Liste de pièces · Léa Martin',
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

    it('proposes every address of the linked file, and lets one be added', async () => {
        const user = userEvent.setup();
        render(
            <DocumentsShow
                request={makeDocumentRequestDetail({
                    lead_emails: ['lea@example.com', 'marc@example.com'],
                })}
                pdfAvailable
            />,
        );

        expect(
            screen.getByLabelText('Code d’appairage 482913'),
        ).toHaveTextContent('482913');

        await user.click(
            screen.getByRole('button', { name: 'Envoyer par e-mail' }),
        );

        // Les deux adresses du dossier sont là d'office.
        expect(screen.getByLabelText('Destinataire 1')).toHaveValue(
            'lea@example.com',
        );
        expect(screen.getByLabelText('Destinataire 2')).toHaveValue(
            'marc@example.com',
        );

        // On en retire une, on en ajoute une autre.
        await user.click(
            screen.getByRole('button', { name: 'Retirer marc@example.com' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Ajouter un destinataire' }),
        );
        await user.type(
            screen.getByLabelText('Destinataire 2'),
            'agence@example.com',
        );
        await user.click(screen.getByRole('button', { name: 'Envoyer' }));

        expect(post).toHaveBeenCalledWith(
            '/tools/documents/0199b0c0-0000-7000-8000-000000000001/send-link',
            { emails: ['lea@example.com', 'agence@example.com'] },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('links a list created without a lead, and detaches it', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <DocumentsShow
                request={makeDocumentRequestDetail({ lead: null })}
                pdfAvailable
            />,
        );

        expect(
            screen.getByText('Aucun lead rattaché à cette liste.'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Lier à un lead' }),
        ).toBeInTheDocument();

        // Une fois rattachée, la fiche mène au lead et propose de le détacher.
        rerender(
            <DocumentsShow
                request={makeDocumentRequestDetail({
                    lead: {
                        id: 4,
                        uuid: '0199a9a0-0000-7000-8000-0000000000e1',
                        name: 'Léa Durand',
                        reference: 'LD-4821',
                    },
                })}
                pdfAvailable
            />,
        );
        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute(
            'href',
            '/locataires/0199a9a0-0000-7000-8000-0000000000e1',
        );

        await user.click(screen.getByRole('button', { name: 'Détacher' }));
        expect(patch).toHaveBeenCalledWith(
            expect.stringContaining('/lead'),
            { lead_id: null },
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
