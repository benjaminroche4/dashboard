import { describe, expect, it } from 'vitest';
import { documentReview } from '@/components/documents/upload-status';

const upload = (status: 'pending' | 'accepted' | 'refused') => ({ status });

describe('documentReview', () => {
    it('says nothing has arrived when no file has been deposited', () => {
        expect(documentReview([])).toBe('none');
    });

    it('stays neutral while the team has not looked at the file', () => {
        expect(documentReview([upload('pending')])).toBe('pending');
    });

    it('turns green only once a file is approved', () => {
        expect(documentReview([upload('accepted')])).toBe('accepted');
        expect(documentReview([upload('accepted'), upload('pending')])).toBe(
            'accepted',
        );
    });

    it('lets a refusal win over everything: it is what asks for an action', () => {
        expect(documentReview([upload('accepted'), upload('refused')])).toBe(
            'refused',
        );
        expect(documentReview([upload('pending'), upload('refused')])).toBe(
            'refused',
        );
    });
});
