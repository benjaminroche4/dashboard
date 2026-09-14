import { describe, expect, it } from 'vitest';
import { dossierAttention } from '@/lib/dossier-attention';
import { makeDossierReadiness } from '@/test/fixtures/client';
import { makeVisit } from '@/test/fixtures/visit';

const visitPath = (visit: { uuid: string }) => `/clients/visits/${visit.uuid}`;
const now = new Date('2026-09-14T09:00:00+02:00');

describe('dossierAttention', () => {
    it('lists what holds the file back, most pressing first, each with its move', () => {
        const items = dossierAttention({
            now,
            visitPath,
            visits: [
                makeVisit({
                    uuid: 'v-next',
                    status: 'planned',
                    scheduled_at: '2026-09-16T10:00:00+02:00',
                    report_due: false,
                }),
                makeVisit({
                    uuid: 'v-late',
                    status: 'done',
                    scheduled_at: '2026-09-11T14:00:00+02:00',
                    report_due: true,
                }),
            ],
            properties: [],
            suggestions: [
                {
                    id: 9,
                    uuid: 'p-9',
                    label: 'T2 · 11e',
                    street: '',
                    postal_code: null,
                    city: null,
                    property_type_label: null,
                    furnished_label: null,
                    surface_m2: null,
                    rent_cents: null,
                    currency: 'EUR',
                    listing_url: null,
                    photo: null,
                    agent: null,
                    score: 5,
                    reasons: [],
                },
            ],
            readiness: makeDossierReadiness({
                total: 6,
                accepted: 3,
                to_check: 1,
                refused: 1,
                missing: 1,
            }),
        });

        expect(items.map((item) => [item.tone, item.key])).toEqual([
            ['critical', 'report-v-late'],
            ['warning', 'refused'],
            ['warning', 'to-check'],
            ['info', 'visit-v-next'],
            ['info', 'missing'],
            ['info', 'suggestions'],
        ]);
        expect(items[0]?.action).toEqual({
            label: 'Rédiger',
            href: '/clients/visits/v-late?report=1',
        });
        expect(items[3]?.title).toContain('Prochaine visite');
        expect(items[3]?.detail).toContain('mercredi 16 septembre');
    });

    it('says nothing when the file is up to date', () => {
        expect(
            dossierAttention({
                now,
                visitPath,
                visits: [
                    makeVisit({
                        status: 'done',
                        scheduled_at: '2026-09-01T10:00:00+02:00',
                        report_due: false,
                    }),
                ],
                properties: [],
                suggestions: [],
                readiness: makeDossierReadiness({
                    total: 4,
                    accepted: 4,
                    to_check: 0,
                    refused: 0,
                    missing: 0,
                }),
            }),
        ).toEqual([]);
    });
});
