import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

describe('DialogContent', () => {
    it('scrolls inside itself instead of overflowing the screen', () => {
        render(
            <Dialog open>
                <DialogContent>
                    <DialogTitle>Un très long formulaire</DialogTitle>
                    {Array.from({ length: 40 }, (_, index) => (
                        <p key={index}>Ligne {index + 1}</p>
                    ))}
                </DialogContent>
            </Dialog>,
        );

        const content = screen.getByRole('dialog');
        expect(content.className).toContain('max-h-[calc(100dvh-2rem)]');
        expect(content.className).toContain('overflow-y-auto');
        // Le défilement reste dans la modale, la page derrière ne bouge pas.
        expect(content.className).toContain('overscroll-contain');
    });
});
