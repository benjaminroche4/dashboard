import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, toastWarning } = vi.hoisted(() => ({
    post: vi.fn(),
    toastWarning: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ router: { post } }));
vi.mock('@/lib/toast', () => ({
    notify: { error: vi.fn(), warning: toastWarning },
}));

import { VisitReportDialog } from '@/components/visits/visit-report-dialog';
import { makeVisit } from '@/test/fixtures/visit';

const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

const open = (visit = makeVisit()) => {
    render(<VisitReportDialog visit={visit} open onOpenChange={vi.fn()} />);

    return visit;
};

/** Champ caché de la dropzone, seul moyen de déposer un fichier en test. */
const dropzoneInput = () =>
    document.querySelector<HTMLInputElement>('input[type="file"]')!;

describe('VisitReportDialog', () => {
    beforeEach(() => {
        post.mockClear();
        toastWarning.mockClear();
    });

    it('refuses a report that is too short and never posts', async () => {
        const user = userEvent.setup();
        open();

        await user.type(screen.getByLabelText('Compte rendu'), 'Court');
        await user.click(
            screen.getByRole('button', { name: 'Enregistrer le compte rendu' }),
        );

        expect(post).not.toHaveBeenCalled();
    });

    it('attaches photos, lets them be removed and posts them as form data', async () => {
        const user = userEvent.setup();
        const visit = open();

        await user.upload(dropzoneInput(), [
            photo('salon.jpg'),
            photo('cuisine.jpg'),
        ]);
        expect(screen.getByText(/salon\.jpg/)).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Retirer cuisine.jpg' }),
        );
        expect(screen.queryByText(/cuisine\.jpg/)).not.toBeInTheDocument();

        await user.type(
            screen.getByLabelText('Compte rendu'),
            'Client conquis par le séjour, réserve sur la cuisine.',
        );
        await user.click(
            screen.getByRole('button', { name: 'Enregistrer le compte rendu' }),
        );

        const [url, payload, options] = post.mock.calls[0]!;
        expect(url).toBe(`/clients/visits/${visit.uuid}/report`);
        expect(payload).toMatchObject({
            report: 'Client conquis par le séjour, réserve sur la cuisine.',
        });
        expect(
            (payload as { photos: File[] }).photos.map((file) => file.name),
        ).toEqual(['salon.jpg']);
        expect(options).toMatchObject({ forceFormData: true });
    });

    it('shows the photos already attached to the report', () => {
        open(
            makeVisit({
                report: 'Visite faite.',
                report_photos: ['/storage/visit-reports/salon.jpg'],
            }),
        );

        // La vignette agrandit la photo au lieu de l'ouvrir dans un onglet.
        const photo = screen.getByRole('img', {
            name: 'Photo 1 de la visite de Léa Durand',
        });
        expect(photo).toHaveAttribute(
            'src',
            '/storage/visit-reports/salon.jpg',
        );
        expect(
            screen.getByRole('button', {
                name: 'Agrandir la photo 1 de la visite de Léa Durand',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: 'Mettre à jour le compte rendu',
            }),
        ).toBeInTheDocument();
    });

    it('stops at ten photos in all', async () => {
        const user = userEvent.setup();
        open(
            makeVisit({
                report_photos: Array.from(
                    { length: 10 },
                    (_, index) => `/storage/visit-reports/${index}.jpg`,
                ),
            }),
        );

        const dropzone = screen.getByRole('button', {
            name: 'Ajouter des photos de la visite',
        });
        expect(dropzone).toBeDisabled();

        await user.upload(dropzoneInput(), [photo('salon.jpg')]);
        expect(screen.queryByText(/salon\.jpg/)).not.toBeInTheDocument();
    });
});
