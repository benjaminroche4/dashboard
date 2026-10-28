import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, destroy, error } = vi.hoisted(() => ({
    post: vi.fn(),
    destroy: vi.fn(),
    error: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    router: { post, delete: destroy },
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: React.ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));
vi.mock('@/lib/toast', () => ({
    notify: { error, success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import {
    AgentPhotoMenuItem,
    AgentPhotoTile,
} from '@/components/real-estate/agent-photo-upload';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { makeAgent } from '@/test/fixtures/real-estate';

const png = (size = 10) =>
    new File([new Uint8Array(size)], 'photo.png', { type: 'image/png' });

describe('AgentPhotoTile', () => {
    beforeEach(() => {
        post.mockReset();
        destroy.mockReset();
        error.mockReset();
    });

    it('shows the initials without a photo and uploads the chosen file as multipart form data', () => {
        render(<AgentPhotoTile agent={makeAgent({ name: 'Marthe Dupuy' })} />);

        const tile = screen.getByRole('button', { name: 'Ajouter une photo' });
        expect(tile).toHaveTextContent('MD');

        const file = png();
        fireEvent.change(screen.getByLabelText('Choisir une photo'), {
            target: { files: [file] },
        });

        expect(post).toHaveBeenCalledWith(
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1/photo',
            { photo: file },
            expect.objectContaining({ forceFormData: true }),
        );
    });

    it('shows the photo itself, filling the tile, and offers to change it', () => {
        render(
            <AgentPhotoTile
                agent={makeAgent({ photo: '/storage/agent-photos/a.png' })}
            />,
        );

        const tile = screen.getByRole('button', { name: 'Changer la photo' });
        const img = tile.querySelector('img');
        expect(img).toHaveAttribute('src', '/storage/agent-photos/a.png');
        expect(img).toHaveClass('object-cover');
        expect(tile).not.toHaveTextContent('ZM');
    });

    it('pins the agency badge at the bottom right of an attached agent, linking to the agency, and none on an independent', () => {
        const { rerender } = render(<AgentPhotoTile agent={makeAgent()} />);

        const badge = screen.getByRole('link', {
            name: 'Agence : Agence du Marais',
        });
        expect(badge).toHaveAttribute(
            'href',
            '/real-estate/agencies/0199a9a0-0000-7000-8000-0000000000a1',
        );
        expect(badge).toHaveClass('absolute', '-right-1.5', '-bottom-1.5');

        rerender(<AgentPhotoTile agent={makeAgent({ agency: null })} />);
        expect(screen.queryByTestId('agent-agency-badge')).toBeNull();
    });

    it('refuses a file above 2 MB with a toast, without calling the server', () => {
        render(<AgentPhotoTile agent={makeAgent()} />);

        fireEvent.change(screen.getByLabelText('Choisir une photo'), {
            target: { files: [png(2 * 1024 * 1024 + 1)] },
        });

        expect(post).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith(
            'La photo ne doit pas dépasser 2 Mo.',
        );
    });
});

describe('AgentPhotoMenuItem', () => {
    it('removes the photo from the menu, and is absent without a photo', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <DropdownMenu open>
                <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <AgentPhotoMenuItem agent={makeAgent()} />
                </DropdownMenuContent>
            </DropdownMenu>,
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Retirer la photo' }),
        ).not.toBeInTheDocument();

        rerender(
            <DropdownMenu open>
                <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <AgentPhotoMenuItem
                        agent={makeAgent({ photo: '/storage/a.png' })}
                    />
                </DropdownMenuContent>
            </DropdownMenu>,
        );
        await user.click(
            screen.getByRole('menuitem', { name: 'Retirer la photo' }),
        );

        expect(destroy).toHaveBeenCalledWith(
            '/real-estate/agents/0199a9a0-0000-7000-8000-0000000000b1/photo',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
