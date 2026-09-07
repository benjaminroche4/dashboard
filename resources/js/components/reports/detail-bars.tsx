import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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

export type DetailSeries = {
    key: string;
    label: string;
    tone: keyof typeof reportColors;
};

export type DetailRow = {
    id: string;
    label: string;
    values: Record<string, number>;
};

/**
 * Bar chart de détail du rapport : une barre par catégorie, une ou deux
 * séries, avec le tableau des valeurs en dessous pour la lecture sans couleur.
 */
export function DetailBars({
    title,
    description,
    rows,
    series,
    empty = 'Aucune donnée sur la période.',
}: {
    title: string;
    description?: string;
    rows: DetailRow[];
    series: DetailSeries[];
    empty?: string;
}) {
    const config = Object.fromEntries(
        series.map((entry) => [
            entry.key,
            { label: entry.label, color: reportColors[entry.tone] },
        ]),
    ) satisfies ChartConfig;
    const data = rows.map((row) => ({ label: row.label, ...row.values }));
    const total = rows.reduce(
        (sum, row) => sum + (row.values[series[0]?.key ?? ''] ?? 0),
        0,
    );

    return (
        <Panel title={title} description={description}>
            {total === 0 ? (
                <p className="text-muted-foreground text-sm">{empty}</p>
            ) : (
                <>
                    <div className="bg-background rounded-lg border p-3">
                        <ChartContainer config={config} className="h-56 w-full">
                            <BarChart
                                data={data}
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
                                {series.map((entry) => (
                                    <Bar
                                        key={entry.key}
                                        dataKey={entry.key}
                                        fill={`var(--color-${entry.key})`}
                                        radius={[4, 4, 0, 0]}
                                    />
                                ))}
                                {series.length > 1 && (
                                    <ChartLegend
                                        content={<ChartLegendContent />}
                                    />
                                )}
                            </BarChart>
                        </ChartContainer>
                    </div>
                    <table className="mt-4 w-full text-sm">
                        <caption className="sr-only">{title}</caption>
                        <thead className="text-muted-foreground text-xs uppercase">
                            <tr>
                                <th className="py-1 text-left font-medium">
                                    Catégorie
                                </th>
                                {series.map((entry) => (
                                    <th
                                        key={entry.key}
                                        className="py-1 text-right font-medium"
                                    >
                                        {entry.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y tabular-nums">
                            {rows.map((row) => (
                                <tr key={row.id}>
                                    <td className="py-1">{row.label}</td>
                                    {series.map((entry) => (
                                        <td
                                            key={entry.key}
                                            className="py-1 text-right"
                                        >
                                            {row.values[entry.key] ?? 0}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </Panel>
    );
}
