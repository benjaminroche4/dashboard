import { describe, expect, it } from 'vitest';
import {
    firstContactLabel,
    firstContactTimer,
    formatClock,
} from '@/lib/lead-urgency';
import { makeLead } from '@/test/fixtures/lead';

const createdAt = '2026-09-10T12:00:00Z';
const fresh = () =>
    makeLead({
        status: 'todo',
        created_at: createdAt,
        last_contacted_at: null,
    });

describe('firstContactTimer', () => {
    it('compte à rebours de 30 minutes après la création', () => {
        const timer = firstContactTimer(
            fresh(),
            new Date('2026-09-10T12:03:00Z'),
        );

        expect(timer).not.toBeNull();
        expect(timer?.late).toBe(false);
        expect(timer?.remainingMinutes).toBe(27);
        expect(timer?.lateMinutes).toBe(0);
        expect(timer?.remainingSeconds).toBe(27 * 60);
        expect(timer?.lateSeconds).toBe(0);
        expect(timer?.dueAt.toISOString()).toBe('2026-09-10T12:30:00.000Z');
    });

    it('passe en retard une fois les 30 minutes écoulées', () => {
        const timer = firstContactTimer(
            fresh(),
            new Date('2026-09-10T12:42:00Z'),
        );

        expect(timer?.late).toBe(true);
        expect(timer?.remainingMinutes).toBe(0);
        expect(timer?.lateMinutes).toBe(12);
        expect(timer?.remainingSeconds).toBe(0);
        expect(timer?.lateSeconds).toBe(12 * 60);
    });

    it("s'arrête dès que le lead a été contacté ou a changé de statut", () => {
        const now = new Date('2026-09-10T12:10:00Z');

        expect(
            firstContactTimer(
                makeLead({
                    status: 'todo',
                    created_at: createdAt,
                    last_contacted_at: '2026-09-10T12:05:00Z',
                }),
                now,
            ),
        ).toBeNull();
        expect(
            firstContactTimer(
                makeLead({
                    status: 'in_progress',
                    created_at: createdAt,
                    last_contacted_at: null,
                }),
                now,
            ),
        ).toBeNull();
        expect(
            firstContactTimer(
                makeLead({
                    status: 'todo',
                    created_at: null,
                    last_contacted_at: null,
                }),
                now,
            ),
        ).toBeNull();
    });

    it('laisse la place au badge journalier après un jour de retard', () => {
        expect(
            firstContactTimer(fresh(), new Date('2026-09-11T12:29:00Z')),
        ).not.toBeNull();
        expect(
            firstContactTimer(fresh(), new Date('2026-09-11T12:31:00Z')),
        ).toBeNull();
    });
});

describe('firstContactLabel', () => {
    const label = (now: string) => {
        const timer = firstContactTimer(fresh(), new Date(now));

        if (timer === null) {
            throw new Error('timer attendu');
        }

        return firstContactLabel(timer);
    };

    it('affiche un chrono qui descend puis un retard qui monte', () => {
        expect(label('2026-09-10T12:03:00Z')).toBe('À contacter · 27:00');
        expect(label('2026-09-10T12:29:30Z')).toBe('À contacter · 00:30');
        expect(label('2026-09-10T12:30:20Z')).toBe('En retard · +00:20');
        expect(label('2026-09-10T12:42:05Z')).toBe('En retard · +12:05');
        expect(label('2026-09-10T14:30:00Z')).toBe('En retard · +2:00:00');
        expect(label('2026-09-10T15:35:09Z')).toBe('En retard · +3:05:09');
    });
});

describe('formatClock', () => {
    it('formate en mm:ss puis h:mm:ss', () => {
        expect(formatClock(0)).toBe('00:00');
        expect(formatClock(65)).toBe('01:05');
        expect(formatClock(3599)).toBe('59:59');
        expect(formatClock(3600)).toBe('1:00:00');
        expect(formatClock(-5)).toBe('00:00');
    });
});
