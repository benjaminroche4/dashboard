import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Panel } from '@/components/panel';
import { reportColors } from '@/components/reports/report-palette';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import type { Report } from '@/types';

type Daily = Report['leads']['daily'];

/** Total d'une série en ignorant les jours sans valeur. */
function sum(days: Daily['days'], key: 'current' | 'previous'): number {
    return days.reduce((total, day) => total + (day[key] ?? 0), 0);
}

/**
 * Leads reçus jour par jour : le mois en cours contre le mois précédent,
 * avec le cumul des deux mois et l'écart dans l'en-tête.
 */
export function MonthlyLeadsChart({ daily }: { daily: Daily }) {
    const config = {
        current: { label: daily.current, color: reportColors.primary },
        previous: { label: daily.previous, color: reportColors.success },
    } satisfies ChartConfig;
    const current = sum(daily.days, 'current');
    const previous = sum(daily.days, 'previous');
    const elapsed = daily.days.filter((day) => day.current !== null).length;
    // Même nombre de jours écoulés le mois précédent, pour comparer à date.
    const previousToDate = sum(daily.days.slice(0, elapsed), 'previous');
    const delta = current - previousToDate;

    return (
        <Panel
            title="Leads du mois"
            description={`${daily.current} contre ${daily.previous}, jour par jour.`}
            action={
                <p
                    className="text-right text-sm"
                    data-test="monthly-leads-summary"
                >
                    <span className="text-2xl font-semibold tabular-nums">
                        {current}
                    </span>{' '}
                    <span className="text-muted-foreground">
                        lead(s) ce mois-ci
                    </span>
                    <br />
                    <span className="text-muted-foreground tabular-nums">
                        {delta >= 0 ? '+' : '−'}
                        {Math.abs(delta)} à date · {previous} le mois dernier
                    </span>
                </p>
            }
        >
            <div className="bg-background rounded-lg border p-3">
                <ChartContainer config={config} className="h-64 w-full">
                    <AreaChart
                        data={daily.days}
                        margin={{ left: 8, right: 8, top: 8 }}
                        accessibilityLayer
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            interval={4}
                        />
                        <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            width={32}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(day) => `Jour ${day}`}
                                />
                            }
                        />
                        <Area
                            dataKey="previous"
                            type="monotone"
                            fill="var(--color-previous)"
                            fillOpacity={0.12}
                            stroke="var(--color-previous)"
                            strokeWidth={2}
                            strokeDasharray="4 3"
                            connectNulls={false}
                        />
                        <Area
                            dataKey="current"
                            type="monotone"
                            fill="var(--color-current)"
                            fillOpacity={0.25}
                            stroke="var(--color-current)"
                            strokeWidth={2}
                            connectNulls={false}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </div>
            <details className="mt-4 text-sm">
                <summary className="text-muted-foreground cursor-pointer">
                    Voir les valeurs jour par jour
                </summary>
                <table className="mt-2 w-full">
                    <caption className="sr-only">Leads par jour</caption>
                    <thead className="text-muted-foreground text-xs uppercase">
                        <tr>
                            <th className="py-1 text-left font-medium">Jour</th>
                            <th className="py-1 text-right font-medium">
                                {daily.current}
                            </th>
                            <th className="py-1 text-right font-medium">
                                {daily.previous}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y tabular-nums">
                        {daily.days.map((day) => (
                            <tr key={day.day}>
                                <td className="py-0.5">{day.day}</td>
                                <td className="py-0.5 text-right">
                                    {day.current ?? '—'}
                                </td>
                                <td className="py-0.5 text-right">
                                    {day.previous ?? '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </Panel>
    );
}
