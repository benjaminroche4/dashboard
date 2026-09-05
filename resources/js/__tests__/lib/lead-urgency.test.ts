import { describe, expect, it } from 'vitest';
import { leadUrgency } from '@/lib/lead-urgency';
import { makeLead } from '@/test/fixtures/lead';

const now = new Date('2026-09-10T12:00:00Z');

describe('leadUrgency', () => {
    it('flags leads without contact for 3 and 7 days', () => {
        expect(
            leadUrgency(
                makeLead({
                    created_at: '2026-09-09T10:00:00Z',
                    last_contacted_at: null,
                    arrival_at: null,
                }),
                now,
            ).contact,
        ).toBe('ok');
        expect(
            leadUrgency(
                makeLead({
                    created_at: '2026-09-06T10:00:00Z',
                    last_contacted_at: null,
                    arrival_at: null,
                }),
                now,
            ),
        ).toMatchObject({ contact: 'warn', daysSinceContact: 4 });
        expect(
            leadUrgency(
                makeLead({
                    created_at: '2026-08-01T10:00:00Z',
                    last_contacted_at: '2026-09-01T10:00:00Z',
                    arrival_at: null,
                }),
                now,
            ),
        ).toMatchObject({ contact: 'late', daysSinceContact: 9 });
    });

    it('ignores closed leads and counts down to an arrival within 30 days', () => {
        expect(
            leadUrgency(
                makeLead({
                    status: 'converted',
                    created_at: '2026-08-01T10:00:00Z',
                    arrival_at: '2026-09-15',
                }),
                now,
            ),
        ).toMatchObject({ contact: 'none', arrivalInDays: null });
        expect(
            leadUrgency(makeLead({ arrival_at: '2026-09-15' }), now)
                .arrivalInDays,
        ).toBe(5);
        expect(
            leadUrgency(makeLead({ arrival_at: '2026-09-10' }), now)
                .arrivalInDays,
        ).toBe(0);
        expect(
            leadUrgency(makeLead({ arrival_at: '2026-12-01' }), now)
                .arrivalInDays,
        ).toBeNull();
    });
});
