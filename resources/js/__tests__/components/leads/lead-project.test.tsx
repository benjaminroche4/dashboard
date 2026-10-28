import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeadProject } from '@/components/leads/lead-project';
import type { Fact } from '@/components/leads/lead-show-body';

const highlights: Fact[] = [
    { label: 'Offre visée', value: 'Confié' },
    {
        label: 'Budget mensuel',
        value: '2 000 € / mois',
        badge: 'Correct',
        badgeTone: 'good',
    },
    { label: 'Quartiers visés', value: 'Non renseigné', empty: true },
];

const facts: Fact[] = [
    { label: 'Type de bien', value: 'T2, Loft' },
    { label: 'Garant', value: 'Non renseigné', empty: true },
    { label: 'Source', value: 'Site web' },
];

describe('LeadProject', () => {
    it('edits a criterion in place when the page can save, and sends the server name of the field', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <LeadProject
                sentence={null}
                highlights={[
                    {
                        label: 'Offre visée',
                        value: 'Confié',
                        edit: {
                            name: 'offer',
                            kind: 'select',
                            value: 'confie',
                            options: [
                                { value: 'accompagne', label: 'Accompagné' },
                                { value: 'confie', label: 'Confié' },
                            ],
                        },
                    },
                    {
                        label: "Ville d'origine",
                        value: 'Non renseigné',
                        empty: true,
                        edit: {
                            name: 'origin_city',
                            kind: 'text',
                            value: null,
                        },
                    },
                ]}
                facts={[]}
                map={<div>Carte</div>}
                onSave={onSave}
                saving={null}
            />,
        );

        // Un critère vide se complète à sa place, sans ouvrir la page de modification.
        await user.click(
            screen.getByRole('button', { name: "Modifier Ville d'origine" }),
        );
        await user.type(
            screen.getByRole('textbox', { name: "Ville d'origine" }),
            'Genève{Enter}',
        );
        expect(onSave).toHaveBeenCalledWith('origin_city', 'Genève');

        await user.click(
            screen.getByRole('button', { name: 'Modifier Offre visée' }),
        );
        await user.click(screen.getByRole('combobox', { name: 'Offre visée' }));
        await user.click(
            await screen.findByRole('option', { name: 'Accompagné' }),
        );
        expect(onSave).toHaveBeenCalledWith('offer', 'accompagne');
    });

    it('stays read-only without a save handler', () => {
        render(
            <LeadProject
                sentence={null}
                highlights={[
                    {
                        label: 'Offre visée',
                        value: 'Confié',
                        edit: {
                            name: 'offer',
                            kind: 'select',
                            value: 'confie',
                            options: [],
                        },
                    },
                ]}
                facts={[]}
                map={<div>Carte</div>}
            />,
        );

        expect(screen.queryByRole('button', { name: /Modifier/ })).toBeNull();
        expect(screen.getByText('Confié')).toBeInTheDocument();
    });

    it('reads from the sentence to the detail: a ruled list of the filled criteria, what is missing in one line, the note as a quote, the map behind a toggle', async () => {
        const user = userEvent.setup();
        render(
            <LeadProject
                sentence="Cherche un T2 ou Loft dans le 9e pour 2 000 € par mois."
                highlights={highlights}
                facts={facts}
                message="Arrive avec sa famille."
                map={<div>Carte</div>}
            />,
        );

        expect(
            screen.getByText(
                'Cherche un T2 ou Loft dans le 9e pour 2 000 € par mois.',
            ),
        ).toBeInTheDocument();
        // Une fiche à filets : libellé à gauche, valeur à droite, les faits de tête d'abord.
        const list = screen.getByText('Offre visée').closest('dl');
        expect(list).toHaveClass('divide-y');
        expect(screen.getByText('Offre visée').tagName).toBe('DT');
        expect(screen.getByText('Confié').tagName).toBe('DD');
        expect(screen.getByText('Correct')).toBeInTheDocument();
        const labels = [...(list?.querySelectorAll('dt') ?? [])].map(
            (dt) => dt.textContent,
        );
        expect(labels[0]).toBe('Offre visée');
        expect(labels).toContain('Type de bien');
        expect(screen.getByText('T2, Loft')).toBeInTheDocument();
        expect(screen.getByText('Site web')).toBeInTheDocument();
        // Ce qui manque garde sa ligne, avec une étiquette « Non renseigné ».
        expect(labels).toContain('Garant');
        expect(labels).toContain('Quartiers visés');
        expect(screen.getAllByText('Non renseigné')).toHaveLength(2);
        expect(screen.queryByText(/À compléter/)).toBeNull();

        expect(screen.getByText('Arrive avec sa famille.').tagName).toBe(
            'BLOCKQUOTE',
        );

        // La carte est repliée par défaut pour alléger la fiche.
        expect(screen.queryByText('Carte')).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Voir la carte des quartiers' }),
        );
        expect(screen.getByText('Carte')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Masquer la carte' }),
        ).toBeInTheDocument();
    });

    it('shows nothing of what is absent: no sentence, no quote, no « Non renseigné » tag once everything is filled', () => {
        render(
            <LeadProject
                sentence={null}
                highlights={highlights.filter((fact) => !fact.empty)}
                facts={[]}
                map={<div>Carte</div>}
            />,
        );

        expect(screen.queryByText(/Cherche/)).toBeNull();
        expect(screen.queryByText('Non renseigné')).toBeNull();
        expect(document.querySelector('blockquote')).toBeNull();
    });
});
