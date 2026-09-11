import { describe, expect, it } from 'vitest';
import { initialRecipients } from '@/components/documents/send-upload-link-dialog';

describe('initialRecipients', () => {
    it('proposes the addresses of the linked file first', () => {
        expect(
            initialRecipients(['lea@example.com', 'marc@example.com'], null),
        ).toEqual(['lea@example.com', 'marc@example.com']);
    });

    it('falls back to the last sending, then to one empty line', () => {
        expect(
            initialRecipients([], 'lea@example.com, agence@example.com'),
        ).toEqual(['lea@example.com', 'agence@example.com']);
        expect(initialRecipients([], null)).toEqual(['']);
        expect(initialRecipients([], '  ')).toEqual(['']);
    });

    it('never proposes more than the five the server accepts', () => {
        const many = Array.from({ length: 8 }, (_, i) => `a${i}@example.com`);

        expect(initialRecipients(many, null)).toHaveLength(5);
        expect(initialRecipients([], many.join(', '))).toHaveLength(5);
    });
});
