import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaginationBar } from '@/components/pagination-bar';

describe('PaginationBar', () => {
    it('shows nothing on a single page', () => {
        const { container } = render(
            <PaginationBar page={1} lastPage={1} onPage={vi.fn()} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('jumps to a page and disables the ends', async () => {
        const user = userEvent.setup();
        const onPage = vi.fn();
        render(<PaginationBar page={1} lastPage={372} onPage={onPage} />);

        expect(screen.getByRole('navigation')).toHaveTextContent(
            'Page 1 sur 372',
        );
        expect(
            screen.getByRole('button', { name: 'Page précédente' }),
        ).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
            'aria-current',
            'page',
        );

        await user.click(screen.getByRole('button', { name: 'Page 372' }));
        expect(onPage).toHaveBeenCalledWith(372);

        await user.click(screen.getByRole('button', { name: 'Page suivante' }));
        expect(onPage).toHaveBeenLastCalledWith(2);
    });
});
