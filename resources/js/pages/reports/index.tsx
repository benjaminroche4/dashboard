import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Panel } from '@/components/panel';
import { DetailBars } from '@/components/reports/detail-bars';
import { MonthlyLeadsChart } from '@/components/reports/monthly-leads-chart';
import { reportColors } from '@/components/reports/report-palette';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatMoney } from '@/lib/format';
import { activeCurrencies, formatDelay, formatRate } from '@/lib/report-format';
import { index as toolsIndex } from '@/routes/tools';
import { index as reportsIndex } from '@/routes/tools/reports';
import type { Currency, Report } from '@/types';

type Props = {
    report: Report;
    months: number;
    periods: number[];
    generatedAt: string;
};

const invoiceConfig = {
    issued: { label: 'Émis', color: reportColors.primary },
    paid: { label: 'Encaissé', color: reportColors.success },
} satisfies ChartConfig;

function Stat({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className="bg-sidebar grid gap-1 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase">
                {label}
            </p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
        </div>
    );
}

export default function ReportsIndex({ report, months, periods }: Props) {
    const currencies = activeCurrencies(
        [report.invoices.issued, report.invoices.paid],
        'EUR',
    );
    const [currency, setCurrency] = useState<Currency>(currencies[0] ?? 'EUR');
    const money = (cents: number, unit: Currency = currency) =>
        formatMoney(cents, unit);
    // Montants en unités pour l'axe, les centimes restent dans l'infobulle.
    const monthly = report.invoices.by_month.map((month) => ({
        month: month.label,
        issued: month.issued[currency] / 100,
        paid: month.paid[currency] / 100,
    }));
    const { leads, quotes, invoices } = report;

    const changePeriod = (value: string) =>
        router.get(
            reportsIndex({ query: { months: Number(value) } }).url,
            {},
            { preserveState: true, preserveScroll: true },
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
                    <Select value={String(months)} onValueChange={changePeriod}>
                        <SelectTrigger
                            aria-label="Période"
                            className="bg-background w-44"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {periods.map((period) => (
                                <SelectItem key={period} value={String(period)}>
                                    {period} derniers mois
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <MonthlyLeadsChart daily={leads.daily} />

                <section
                    aria-label="Chiffres clés"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <Stat
                        label="Leads reçus"
                        value={String(leads.total)}
                        hint={`${leads.converted} converti(s) · ${formatRate(leads.conversion_rate)}`}
                    />
                    <Stat
                        label="Premier contact"
                        value={formatDelay(leads.first_contact.average_minutes)}
                        hint={
                            leads.first_contact.measured > 0
                                ? `${formatRate(leads.first_contact.within_30_rate)} sous 30 min · ${leads.first_contact.measured} mesuré(s)`
                                : 'Aucun lead contacté'
                        }
                    />
                    <Stat
                        label="Devis acceptés"
                        value={formatRate(quotes.acceptance_rate)}
                        hint={`${quotes.total} devis émis`}
                    />
                    <Stat
                        label="Encaissé"
                        value={money(invoices.paid[currency])}
                        hint={`${money(invoices.issued[currency])} émis · ${invoices.overdue.count} en retard`}
                    />
                </section>

                <section
                    aria-label="Détail des leads"
                    className="grid gap-8 lg:grid-cols-2"
                >
                    <DetailBars
                        title="Leads par source"
                        description="Leads reçus sur la période et part convertie."
                        empty="Aucun lead sur la période."
                        rows={leads.by_source.map((row) => ({
                            id: row.source,
                            label: row.label,
                            values: {
                                count: row.count,
                                converted: row.converted,
                            },
                        }))}
                        series={[
                            { key: 'count', label: 'Leads', tone: 'primary' },
                            {
                                key: 'converted',
                                label: 'Convertis',
                                tone: 'success',
                            },
                        ]}
                    />
                    <DetailBars
                        title="Leads par statut"
                        description="Répartition actuelle des leads reçus sur la période."
                        empty="Aucun lead sur la période."
                        rows={leads.by_status.map((row) => ({
                            id: row.status,
                            label: row.label,
                            values: { count: row.count },
                        }))}
                        series={[
                            { key: 'count', label: 'Leads', tone: 'primary' },
                        ]}
                    />
                    <DetailBars
                        title="Leads par formule"
                        description="Formule demandée par le lead à son arrivée."
                        empty="Aucun lead sur la période."
                        rows={leads.by_offer.map((row) => ({
                            id: row.offer ?? 'none',
                            label: row.label,
                            values: { count: row.count },
                        }))}
                        series={[
                            { key: 'count', label: 'Leads', tone: 'primary' },
                        ]}
                    />
                    <DetailBars
                        title="Leads par responsable"
                        description="Leads suivis par chaque membre et part convertie."
                        empty="Aucun lead sur la période."
                        rows={leads.by_assignee.map((row) => ({
                            id: String(row.assignee ?? 'none'),
                            label: row.label,
                            values: {
                                count: row.count,
                                converted: row.converted,
                            },
                        }))}
                        series={[
                            { key: 'count', label: 'Leads', tone: 'primary' },
                            {
                                key: 'converted',
                                label: 'Convertis',
                                tone: 'success',
                            },
                        ]}
                    />
                    <DetailBars
                        title="Devis par formule"
                        description="Devis tranchés par le client : acceptés (ou facturés) et refusés."
                        empty="Aucun devis sur la période."
                        rows={quotes.by_offer.map((row) => ({
                            id: row.offer,
                            label: row.label,
                            values: {
                                accepted: row.accepted,
                                declined: row.declined,
                            },
                        }))}
                        series={[
                            {
                                key: 'accepted',
                                label: 'Acceptés',
                                tone: 'success',
                            },
                            {
                                key: 'declined',
                                label: 'Refusés',
                                tone: 'primary',
                            },
                        ]}
                    />
                    <Panel
                        title="Devis"
                        description="Devis émis sur la période, par statut."
                    >
                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {quotes.by_status.map((row) => (
                                <div key={row.status} className="grid gap-0.5">
                                    <dt className="text-muted-foreground text-xs">
                                        {row.label}
                                    </dt>
                                    <dd className="text-lg font-semibold tabular-nums">
                                        {row.count}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <p className="text-muted-foreground mt-3 text-sm">
                            Montant des devis acceptés :{' '}
                            {currencies.length === 0
                                ? money(quotes.accepted_amounts.EUR, 'EUR')
                                : currencies
                                      .map((unit) =>
                                          money(
                                              quotes.accepted_amounts[unit],
                                              unit,
                                          ),
                                      )
                                      .join(' · ')}
                            .
                        </p>
                    </Panel>
                </section>

                <Panel
                    title="Factures par mois"
                    description="Montants émis et encaissés, hors factures annulées."
                    action={
                        currencies.length > 1 ? (
                            <Tabs
                                value={currency}
                                onValueChange={(value) =>
                                    setCurrency(value as Currency)
                                }
                            >
                                <TabsList aria-label="Devise">
                                    {currencies.map((unit) => (
                                        <TabsTrigger key={unit} value={unit}>
                                            {unit}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        ) : undefined
                    }
                >
                    <div className="bg-background rounded-lg border p-3">
                        <ChartContainer
                            config={invoiceConfig}
                            className="h-64 w-full"
                        >
                            <AreaChart
                                data={monthly}
                                margin={{ left: 8, right: 8, top: 8 }}
                                accessibilityLayer
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={56}
                                    tickFormatter={(value: number) =>
                                        value.toLocaleString('fr-FR')
                                    }
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(
                                                value: unknown,
                                                name: unknown,
                                            ) => (
                                                <span className="flex w-full justify-between gap-4">
                                                    <span className="text-muted-foreground">
                                                        {
                                                            invoiceConfig[
                                                                name as keyof typeof invoiceConfig
                                                            ].label
                                                        }
                                                    </span>
                                                    <span className="font-medium tabular-nums">
                                                        {money(
                                                            Math.round(
                                                                Number(value) *
                                                                    100,
                                                            ),
                                                        )}
                                                    </span>
                                                </span>
                                            )}
                                        />
                                    }
                                />
                                <Area
                                    dataKey="issued"
                                    type="monotone"
                                    fill="var(--color-issued)"
                                    fillOpacity={0.15}
                                    stroke="var(--color-issued)"
                                    strokeWidth={2}
                                />
                                <Area
                                    dataKey="paid"
                                    type="monotone"
                                    fill="var(--color-paid)"
                                    fillOpacity={0.25}
                                    stroke="var(--color-paid)"
                                    strokeWidth={2}
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                            </AreaChart>
                        </ChartContainer>
                    </div>
                    <table className="mt-4 w-full text-sm">
                        <caption className="sr-only">
                            Factures par mois en {currency}
                        </caption>
                        <thead className="text-muted-foreground text-xs uppercase">
                            <tr>
                                <th className="py-1 text-left font-medium">
                                    Mois
                                </th>
                                <th className="py-1 text-right font-medium">
                                    Émis
                                </th>
                                <th className="py-1 text-right font-medium">
                                    Encaissé
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y tabular-nums">
                            {invoices.by_month.map((month) => (
                                <tr key={month.month}>
                                    <td className="py-1">{month.label}</td>
                                    <td className="py-1 text-right">
                                        {money(month.issued[currency])}
                                    </td>
                                    <td className="py-1 text-right">
                                        {money(month.paid[currency])}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Panel>
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
