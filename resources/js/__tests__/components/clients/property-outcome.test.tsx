import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({ router: { patch: vi.fn() } }));

import {
    followUpLines,
    PropertyFollowUp,
} from '@/components/clients/property-outcome';

const options = [
    {
        value: 'pending' as const,
        label: 'À décider',
        hint: 'Le client n’a pas encore décidé.',
    },
    {
        value: 'applied' as const,
        label: 'Dossier déposé',
        hint: 'La candidature est partie, en attente de réponse.',
    },
];

describe('followUpLines', () => {
    it('says when the team is relaunched while the client is still thinking', () => {
        expect(
            followUpLines({
                status: 'pending',
                visited_at: '2026-09-10T10:00:00+02:00',
                reminded_at: '2026-09-12T09:00:00+02:00',
                reminder_at: '2099-09-14T09:00:00+02:00',
            }),
        ).toEqual([
            'Visité le 10 sept.',
            'Équipe relancée le 12 sept. à 09:00',
            'Prochaine relance le 14 sept. à 09:00',
        ]);
    });

    it('says the reminder is on its way once the date has passed', () => {
        expect(
            followUpLines({
                status: 'pending',
                visited_at: null,
                reminder_at: '2020-01-01T09:00:00+01:00',
            }),
        ).toEqual(['Relance en partance']);
    });

    it('dates a decided step instead of announcing a reminder', () => {
        expect(
            followUpLines({
                status: 'applied',
                status_at: '2026-09-12T09:00:00+02:00',
            }),
        ).toEqual(['Dossier déposé le 12 sept., en attente de réponse']);

        expect(
            followUpLines({
                status: 'accepted',
                status_at: '2026-09-12T09:00:00+02:00',
            }),
        ).toEqual(['Tranché le 12 sept.']);

        expect(followUpLines({ status: 'declined' })).toEqual([]);
    });
});

describe('PropertyFollowUp', () => {
    it('shows the step, what it means and the follow-up dates', () => {
        render(
            <PropertyFollowUp
                outcome={{
                    status: 'pending',
                    status_label: 'À décider',
                    options,
                    visited_at: '2026-09-10T10:00:00+02:00',
                    reminder_at: '2099-09-14T09:00:00+02:00',
                    decision_due: true,
                }}
            />,
        );

        expect(screen.getByText(/À décider/)).toBeInTheDocument();
        expect(
            screen.getByText('Le client n’a pas encore décidé.'),
        ).toBeInTheDocument();
        expect(
            within(
                screen.getByRole('list', { name: 'Suivi de la décision' }),
            ).getByText('Prochaine relance le 14 sept. à 09:00'),
        ).toBeInTheDocument();
    });
});
