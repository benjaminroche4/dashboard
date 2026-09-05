import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
    LeadPassport,
    passportCompleteness,
} from '@/components/leads/lead-passport';
import type { LeadForm } from '@/types';

const empty: LeadForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    language: 'fr',
    offer: '',
    source: 'website',
    source_note: '',
    budget: '',
    currency: 'EUR',
    arrival_at: '',
    origin_city: '',
    districts: [],
    property_types: [],
    duration: '',
    guarantor: '',
    furnished: '',
    message: '',
    score: null,
    recontact_channel: '',
    recontact_at: '',
    qualification_note: '',
};
const options = {
    offers: [{ value: 'confie', label: 'Confié' }],
    languages: [
        { value: 'fr', label: 'Français' },
        { value: 'en', label: 'Anglais' },
    ],
    sources: [{ value: 'website', label: 'Site web' }],
    propertyTypes: [{ value: 't2', label: 'T2' }],
    durations: [{ value: 'long', label: 'Long terme' }],
    guarantors: [{ value: 'garantme', label: 'Garantme' }],
    furnishedOptions: [{ value: 'furnished', label: 'Meublé' }],
    recontactChannels: [{ value: 'phone', label: 'Téléphone' }],
};

describe('LeadPassport', () => {
    it('shows placeholders when empty and fills in as the form is completed', () => {
        const { rerender } = render(
            <LeadPassport form={empty} options={options} />,
        );

        expect(screen.getByText('Nom du prospect')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '0',
        );

        rerender(
            <LeadPassport
                form={{
                    ...empty,
                    first_name: 'Léa',
                    last_name: 'Durand',
                    email: 'lea@example.com',
                    company: 'Nestlé',
                    language: 'en',
                    offer: 'confie',
                    budget: '2500',
                    districts: [3, 4],
                    property_types: ['t2'],
                    score: 4,
                    recontact_channel: 'phone',
                    recontact_at: '2026-09-10',
                }}
                options={options}
            />,
        );

        expect(screen.getByText('Léa Durand')).toBeInTheDocument();
        expect(screen.getByText('Nestlé')).toBeInTheDocument();
        expect(screen.getByText('Anglais')).toBeInTheDocument();
        expect(screen.getByText(/2.500,00.*\/ mois/)).toBeInTheDocument();
        expect(screen.getByText('3e, 4e')).toBeInTheDocument();
        expect(screen.getByText(/Téléphone · le/)).toBeInTheDocument();
        expect(screen.getByLabelText('Qualité 4 sur 5')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '64',
        );
    });

    it('counts the key fields', () => {
        expect(passportCompleteness(empty)).toEqual({
            done: 0,
            total: 11,
            percent: 0,
        });
    });
});
