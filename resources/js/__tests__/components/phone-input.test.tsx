import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { PhoneInput } from '@/components/phone-input';

function Harness({ initial = '' }: { initial?: string }) {
    const [value, setValue] = useState(initial);

    return (
        <>
            <PhoneInput id="phone" value={value} onChange={setValue} />
            <output data-test="value">{value}</output>
        </>
    );
}

describe('PhoneInput', () => {
    it('searches a country by name and composes the full number', async () => {
        const user = userEvent.setup();
        render(<Harness />);

        expect(
            screen.getByRole('combobox', { name: 'Indicatif' }),
        ).toHaveTextContent('+33');

        await user.click(screen.getByRole('combobox', { name: 'Indicatif' }));
        await user.type(
            await screen.findByPlaceholderText(
                'Rechercher un pays ou un indicatif…',
            ),
            'portu',
        );
        await user.click(
            await screen.findByRole('option', { name: /Portugal/ }),
        );
        await user.type(
            document.getElementById('phone') as HTMLElement,
            '912 345 678',
        );

        expect(
            screen.getByRole('combobox', { name: 'Indicatif' }),
        ).toHaveTextContent('+351');
        expect(document.querySelector('[data-test="value"]')).toHaveTextContent(
            /^\+351 ?912/,
        );
    });

    it('reads an existing number back into its dial code and national part', () => {
        render(<Harness initial="+41 79 000 00 00" />);

        expect(
            screen.getByRole('combobox', { name: 'Indicatif' }),
        ).toHaveTextContent('+41');
        expect(document.getElementById('phone')).toHaveValue('79 000 00 00');
    });
});
