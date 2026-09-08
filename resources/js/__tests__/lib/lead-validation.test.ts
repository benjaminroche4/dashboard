import { describe, expect, it } from 'vitest';
import { validateLeadForm } from '@/lib/lead-validation';
import { isTightBudget } from '@/lib/paris-budget';
import type { LeadForm } from '@/types';

const base: LeadForm = {
    first_name: 'Léa',
    last_name: 'Durand',
    email: 'lea@example.com',
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
    guarantors: [],
    furnished: '',
    message: '',
    score: null,
    recontact_channel: '',
    recontact_at: '',
    qualification_note: '',
    assigned_to: null,
    segment: 'tenant',
};
const today = new Date('2026-09-05T12:00:00Z');

describe('validateLeadForm', () => {
    it('accepts a minimal lead', () => {
        expect(validateLeadForm(base, today)).toEqual({});
    });

    it('reports names, contact, e-mail format, phone length, budget and recontact', () => {
        const errors = validateLeadForm(
            {
                ...base,
                first_name: ' ',
                last_name: '',
                email: 'nope',
                phone: '06 12',
                budget: 'abc',
                recontact_at: '2026-09-01',
            },
            today,
        );

        expect(errors.first_name).toBe('Le prénom est obligatoire.');
        expect(errors.last_name).toBe('Le nom est obligatoire.');
        expect(errors.email).toBe("L'adresse e-mail n'est pas valide.");
        expect(errors.phone).toBe('Le numéro de téléphone est trop court.');
        expect(errors.budget_cents).toBe('Le budget doit être un montant.');
        expect(errors.recontact_at).toMatch(/aujourd/);
        expect(errors.recontact_channel).toMatch(/canal/);
        expect(
            validateLeadForm({ ...base, email: '', phone: '' }, today).email,
        ).toMatch(/au moins/);
    });
});

describe('isTightBudget', () => {
    it('flags budgets under 1 300 € per month', () => {
        expect(isTightBudget(0)).toBe(false);
        expect(isTightBudget(100_000)).toBe(true);
        expect(isTightBudget(129_999)).toBe(true);
        expect(isTightBudget(130_000)).toBe(false);
        expect(isTightBudget(250_000)).toBe(false);
    });
});
