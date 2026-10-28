import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';

function SidebarState() {
    const { state } = useSidebar();

    return <output data-testid="sidebar-state">{state}</output>;
}

describe('Sidebar keyboard shortcut', () => {
    it('toggles the menu with ⌘C when nothing is being copied', () => {
        render(
            <SidebarProvider>
                <SidebarState />
            </SidebarProvider>,
        );

        fireEvent.keyDown(window, { key: 'c', metaKey: true });
        expect(screen.getByTestId('sidebar-state')).toHaveTextContent(
            'collapsed',
        );

        fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
        expect(screen.getByTestId('sidebar-state')).toHaveTextContent(
            'expanded',
        );

        // ⌘B, l'ancien raccourci shadcn, ne fait plus rien.
        fireEvent.keyDown(window, { key: 'b', metaKey: true });
        expect(screen.getByTestId('sidebar-state')).toHaveTextContent(
            'expanded',
        );
    });

    it('leaves ⌘C to the copy when a field has the focus or text is selected', () => {
        render(
            <SidebarProvider>
                <SidebarState />
                <input aria-label="champ" />
                <p>Texte à copier</p>
            </SidebarProvider>,
        );

        screen.getByLabelText('champ').focus();
        fireEvent.keyDown(window, { key: 'c', metaKey: true });
        expect(screen.getByTestId('sidebar-state')).toHaveTextContent(
            'expanded',
        );
        (document.activeElement as HTMLElement).blur();

        const range = document.createRange();
        range.selectNodeContents(screen.getByText('Texte à copier'));
        window.getSelection()?.addRange(range);
        fireEvent.keyDown(window, { key: 'c', metaKey: true });
        expect(screen.getByTestId('sidebar-state')).toHaveTextContent(
            'expanded',
        );
        window.getSelection()?.removeAllRanges();
    });
});
