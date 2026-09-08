import { describe, expect, it } from 'vitest';
import {
    arrivalLabel,
    arrivalProgress,
    arrivalTone,
} from '@/lib/arrival-progress';

const now = new Date('2026-09-08T12:00:00');

describe('arrivalProgress', () => {
    it('fills the bar from the conversion to the arrival date', () => {
        const progress = arrivalProgress(
            '2026-08-09T12:00:00',
            '2026-10-08',
            now,
        );

        expect(progress.state).toBe('upcoming');
        expect(progress.daysLeft).toBe(30);
        expect(progress.percent).toBe(50);
        expect(arrivalLabel(progress)).toBe('J-30');
    });

    it('turns to « soon » under 20 days and to « arrived » after the date', () => {
        expect(
            arrivalProgress('2026-08-01T00:00:00', '2026-09-20', now).state,
        ).toBe('soon');

        const arrived = arrivalProgress(
            '2026-06-01T00:00:00',
            '2026-09-05',
            now,
        );
        expect(arrived.state).toBe('arrived');
        expect(arrived.percent).toBe(100);
        expect(arrivalLabel(arrived)).toBe('Arrivé(e) depuis 3 j');
        expect(arrivalLabel(arrivalProgress(null, '2026-09-08', now))).toBe(
            'Arrive aujourd’hui',
        );
    });

    it('falls back to a 90-day window without a conversion date, and stays empty without an arrival', () => {
        const fallback = arrivalProgress(null, '2026-10-08', now);
        expect(fallback.percent).toBe(67);

        const unknown = arrivalProgress('2026-08-01T00:00:00', null, now);
        expect(unknown).toEqual({
            percent: 0,
            daysLeft: null,
            state: 'unknown',
            tone: 'none',
        });
        expect(arrivalLabel(unknown)).toBe('Arrivée non renseignée');
    });

    it('shades from green when the arrival is far to red when it is imminent or past', () => {
        expect(arrivalTone(null)).toBe('none');
        expect(arrivalTone(120)).toBe('green');
        expect(arrivalTone(61)).toBe('green');
        expect(arrivalTone(60)).toBe('yellow');
        expect(arrivalTone(31)).toBe('yellow');
        expect(arrivalTone(30)).toBe('amber');
        expect(arrivalTone(15)).toBe('amber');
        expect(arrivalTone(14)).toBe('orange');
        expect(arrivalTone(8)).toBe('orange');
        expect(arrivalTone(7)).toBe('red');
        expect(arrivalTone(0)).toBe('red');
        expect(arrivalTone(-3)).toBe('red');
        expect(
            arrivalProgress('2026-06-01T00:00:00', '2026-09-05', now).tone,
        ).toBe('red');
    });
});
