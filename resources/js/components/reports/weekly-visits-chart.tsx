import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Panel } from '@/components/panel';
import { reportColors } from '@/components/reports/report-palette';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import type { ReportWeek } from '@/types';

const config = {
    total: { label: 'Visites', color: reportColors.primary },
} satisfies ChartConfig;

/**
 * Visites par semaine sur les huit dernières semaines : une barre par semaine,
 * puis le tableau jour par jour (lundi à dimanche) avec total et moyenne journalière.
 */
export function WeeklyVisitsChart({ weeks }: { weeks: ReportWeek[] }) {
    const total = weeks.reduce((sum, week) => sum + week.total, 0);
    const current = weeks.at(-1);
    const dayNames = weeks[0]?.days.map((day) => day.day) ?? [];

    return (
        <Panel
            title="Visites par semaine"
            description="Visites planifiées ou effectuées, jour par jour, sur les huit dernières semaines."
            action={
                <p
                    className="text-right text-sm"
                    data-testid="weekly-visits-summary"
                >
                    <span className="text-2xl font-semibold tabular-nums">
                        {current?.total ?? 0}
                    </span>{' '}
                    <span className="text-muted-foreground">cette semaine</span>
                    <br />
                    <span className="text-muted-foreground tabular-nums">
                        {total} sur huit semaines ·{' '}
                        {(total / 7 / Math.max(weeks.length, 1))
                            .toFixed(1)
                            .replace('.', ',')}{' '}
                        par jour
                    </span>
                </p>
            }
        >
            {total === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucune visite sur les huit dernières semaines.
                </p>
            ) : (
                <>
                    <div className="bg-background rounded-lg border p-3">
                        <ChartContainer config={config} className="h-56 w-full">
                            <BarChart
                                data={weeks.map((week) => ({
                                    label: week.label,
                                    total: week.total,
                                }))}
                                margin={{ left: 8, right: 8, top: 8 }}
                                accessibilityLayer
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                    width={32}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent />}
                                />
                                <Bar
                                    dataKey="total"
                                    fill="var(--color-total)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <caption className="sr-only">
                                Visites par jour et par semaine
                            </caption>
                            <thead className="text-muted-foreground text-xs uppercase">
                                <tr>
                                    <th className="py-1 text-left font-medium">
                                        Semaine
                                    </th>
                                    {dayNames.map((day) => (
                                        <th
                                            key={day}
                                            className="py-1 text-right font-medium"
                                        >
                                            {day}
                                        </th>
                                    ))}
                                    <th className="py-1 text-right font-medium">
                                        Total
                                    </th>
                                    <th className="py-1 text-right font-medium">
                                        Moy. / jour
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y tabular-nums">
                                {weeks.map((week) => (
                                    <tr key={week.week}>
                                        <td className="py-1 whitespace-nowrap">
                                            {week.label}
                                        </td>
                                        {week.days.map((day, index) => (
                                            <td
                                                key={index}
                                                className="py-1 text-right"
                                            >
                                                {day.count}
                                            </td>
                                        ))}
                                        <td className="py-1 text-right font-medium">
                                            {week.total}
                                        </td>
                                        <td className="py-1 text-right">
                                            {week.daily_average
                                                .toFixed(1)
                                                .replace('.', ',')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Panel>
    );
}
