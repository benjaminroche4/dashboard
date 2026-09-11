import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { Panel } from '@/components/panel';
import { tickInterval } from '@/components/reports/chart-scale';
import { ChartValues } from '@/components/reports/chart-values';
import { reportColors } from '@/components/reports/report-palette';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import type { Report } from '@/types';

type Visits = Report['visits'];

/**
 * Visites planifiées ou effectuées sur la période choisie, tranche par tranche
 * (même découpage et même aire shadcn que la courbe des leads, courbe « monotone »
 * pour qu'un pic isolé ne fasse pas plonger la courbe sous zéro).
 */
export function VisitsChart({ visits }: { visits: Visits }) {
    const config = {
        count: { label: 'Visites', color: reportColors.primary },
    } satisfies ChartConfig;
    const busiest = visits.series.reduce(
        (best, point) => (point.count > best.count ? point : best),
        { label: '', count: 0 },
    );

    return (
        <Panel
            title="Visites"
            description="Visites planifiées ou effectuées sur la période choisie, hors annulées."
            action={
                <p className="text-right text-sm" data-testid="visits-summary">
                    <span className="text-2xl font-semibold tabular-nums">
                        {visits.total}
                    </span>{' '}
                    <span className="text-muted-foreground">
                        visite(s) sur la période
                    </span>
                    {busiest.count > 0 && (
                        <>
                            <br />
                            <span className="text-muted-foreground tabular-nums">
                                Pic : {busiest.count} · {busiest.label}
                            </span>
                        </>
                    )}
                </p>
            }
        >
            <div className="bg-background rounded-lg border p-3">
                <ChartContainer config={config} className="h-56 w-full">
                    <AreaChart
                        accessibilityLayer
                        data={visits.series}
                        // 24 plutôt que les 12 de shadcn : « 12 août » est plus large que « Jan ».
                        margin={{ left: 24, right: 24 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            interval={tickInterval(visits.series.length)}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="line" />}
                        />
                        <Area
                            dataKey="count"
                            type="monotone"
                            fill="var(--color-count)"
                            fillOpacity={0.4}
                            stroke="var(--color-count)"
                        />
                    </AreaChart>
                </ChartContainer>
            </div>
            <ChartValues label="Voir les valeurs tranche par tranche">
                <div className="overflow-x-auto text-sm">
                    <table className="w-full">
                        <caption className="sr-only">
                            Visites par tranche de la période
                        </caption>
                        <thead className="text-muted-foreground text-xs uppercase">
                            <tr>
                                <th className="py-1 text-left font-medium">
                                    Tranche
                                </th>
                                <th className="py-1 text-right font-medium">
                                    Visites
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y tabular-nums">
                            {visits.series.map((point, index) => (
                                <tr key={`${point.label}-${index}`}>
                                    <td className="py-0.5">{point.label}</td>
                                    <td className="py-0.5 text-right">
                                        {point.count}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartValues>
        </Panel>
    );
}
