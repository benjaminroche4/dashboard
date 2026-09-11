import { Head, router } from '@inertiajs/react';
import { LeadsChart } from '@/components/reports/leads-chart';
import { PeriodPicker } from '@/components/reports/period-picker';
import { VisitsByBooker } from '@/components/reports/visits-by-booker';
import { VisitsChart } from '@/components/reports/visits-chart';
import { formatDate } from '@/lib/format';
import { index as toolsIndex } from '@/routes/tools';
import { index as reportsIndex } from '@/routes/tools/reports';
import type { Report, ReportPeriodOption } from '@/types';

type Props = {
    report: Report;
    /** Raccourci de période actif. */
    period: string;
    periods: ReportPeriodOption[];
    generatedAt: string;
};

function Stat({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint: string;
}) {
    return (
        <div className="bg-sidebar grid gap-1 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase">
                {label}
            </p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-muted-foreground text-sm">{hint}</p>
        </div>
    );
}

export default function ReportsIndex({ report, period, periods }: Props) {
    const { leads, visits } = report;

    const changePeriod = (query: {
        period: string;
        from?: string;
        to?: string;
    }) =>
        router.get(
            reportsIndex({ query }).url,
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );

    return (
        <>
            <Head title="Rapports" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8">
                    <div>
                        <h1 className="text-lg font-medium">Rapports</h1>
                        <p className="text-muted-foreground text-sm">
                            Du {formatDate(report.period.from)} au{' '}
                            {formatDate(report.period.to)}.
                        </p>
                    </div>
                    <PeriodPicker
                        period={period}
                        options={periods}
                        from={report.period.from}
                        to={report.period.to}
                        onChange={changePeriod}
                    />
                </div>

                <section
                    aria-label="Chiffres clés"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    <Stat
                        label="Leads reçus"
                        value={String(leads.total)}
                        hint="Sur la période choisie."
                    />
                    <Stat
                        label="Visites réservées"
                        value={String(visits.total)}
                        hint="Sur la période choisie, hors annulées."
                    />
                </section>

                <LeadsChart leads={leads} />
                <VisitsChart visits={visits} />
                <VisitsByBooker
                    bookers={visits.by_booker}
                    from={report.period.from}
                    to={report.period.to}
                />
            </div>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Rapports', href: reportsIndex() },
    ],
};
