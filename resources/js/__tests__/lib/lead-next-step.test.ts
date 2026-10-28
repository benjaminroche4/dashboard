import { describe, expect, it } from 'vitest';
import {
    daysSinceCreation,
    leadNextStep,
    UNASSIGNED_WARN_DAYS,
} from '@/lib/lead-next-step';
import { makeLead } from '@/test/fixtures/lead';

const now = new Date('2026-10-28T12:00:00+01:00');

describe('leadNextStep', () => {
    it('puts an overdue recontact first, in red, with « Reporter »', () => {
        expect(
            leadNextStep(
                makeLead({
                    recontact_at: '2026-10-20T10:00:00+02:00',
                    recontact_channel_label: 'WhatsApp',
                    last_contacted_at: '2026-10-27T10:00:00+01:00',
                }),
                now,
            ),
        ).toEqual({
            tone: 'late',
            text: 'Recontact en retard de 8 j · WhatsApp',
            action: 'recontact',
            label: 'Reporter',
        });
    });

    it('says a recontact due today in amber, with « Noter le contact »', () => {
        expect(
            leadNextStep(
                makeLead({
                    recontact_at: '2026-10-28T15:00:00+01:00',
                    recontact_channel_label: 'Téléphone',
                    last_contacted_at: '2026-10-27T10:00:00+01:00',
                }),
                now,
            ),
        ).toMatchObject({ tone: 'due', action: 'touch' });
    });

    it('asks for the first contact after thirty minutes on a fresh lead', () => {
        expect(
            leadNextStep(
                makeLead({
                    status: 'todo',
                    last_contacted_at: null,
                    recontact_at: null,
                    created_at: '2026-10-28T09:00:00+01:00',
                }),
                now,
            ),
        ).toMatchObject({
            tone: 'late',
            text: 'Premier contact attendu depuis 3 h',
            action: 'touch',
        });
    });

    it('falls back to the days without contact, and says nothing when all is fine or closed', () => {
        expect(
            leadNextStep(
                makeLead({
                    status: 'in_progress',
                    recontact_at: null,
                    last_contacted_at: '2026-10-24T10:00:00+02:00',
                }),
                now,
            ),
        ).toMatchObject({ tone: 'due', text: 'Sans contact depuis 4 j' });
        expect(
            leadNextStep(
                makeLead({
                    status: 'in_progress',
                    recontact_at: null,
                    last_contacted_at: '2026-10-28T10:00:00+01:00',
                }),
                now,
            ),
        ).toBeNull();
        expect(
            leadNextStep(
                makeLead({
                    status: 'converted',
                    recontact_at: '2020-01-01T10:00:00+01:00',
                }),
                now,
            ),
        ).toBeNull();
    });

    it('counts the days since creation for the unassigned warning', () => {
        expect(
            daysSinceCreation(
                makeLead({ created_at: '2026-10-01T12:00:00+02:00' }),
                now,
            ),
        ).toBe(27);
        expect(UNASSIGNED_WARN_DAYS).toBe(14);
    });
});
