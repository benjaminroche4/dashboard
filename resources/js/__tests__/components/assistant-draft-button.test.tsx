import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
let assistant = true;

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { features: { assistant } } }),
}));
vi.mock('@/lib/toast', () => ({ notify: { error: toastError } }));

import { AssistantDraftButton } from '@/components/assistant-draft-button';

describe('AssistantDraftButton', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        assistant = true;
    });

    it('disappears without an API key: the front hides, the server refuses', () => {
        assistant = false;
        render(<AssistantDraftButton url="/x" onDraft={() => undefined} />);

        expect(
            screen.queryByRole('button', { name: 'Rédiger avec l’IA' }),
        ).not.toBeInTheDocument();
    });

    it('hands the proposal to the form and never writes it itself', async () => {
        const user = userEvent.setup();
        const onDraft = vi.fn();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ message: 'Bonjour,' }),
            }),
        );

        render(
            <AssistantDraftButton<{ message: string }>
                url="/leads/1/partners/2/forward/draft"
                body={{ tone: 'court' }}
                onDraft={onDraft}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Rédiger avec l’IA' }),
        );

        await waitFor(() =>
            expect(onDraft).toHaveBeenCalledWith({ message: 'Bonjour,' }),
        );
        expect(fetch).toHaveBeenCalledWith(
            '/leads/1/partners/2/forward/draft',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ tone: 'court' }),
            }),
        );
    });

    it('shows the server explanation when the assistant refuses', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                json: async () => ({
                    message: 'Assistant IA non configuré (ANTHROPIC_API_KEY).',
                }),
            }),
        );

        render(<AssistantDraftButton url="/x" onDraft={() => undefined} />);
        await user.click(
            screen.getByRole('button', { name: 'Rédiger avec l’IA' }),
        );

        await waitFor(() =>
            expect(toastError).toHaveBeenCalledWith(
                'Assistant IA',
                'Assistant IA non configuré (ANTHROPIC_API_KEY).',
            ),
        );
    });
});
