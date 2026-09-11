import { describe, expect, it } from 'vitest';
import {
    chronologicalDays,
    dayKey,
    defaultVisitDay,
    groupVisitsByDay,
    openVisits,
    visitAddress,
} from '@/lib/visits';
import { makeVisit } from '@/test/fixtures/visit';

const now = new Date('2026-09-15T09:00:00+02:00');
const at = (id: number, iso: string, overrides = {}) =>
    makeVisit({ id, uuid: `v${id}`, scheduled_at: iso, ...overrides });

describe('groupVisitsByDay', () => {
    it('groups by local day: today, then upcoming ascending, then past descending, visits by time', () => {
        const days = groupVisitsByDay(
            [
                at(1, '2026-09-15T16:00:00+02:00'),
                at(2, '2026-09-20T10:00:00+02:00'),
                at(3, '2026-09-15T09:30:00+02:00'),
                at(4, '2026-09-01T15:00:00+02:00'),
                at(5, '2026-09-16T11:00:00+02:00'),
                at(6, '2026-09-10T11:00:00+02:00'),
            ],
            now,
        );

        expect(days.map((day) => day.key)).toEqual([
            '2026-09-15',
            '2026-09-16',
            '2026-09-20',
            '2026-09-10',
            '2026-09-01',
        ]);
        expect(days[0]?.visits.map((visit) => visit.id)).toEqual([3, 1]);
        expect(days[0]?.relative).toBe("Aujourd'hui");
        expect(days[0]?.label).toBe('mardi 15 septembre 2026');
        expect(days[0]?.past).toBe(false);
        expect(days[1]?.relative).toBe('Demain');
        expect(days[2]?.relative).toBeNull();
        expect(days[3]?.past).toBe(true);
    });

    it('labels yesterday and returns nothing for no visits', () => {
        const days = groupVisitsByDay(
            [at(1, '2026-09-14T10:00:00+02:00')],
            now,
        );

        expect(days[0]?.relative).toBe('Hier');
        expect(groupVisitsByDay([], now)).toEqual([]);
    });
});

describe('defaultVisitDay', () => {
    it('prefers today, then the next upcoming day, then the most recent past day', () => {
        const withToday = groupVisitsByDay(
            [
                at(1, '2026-09-15T10:00:00+02:00'),
                at(2, '2026-09-18T10:00:00+02:00'),
            ],
            now,
        );
        expect(defaultVisitDay(withToday, now)?.key).toBe('2026-09-15');

        const onlyFuture = groupVisitsByDay(
            [
                at(1, '2026-09-25T10:00:00+02:00'),
                at(2, '2026-09-18T10:00:00+02:00'),
                at(3, '2026-09-01T10:00:00+02:00'),
            ],
            now,
        );
        expect(defaultVisitDay(onlyFuture, now)?.key).toBe('2026-09-18');

        const onlyPast = groupVisitsByDay(
            [
                at(1, '2026-09-01T10:00:00+02:00'),
                at(2, '2026-09-10T10:00:00+02:00'),
            ],
            now,
        );
        expect(defaultVisitDay(onlyPast, now)?.key).toBe('2026-09-10');
        expect(defaultVisitDay([], now)).toBeNull();
    });

    it('sorts the days chronologically for the day navigation', () => {
        const days = groupVisitsByDay(
            [
                at(1, '2026-09-20T10:00:00+02:00'),
                at(2, '2026-09-01T10:00:00+02:00'),
                at(3, '2026-09-15T10:00:00+02:00'),
            ],
            now,
        );

        expect(chronologicalDays(days).map((day) => day.key)).toEqual([
            '2026-09-01',
            '2026-09-15',
            '2026-09-20',
        ]);
    });
});

describe('visitAddress', () => {
    it('builds the one-line address of the property', () => {
        expect(visitAddress(makeVisit())).toBe('12 rue Oberkampf, 75011 Paris');
        expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
});

describe('openVisits', () => {
    it('keeps the coming days and only the past visits still awaiting a report', () => {
        const visits = [
            at(1, '2026-09-20T10:00:00+02:00'),
            // Aujourd'hui, même passée de quelques heures : toujours visible.
            at(2, '2026-09-15T08:00:00+02:00'),
            // Passées : seule celle sans compte rendu reste.
            at(3, '2026-09-10T11:00:00+02:00', { report_due: true }),
            at(4, '2026-09-09T11:00:00+02:00', {
                report: 'Visite faite.',
                report_due: false,
            }),
            at(5, '2026-09-08T11:00:00+02:00', {
                status: 'cancelled',
                report_due: false,
            }),
        ];

        expect(openVisits(visits, now).map((visit) => visit.id)).toEqual([
            1, 2, 3,
        ]);
    });
});
