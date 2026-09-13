import { describe, expect, it } from 'vitest';
import {
    chronologicalDays,
    dayKey,
    defaultVisitDay,
    groupVisitsByDay,
    openVisits,
    visitAddress,
    visitModeForOffer,
    visitPropertyLine,
    visitTours,
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

describe('visitPropertyLine', () => {
    it('puts the name then the address, and never repeats the name', () => {
        // Bien titré : le nom précède son adresse.
        expect(visitPropertyLine(makeVisit())).toBe(
            'T2 lumineux · 11e · 12 rue Oberkampf, 75011 Paris',
        );

        // Bien sans titre : son nom **est** sa rue, l'adresse suffit.
        expect(
            visitPropertyLine(
                makeVisit({
                    property: {
                        ...makeVisit().property,
                        label: '78 boulevard Bonnin',
                        street: '78 boulevard Bonnin',
                        postal_code: '75014',
                    },
                }),
            ),
        ).toBe('78 boulevard Bonnin, 75014 Paris');

        // Sans adresse du tout, il reste le nom.
        expect(
            visitPropertyLine(
                makeVisit({
                    property: {
                        ...makeVisit().property,
                        street: '',
                        postal_code: null,
                        city: null,
                    },
                }),
            ),
        ).toBe('T2 lumineux · 11e');
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

describe('visitModeForOffer', () => {
    it('lets the offer decide who visits', () => {
        // « Accompagné » : le client visite lui-même ; « Confié » : nous.
        expect(visitModeForOffer('accompagne')).toBe('client_alone');
        expect(visitModeForOffer('confie')).toBe('for_client');
    });

    it('falls back to a visit made by the team when the offer is unknown', () => {
        expect(visitModeForOffer(null)).toBe('for_client');
        expect(visitModeForOffer(undefined)).toBe('for_client');
    });
});

describe('visitTours', () => {
    const withMember = (id: number, name: string | null) =>
        makeVisit({
            id,
            uuid: `tour-${id}`,
            assignee: name === null ? null : { id, name, avatar: null },
        });

    it('groups the day by the member who does the visits, sorted by name', () => {
        const tours = visitTours([
            withMember(2, 'Charles'),
            withMember(1, 'Alice'),
            withMember(3, null),
            makeVisit({
                id: 4,
                uuid: 'tour-4',
                assignee: { id: 1, name: 'Alice', avatar: null },
            }),
        ]);

        expect(tours.map((tour) => tour.label)).toEqual([
            'Alice',
            'Charles',
            'Sans membre',
        ]);
        // Alice a deux visites ; les visites sans membre ferment la liste.
        expect(tours[0]?.visits.map((visit) => visit.id)).toEqual([1, 4]);
        expect(tours[2]?.key).toBe('none');
    });

    it('returns a single tour when one member does the whole day', () => {
        expect(
            visitTours([withMember(1, 'Alice'), withMember(1, 'Alice')]),
        ).toHaveLength(1);
    });
});
