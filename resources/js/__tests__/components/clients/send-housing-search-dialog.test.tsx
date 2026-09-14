import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { post, transform } = vi.hoisted(() => ({
    post: vi.fn(),
    transform: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { features: { assistant: false } } }),
    useForm: (initial: Record<string, string>) => {
        const [data, setDataState] = useState(initial);

        return {
            data,
            errors: {} as Record<string, string | undefined>,
            processing: false,
            setData: (key: string | Record<string, string>, value?: string) =>
                setDataState((current) =>
                    typeof key === 'string'
                        ? { ...current, [key]: value ?? '' }
                        : { ...current, ...key },
                ),
            clearErrors: () => undefined,
            transform,
            post: (url: string, options: unknown) => post(url, data, options),
        };
    },
}));

import {
    searchRecipients,
    SendHousingSearchDialog,
} from '@/components/clients/send-housing-search-dialog';
import { makeClientAgentSuggestion } from '@/test/fixtures/client';

describe('SendHousingSearchDialog', () => {
    it('offers the agency and its agents as recipients, the best agent first', () => {
        const recipients = searchRecipients(makeClientAgentSuggestion());

        expect(recipients.map((r) => r.email)).toEqual([
            'contact@oberkampf.example',
            'zoe@oberkampf.example',
        ]);
        expect(recipients[1]!.agentId).toBe(7);
    });

    it('sends the message to the preselected agent once it is long enough', async () => {
        const user = userEvent.setup();
        render(
            <SendHousingSearchDialog
                open
                onOpenChange={() => undefined}
                clientUuid="client-1"
                suggestion={makeClientAgentSuggestion()}
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: 'Envoyer la recherche à Oberkampf Immo',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('combobox', { name: 'Destinataire' }),
        ).toHaveTextContent('Zoé Martin · zoe@oberkampf.example');
        const send = screen.getByRole('button', {
            name: 'Envoyer la recherche',
        });
        expect(send).toBeDisabled();

        await user.type(
            screen.getByLabelText('Votre mot'),
            'Bonjour Zoé, nous cherchons un T2 meublé dans le 11e.',
        );
        expect(send).toBeEnabled();
        await user.click(send);

        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('client-1'),
            expect.objectContaining({ email: 'zoe@oberkampf.example' }),
            expect.anything(),
        );
    });

    it('explains when no address is known', () => {
        render(
            <SendHousingSearchDialog
                open
                onOpenChange={() => undefined}
                clientUuid="client-1"
                suggestion={makeClientAgentSuggestion({
                    agency: {
                        ...makeClientAgentSuggestion().agency!,
                        email: null,
                    },
                    agents: [],
                    best_agent: null,
                })}
            />,
        );

        expect(
            screen.getByText(/Aucune adresse e-mail connue/),
        ).toBeInTheDocument();
    });
});
