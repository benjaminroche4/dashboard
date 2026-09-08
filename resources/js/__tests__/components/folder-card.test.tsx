import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        prefetch: _prefetch,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
        prefetch?: boolean;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

import { FolderCard, FolderIllustration } from '@/components/folder-card';

describe('FolderIllustration', () => {
    it('draws the folder from the Figma exports with the sheets hidden until hover', () => {
        const { container } = render(<FolderIllustration />);

        const images = container.querySelectorAll('img');
        expect(images[0]).toHaveAttribute('src', '/images/folder/back.svg');
        expect(images[images.length - 1]).toHaveAttribute(
            'src',
            '/images/folder/front.svg',
        );
        expect(
            container.querySelectorAll('img[src="/images/folder/page.svg"]'),
        ).toHaveLength(3);
        expect(screen.getAllByText('PDF')).toHaveLength(2);
        expect(container.querySelector('.translate-y-12')).toHaveClass(
            'group-hover:translate-y-0',
        );
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });
});

describe('FolderIllustration open', () => {
    it('forces the sheets out with the open prop', () => {
        const { container } = render(<FolderIllustration open />);

        expect(container.querySelector('[data-open]')).toHaveClass(
            'data-open:translate-y-0',
        );
    });
});

describe('FolderCard', () => {
    it('shows the title, the subtitle and the extra information', () => {
        render(
            <FolderCard title="Documents" subtitle="10 fichiers">
                <span>Suivi par Admin</span>
            </FolderCard>,
        );

        expect(screen.getByText('Documents')).toBeInTheDocument();
        expect(screen.getByText('10 fichiers')).toBeInTheDocument();
        expect(screen.getByText('Suivi par Admin')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('links the title to an Inertia route', () => {
        render(
            <FolderCard
                title="Léa Durand"
                href={{ url: '/clients/abc', method: 'get' }}
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Léa Durand' }),
        ).toHaveAttribute('href', '/clients/abc');
    });

    it('links the title to an anchor of the page', () => {
        render(<FolderCard title="Factures" href="#factures" />);

        expect(screen.getByRole('link', { name: 'Factures' })).toHaveAttribute(
            'href',
            '#factures',
        );
    });
});
