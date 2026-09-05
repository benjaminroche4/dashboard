import { toCents } from '@/lib/invoice-totals';
import type { LeadForm } from '@/types';

export type LeadFormErrors = Partial<Record<string, string>>;

/** Identifiant du champ à focaliser pour une clé d'erreur donnée. */
export const leadErrorFields: Record<string, string> = {
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
    budget_cents: 'budget',
    arrival_at: 'arrival_at',
    recontact_at: 'recontact_at',
    recontact_channel: 'recontact_channel',
    score: 'score-label',
    assigned_to: 'assigned_to',
};

/**
 * Validation locale de la Converting Machine, mêmes clés que Laravel.
 * Évite un aller-retour serveur pour les oublis évidents.
 */
export function validateLeadForm(
    form: LeadForm,
    today = new Date(),
): LeadFormErrors {
    const errors: LeadFormErrors = {};

    if (form.last_name.trim() === '') {
        errors.last_name = 'Le nom est obligatoire.';
    }

    if (form.first_name.trim() === '') {
        errors.first_name = 'Le prénom est obligatoire.';
    }

    const email = form.email.trim();
    const phone = form.phone.trim();

    if (email === '' && phone === '') {
        errors.email = 'Indiquez au moins un e-mail ou un téléphone.';
        errors.phone = 'Indiquez au moins un e-mail ou un téléphone.';
    }

    if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = "L'adresse e-mail n'est pas valide.";
    }

    if (phone !== '' && phone.replace(/\D/g, '').length < 8) {
        errors.phone = 'Le numéro de téléphone est trop court.';
    }

    if (form.budget.trim() !== '') {
        const cents = toCents(form.budget);

        if (!/^[\d\s.,]+$/.test(form.budget.trim()) || cents <= 0) {
            errors.budget_cents = 'Le budget doit être un montant.';
        }
    }

    if (form.recontact_at !== '') {
        const day = today.toISOString().slice(0, 10);

        if (form.recontact_at < day) {
            errors.recontact_at =
                'La date de recontact doit être aujourd’hui ou plus tard.';
        }
    }

    if (form.recontact_at !== '' && form.recontact_channel === '') {
        errors.recontact_channel = 'Choisissez par quel canal recontacter.';
    }

    return errors;
}
