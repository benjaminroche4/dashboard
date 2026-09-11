import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { Panel } from '@/components/panel';
import { tickInterval } from '@/components/reports/chart-scale';
import { ChartValues } from '@/components/reports/chart-values';
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

type Leads = Report['leads'];

/**
 * Leads reçus sur la période choisie, tranche par tranche (heure, jour, semaine
 * ou mois selon sa longueur), comparés à la période précédente de même durée.
 * Aires shadcn (aplat à 40 %), courbe « monotone » et non « natural » : une
 * spline naturelle passe sous zéro de part et d'autre d'un pic isolé (0, 9, 0),
 * ce qui dessinerait des leads négatifs. Les valeurs exactes se lisent au survol
 * et dans le tableau replié sous le graphique.
 */
export function LeadsChart({ leads }: { leads: Leads }) {
    const config = {
        current: { label: 'Période choisie', color: reportColors.primary },
        previous: { label: 'Période précédente', color: reportColors.success },
    } satisfies ChartConfig;
    const delta = leads.total - leads.previous_total;

    return (
        <Panel
            title="Leads reçus"
            description={`Sur la période choisie, comparés à la précédente (${leads.previous_label.toLowerCase()}).`}
            action={
                <p className="text-right text-sm" data-test="leads-summary">
                    <span className="text-2xl font-semibold tabular-nums">
                        {leads.total}
                    </span>{' '}
                    <span className="text-muted-foreground">
                        lead(s) sur la période
                    </span>
                    <br />
                    <span className="text-muted-foreground tabular-nums">
                        {delta >= 0 ? '+' : '−'}
                        {Math.abs(delta)} · {leads.previous_total} avant
                    </span>
                </p>
            }
        >
            <div className="bg-background rounded-lg border p-3">
                <ChartContainer config={config} className="h-64 w-full">
                    <AreaChart
                        accessibilityLayer
                        data={leads.series}
                        // 24 plutôt que les 12 de shadcn : « 12 août » est plus large que « Jan ».
                        margin={{ left: 24, right: 24 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            // Une graduation sur n : la période peut compter trente tranches.
                            interval={tickInterval(leads.series.length)}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="line" />}
                        />
                        <Area
                            dataKey="previous"
                            type="monotone"
                            fill="var(--color-previous)"
                            fillOpacity={0.4}
                            stroke="var(--color-previous)"
                        />
                        <Area
                            dataKey="current"
                            type="monotone"
                            fill="var(--color-current)"
                            fillOpacity={0.4}
                            stroke="var(--color-current)"
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </div>
            <ChartValues label="Voir les valeurs tranche par tranche">
                <div className="overflow-x-auto text-sm">
                    <table className="w-full">
                        <caption className="sr-only">
                            Leads par tranche de la période
                        </caption>
                        <thead className="text-muted-foreground text-xs uppercase">
                            <tr>
                                <th className="py-1 text-left font-medium">
                                    Tranche
                                </th>
                                <th className="py-1 text-right font-medium">
                                    Période choisie
                                </th>
                                <th className="py-1 text-right font-medium">
                                    Période précédente
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y tabular-nums">
                            {leads.series.map((point, index) => (
                                <tr key={`${point.label}-${index}`}>
                                    <td className="py-0.5">{point.label}</td>
                                    <td className="py-0.5 text-right">
                                        {point.current}
                                    </td>
                                    <td className="py-0.5 text-right">
                                        {point.previous}
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
