import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/toast';

describe('Toaster next to Radix menus', () => {
    it('does not prevent a dropdown from opening', async () => {
        const user = userEvent.setup();
        render(
            <>
                <DropdownMenu>
                    <DropdownMenuTrigger>Ouvrir</DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem>Élément</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Toaster />
            </>,
        );

        await user.click(screen.getByRole('button', { name: 'Ouvrir' }));

        expect(
            await screen.findByRole('menuitem', { name: 'Élément' }),
        ).toBeInTheDocument();
    });
});
