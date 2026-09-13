import { configure, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// La page compare plusieurs habillages de carte : les variantes non choisies
// restent dans le DOM avec `hidden`. Les requêtes par texte les ignorent, pour
// n'interroger que ce que le client voit vraiment.
beforeAll(() =>
    configure({ defaultIgnore: 'script, style, [hidden], [hidden] *' }),
);
afterAll(() => configure({ defaultIgnore: 'script, style' }));

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

    it('lets the client reopen a file they have just sent, without downloading it', async () => {
        const user = userEvent.setup();
        renderPage();

        // La pièce s'ouvre dans la page, comme sur un espace de fichiers.
        await user.click(screen.getByTitle('Ouvrir · bulletin-juin.pdf'));

        const viewer = await screen.findByRole('dialog');
        expect(
            within(viewer).getByTitle('Aperçu de bulletin-juin.pdf'),
        ).toHaveAttribute('src', '/depot/jeton/fichiers/up-1');
        // Rien n'est téléchargé : le client relit, il ne collectionne pas.
        expect(
            within(viewer).queryByRole('link', { name: /Télécharger/ }),
        ).not.toBeInTheDocument();
    });

    it('tells the client what the team decided, and why a document was refused', () => {
        const person = makePublicPerson();
        renderPage([
            {
                ...person,
                categories: [
                    {
                        ...person.categories[0]!,
                        documents: [
                            {
                                key: 'payslips',
                                label: '3 derniers bulletins de salaire',
                                hint: null,
                                uploads: [
                                    {
                                        uuid: 'up-1',
                                        name: 'bulletin-juin.pdf',
                                        size: 120_000,
                                        uploaded_at: null,
                                        status: 'refused',
                                        status_label: 'Rejected',
                                        review_note: 'Page missing.',
                                        url: '/depot/jeton/fichiers/up-1',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]);

        const item = screen
            .getByText('bulletin-juin.pdf')
            .closest('li') as HTMLElement;
        // Rouge sur un refus, et le motif dit quoi redéposer.
        expect(item.querySelector('.bg-red-50')).not.toBeNull();
        expect(
            within(item).getByText('Rejected — Page missing.'),
        ).toBeInTheDocument();
    });

    it('marks the step by the review, not by the mere arrival of a file', () => {
        const step = (status: 'pending' | 'accepted' | 'refused') =>
            makePublicPerson({
                categories: [
                    {
                        value: 'finance',
                        label: 'Finance',
                        documents: [
                            {
                                key: 'rib',
                                label: 'RIB',
                                hint: null,
                                uploads: [
                                    {
                                        uuid: 'u1',
                                        name: 'rib.pdf',
                                        size: 1000,
                                        uploaded_at: null,
                                        status,
                                        status_label: status,
                                        review_note: null,
                                        url: '/depot/jeton/fichiers/u1',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

        // Déposée mais pas encore relue : rien n'est promis au client.
        const deposited = renderPage([step('pending')]);
        expect(screen.queryByText('Pièce reçue')).toBeNull();
        expect(screen.queryByText(/Pièce refusée/)).toBeNull();
        deposited.unmount();

        // Validée par l'équipe : la coche verte, et elle se dit à voix haute.
        const approved = renderPage([step('accepted')]);
        expect(screen.getByText('Pièce reçue')).toBeInTheDocument();
        approved.unmount();

        // Refusée : une croix, jamais une coche.
        renderPage([step('refused')]);
        expect(screen.getByText(/Pièce refusée/)).toBeInTheDocument();
        expect(screen.queryByText('Pièce reçue')).toBeNull();
    });
});
