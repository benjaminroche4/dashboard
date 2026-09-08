import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Star } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import {
    FormField,
    FormGroup,
    FormStepper,
} from '@/components/leads/lead-form-shell';

const steps = [
    { number: 1, title: 'Contact' },
    { number: 2, title: 'Bien' },
    { number: 3, title: 'Conditions' },
] as const;

describe('FormStepper', () => {
    it('marks the current step, enables visited ones and calls onSelect', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(
            <FormStepper
                steps={steps}
                current={2}
                visited={new Set([1, 2])}
                onSelect={onSelect}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Bien', current: 'step' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Conditions' }),
        ).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Contact' }));
        expect(onSelect).toHaveBeenCalledWith(1);
    });
});

describe('FormGroup and FormField', () => {
    it('renders a titled section with an icon, and a labelled field with hint or error', () => {
        const { rerender } = render(
            <FormGroup title="Coordonnées" hint="Un e-mail suffit." icon={Star}>
                <FormField label="Prénom" htmlFor="first" hint="Capitalisé">
                    <input id="first" />
                </FormField>
            </FormGroup>,
        );

        expect(
            screen.getByRole('region', { name: 'Coordonnées' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Un e-mail suffit.')).toBeInTheDocument();
        expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
        expect(screen.getByText('Capitalisé')).toBeInTheDocument();

        rerender(
            <FormGroup title="Coordonnées">
                <FormField
                    label="Prénom"
                    htmlFor="first"
                    hint="Capitalisé"
                    error="Obligatoire"
                >
                    <input id="first" />
                </FormField>
            </FormGroup>,
        );
        expect(screen.getByText('Obligatoire')).toBeInTheDocument();
        expect(screen.queryByText('Capitalisé')).toBeNull();
    });
});
