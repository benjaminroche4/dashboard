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
}));
vi.mock('@/lib/toast', () => ({
    notify: { error, success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import {
    CompanyLogoMenuItem,
    CompanyLogoTile,
} from '@/components/companies/company-logo-upload';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { makeCompany } from '@/test/fixtures/company';

const png = (size = 10) =>
    new File([new Uint8Array(size)], 'logo.png', { type: 'image/png' });

describe('CompanyLogoTile', () => {
    beforeEach(() => {
        post.mockReset();
        destroy.mockReset();
        error.mockReset();
    });

    it('shows the initials without a logo and uploads the chosen file as multipart form data', () => {
        render(
            <CompanyLogoTile company={makeCompany({ name: 'Zen Conseil' })} />,
        );

        const tile = screen.getByRole('button', { name: 'Ajouter un logo' });
        expect(tile).toHaveTextContent('ZC');

        const file = png();
        fireEvent.change(screen.getByLabelText('Choisir un logo'), {
            target: { files: [file] },
        });

        expect(post).toHaveBeenCalledWith(
            '/companies/0199c0c0-0000-7000-8000-0000000000e1/logo',
            { logo: file },
            expect.objectContaining({ forceFormData: true }),
        );
    });

    it('shows the logo itself and offers to change it', () => {
        render(
            <CompanyLogoTile
                company={makeCompany({ logo: '/storage/company-logos/a.png' })}
            />,
        );

        const tile = screen.getByRole('button', { name: 'Changer le logo' });
        expect(tile.querySelector('img')).toHaveAttribute(
            'src',
            '/storage/company-logos/a.png',
        );
        expect(tile).not.toHaveTextContent('ZC');
    });

    it('refuses a file above 2 MB with a toast, without calling the server', () => {
        render(<CompanyLogoTile company={makeCompany()} />);

        fireEvent.change(screen.getByLabelText('Choisir un logo'), {
            target: { files: [png(2 * 1024 * 1024 + 1)] },
        });

        expect(post).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith(
            'Le logo ne doit pas dépasser 2 Mo.',
        );
    });
});

describe('CompanyLogoMenuItem', () => {
    it('removes the logo from the menu, and is absent without a logo', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <DropdownMenu open>
                <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <CompanyLogoMenuItem company={makeCompany()} />
                </DropdownMenuContent>
            </DropdownMenu>,
        );
        expect(
            screen.queryByRole('menuitem', { name: 'Retirer le logo' }),
        ).not.toBeInTheDocument();

        rerender(
            <DropdownMenu open>
                <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <CompanyLogoMenuItem
                        company={makeCompany({ logo: '/storage/a.png' })}
                    />
                </DropdownMenuContent>
            </DropdownMenu>,
        );
        await user.click(
            screen.getByRole('menuitem', { name: 'Retirer le logo' }),
        );

        expect(destroy).toHaveBeenCalledWith(
            '/companies/0199c0c0-0000-7000-8000-0000000000e1/logo',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
