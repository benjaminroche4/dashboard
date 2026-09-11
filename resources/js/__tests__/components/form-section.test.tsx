import { render, screen, within } from '@testing-library/react';
import { House } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { FormGrid, FormSection } from '@/components/form-section';

describe('FormSection', () => {
    it('names the block, shows its hint, its action and its fields', () => {
        render(
            <FormSection
                title="Bien à visiter"
                hint="Un bien de l’annuaire ou un nouveau bien."
                icon={House}
                action={<button type="button">Importer</button>}
            >
                <FormGrid>
                    <p>Champs</p>
                </FormGrid>
            </FormSection>,
        );

        const section = screen.getByRole('region', { name: 'Bien à visiter' });
        expect(
            within(section).getByRole('heading', { name: 'Bien à visiter' }),
        ).toBeInTheDocument();
        expect(
            within(section).getByText(
                'Un bien de l’annuaire ou un nouveau bien.',
            ),
        ).toBeInTheDocument();
        expect(
            within(section).getByRole('button', { name: 'Importer' }),
        ).toBeInTheDocument();
        expect(within(section).getByText('Champs')).toBeInTheDocument();
    });
});
