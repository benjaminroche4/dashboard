import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post, on: () => () => undefined },
    usePage: () => ({ props: { errors: {} } }),
}));

vi.mock('@/lib/toast', () => ({
    notify: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
    },
}));

import { notify } from '@/lib/toast';
import PublicDocumentUpload, {
    rejectionMessage,
    uploadProgress,
} from '@/pages/public/document-upload';
import { makePublicPerson } from '@/test/fixtures/document-request';

const labels = {
    title: 'Vos pièces justificatives',
    intro: 'Merci de réunir les pièces ci-dessous.',
    drop: 'Déposez vos fichiers ici ou cliquez pour les choisir',
    formats: 'PDF uniquement · 2 Mo par fichier',
    too_large: 'Fichier trop lourd (2 Mo au maximum) :',
    wrong_type: 'Seul le format PDF est accepté :',
    too_many: '10 fichiers au maximum à la fois.',
    too_heavy:
        'Envoi trop lourd (7,5 Mo au maximum) : déposez vos fichiers en plusieurs fois.',
    uploaded: 'Fichiers reçus',
    view: 'Ouvrir',
    none: 'Aucun fichier pour le moment',
    sending: 'Envoi en cours…',
    done: 'Pièce reçue',
    privacy_title: 'Vos documents sont entre de bonnes mains',
    privacy_secure: 'Connexion chiffrée : vos fichiers voyagent protégés.',
    privacy_private:
        'Accès réservé : seule l’équipe qui suit votre dossier peut les ouvrir.',
    privacy_kept: 'Jamais revendus ni transmis à un tiers.',
    progress: ':done pièce(s) reçue(s) sur :total',
    refused: 'Pièce refusée, merci d’en déposer une autre.',
};

function renderPage(persons = [makePublicPerson()]) {
    return render(
        <PublicDocumentUpload
            request={{
                name: 'Léa Martin',
                language: 'fr',
                message: 'Avant le 15 si possible.',
                persons,
            }}
            uploadUrl="/depot/tok-abc"
            limits={{ file: 2 * 1024 * 1024, files: 10, total: 7_864_320 }}
            company={{
                name: 'Relocation In Paris',
                email: 'contact@example.com',
                phone: '+33 1 00 00 00 00',
            }}
            labels={labels}
        />,
    );
}

describe('uploadProgress', () => {
    it('counts the documents with at least one file', () => {
        expect(uploadProgress([makePublicPerson()])).toEqual({
            done: 1,
            total: 2,
        });
        expect(uploadProgress([])).toEqual({ done: 0, total: 0 });
    });
});

