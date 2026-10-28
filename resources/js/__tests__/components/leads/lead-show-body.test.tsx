import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

import { LeadShowBody } from '@/components/leads/lead-show-body';

function renderBody(overrides: { lastContact?: string; visio?: boolean } = {}) {
    return render(
        <LeadShowBody
            header={<div>En-tête</div>}
            facts={[]}
            message={null}
            qualification={[]}
            assign={<div>Admin</div>}
            recontact={<div>Prochain recontact</div>}
            visio={overrides.visio ? <div>Appel vidéo</div> : undefined}
            lastContact={overrides.lastContact ?? 'Jamais'}
            activity={<div>Fil</div>}
        />,
    );
}

describe('LeadShowBody actions', () => {
    it('stacks the send and notes buttons tightly in one block', () => {
        render(
            <LeadShowBody
                header={<div>En-tête</div>}
                facts={[]}
                message={null}
                qualification={[]}
                assign={<div>Admin</div>}
                lastContact="Jamais"
                send={<button type="button">Envoyer au lead</button>}
                activity={<button type="button">Notes</button>}
            />,
        );

        const stack = screen.getByTestId('lead-actions');
        expect(stack).toHaveClass('gap-2');
        expect(stack).not.toHaveClass('gap-6');
        expect(
            [...stack.querySelectorAll('button')].map((b) => b.textContent),
        ).toEqual(['Envoyer au lead', 'Notes']);
    });
});

describe('LeadShowBody qualification', () => {
    it('renders the in-place editor instead of the rows, with the fold open', () => {
        render(
            <LeadShowBody
                header={<div>En-tête</div>}
                facts={[]}
                message={null}
                qualification={[]}
                qualificationEditor={<div>Étoiles et note</div>}
                assign={<div>Admin</div>}
                lastContact="Jamais"
                activity={<div>Fil</div>}
            />,
        );

        expect(screen.getByText('Étoiles et note')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Qualification/ }),
        ).toHaveAttribute('aria-expanded', 'true');
    });
});

describe('LeadShowBody follow-up timeline', () => {
    it('settles each dot on the rail in a cascade, and skips it with reduced motion', () => {
        renderBody({ visio: true });

        const dots = screen.getAllByTestId('timeline-dot');
        expect(dots.map((dot) => dot.dataset.tone)).toEqual([
            'past',
            'visio',
            'next',
        ]);
        for (const [index, dot] of dots.entries()) {
            expect(dot).toHaveClass(
                'animate-timeline-dot',
                'motion-reduce:animate-none',
            );
            expect(dot.style.animationDelay).toBe(`${index * 90}ms`);
        }
        // Le point du recontact suit directement le dernier contact sans visio.
        renderBody();
        const next = screen
            .getAllByTestId('timeline-dot')
            .filter((dot) => dot.dataset.tone === 'next');
        expect(next.at(-1)?.style.animationDelay).toBe('90ms');
    });

    it('replays the last-contact dot when its date changes, not otherwise', () => {
        const { rerender } = render(
            <LeadShowBody
                header={<div>En-tête</div>}
                facts={[]}
                message={null}
                qualification={[]}
                assign={<div>Admin</div>}
                lastContact="Jamais"
                activity={<div>Fil</div>}
            />,
        );
        const before = screen.getByTestId('timeline-dot');

        rerender(
            <LeadShowBody
                header={<div>En-tête</div>}
                facts={[]}
                message={null}
                qualification={[]}
                assign={<div>Admin</div>}
                lastContact="Jamais"
                activity={<div>Fil</div>}
            />,
        );
        expect(screen.getByTestId('timeline-dot')).toBe(before);

        rerender(
            <LeadShowBody
                header={<div>En-tête</div>}
                facts={[]}
                message={null}
                qualification={[]}
                assign={<div>Admin</div>}
                lastContact="28 oct. 2026 à 10:00"
                activity={<div>Fil</div>}
            />,
        );
        // Un nouveau nœud : l'animation d'arrivée rejoue sur la nouvelle date.
        expect(screen.getByTestId('timeline-dot')).not.toBe(before);
    });
});
