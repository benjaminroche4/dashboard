import { Briefcase, FileQuestion, IdCard } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { categoryIcon, categoryIcons } from '@/lib/document-category-icons';

describe('categoryIcon', () => {
    it('maps every catalog category to an icon', () => {
        expect(Object.keys(categoryIcons).sort()).toEqual([
            'finance',
            'guarantee',
            'housing',
            'identity',
            'other',
            'studies',
            'work',
        ]);
        expect(categoryIcon('work')).toBe(Briefcase);
        expect(categoryIcon('identity')).toBe(IdCard);
    });

    it('falls back to the generic icon for an unknown category', () => {
        expect(categoryIcon('unknown')).toBe(FileQuestion);
    });
});