describe('Public document upload page', () => {
    it('shows the person, the documents, the received files, the progress and one dropzone per document', () => {
        renderPage();

        expect(
            screen.getByRole('heading', { name: 'Vos pièces justificatives' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tabpanel', { name: /Léa Martin/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Avant le 15 si possible.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(
            '1 pièce(s) reçue(s) sur 2',
        );
        expect(
            screen.getByText("Passeport ou carte d'identité"),
        ).toBeInTheDocument();
        expect(screen.getByText('Pièce reçue')).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('list', {
                    name: 'Fichiers reçus · 3 derniers bulletins de salaire',
                }),
            ).getByText('bulletin-juin.pdf'),
        ).toBeInTheDocument();
        expect(screen.getAllByText(labels.drop)).toHaveLength(2);
        // Le pied de page rassure au lieu d'afficher un numéro de téléphone.
        expect(
            screen.queryByRole('link', { name: 'contact@example.com' }),
        ).toBeNull();
        expect(
            screen.getByRole('region', {
                name: 'Vos documents sont entre de bonnes mains',
            }),
        ).toBeInTheDocument();
    });

    it('gives each person of the household a tab, and never repeats the name below it', async () => {
        const user = userEvent.setup();
        const guarantor = makePublicPerson({
            index: 1,
            name: 'Marc Durand',
            role: 'Garant',
            categories: [
                {
                    value: 'identity',
                    label: 'Identité',
                    documents: [
                        {
                            key: 'id_document',
                            label: "Passeport ou carte d'identité",
                            hint: null,
                            uploads: [],
                        },
                    ],
                },
            ],
        });
        renderPage([makePublicPerson(), guarantor]);

        // Un onglet par personne, avec son avancement.
        const tabs = within(screen.getByRole('tablist'));
        expect(tabs.getByRole('tab', { name: /Léa Martin/ })).toHaveTextContent(
            '1/2',
        );
        expect(
            tabs.getByRole('tab', { name: /Marc Durand/ }),
        ).toHaveTextContent('0/1');

        // Le nom vit dans l'onglet : le panneau ne le répète pas.
        const panel = screen.getByRole('tabpanel', { name: /Léa Martin/ });
        expect(
            within(panel).queryByRole('heading', { name: 'Léa Martin' }),
        ).toBeNull();
        expect(within(panel).queryByText('Locataire')).toBeNull();

        // On passe au garant : ses pièces à lui s'affichent.
        await user.click(tabs.getByRole('tab', { name: /Marc Durand/ }));
        expect(
            screen.getByRole('tabpanel', { name: /Marc Durand/ }),
        ).toBeInTheDocument();
    });

    it('names the refused file and why, rather than an english byte count', () => {
        expect(
            rejectionMessage(
                [
                    {
                        file: new File([''], 'cni.jpg'),
                        errors: [
                            { code: 'file-invalid-type', message: 'nope' },
                        ],
                    },
                ] as never,
                labels,
            ),
        ).toBe('Seul le format PDF est accepté : cni.jpg');

        expect(
            rejectionMessage(
                [
                    {
                        file: new File([''], 'avis.pdf'),
                        errors: [{ code: 'file-too-large', message: 'nope' }],
                    },
                ] as never,
                labels,
            ),
        ).toBe('Fichier trop lourd (2 Mo au maximum) : avis.pdf');

        expect(
            rejectionMessage(
                [
                    {
                        file: new File([''], 'a.pdf'),
                        errors: [{ code: 'too-many-files', message: 'nope' }],
                    },
                ] as never,
                labels,
            ),
        ).toBe(labels.too_many);
    });

    it('refuses a drop heavier than the whole request allows, without asking the server', async () => {
        const user = userEvent.setup();
        renderPage();

        // Chaque fichier passe la limite d'un fichier ; c'est leur somme qui
        // dépasse ce que PHP accepte pour un envoi.
        const files = [1, 2, 3, 4, 5].map((index) => {
            const file = new File(['x'], `piece-${index}.pdf`, {
                type: 'application/pdf',
            });
            Object.defineProperty(file, 'size', { value: 1_800_000 });

            return file;
        });

        const zone = screen.getAllByRole('button', {
            name: new RegExp(labels.drop),
        })[0]!;
        const input = zone.querySelector('input[type="file"]')!;
        await user.upload(input as HTMLInputElement, files);

        expect(notify.error).toHaveBeenCalledWith(labels.too_heavy);
        expect(post).not.toHaveBeenCalled();
    });

    it('posts the dropped files as multipart for the right person and document', async () => {
        const user = userEvent.setup();
        renderPage();

        const file = new File(['x'], 'passeport.pdf', {
            type: 'application/pdf',
        });
        const inputs = document.querySelectorAll('input[type="file"]');
        await user.upload(inputs[0] as HTMLInputElement, file);

        expect(post).toHaveBeenCalledWith(
            '/depot/tok-abc',
            { person: 0, document: 'id_document', files: [file] },
            expect.objectContaining({
                forceFormData: true,
                preserveScroll: true,
            }),
        );
    });

    it('lets the client reopen a file they have just sent', () => {
        renderPage();

        // Le nom du fichier est un lien : on relit ce qu'on a déposé.
        const file = screen.getByTitle('Ouvrir · bulletin-juin.pdf');

        expect(file).toHaveAttribute('href', '/depot/jeton/fichiers/up-1');
        expect(file).toHaveAttribute('target', '_blank');
    });
});
