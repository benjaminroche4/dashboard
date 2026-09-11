import { TriangleAlert, Wallet } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { affordability, RENT_INCOME_RATIO } from '@/lib/rent-affordability';
import { cn } from '@/lib/utils';

/**
 * Alerte quand le loyer visé ne tient pas dans les revenus du foyer : la règle
 * usuelle demande des revenus d'au moins trois fois le loyer. Rien ne s'affiche
 * tant qu'un des deux chiffres manque.
 */
export function RentAffordabilityAlert({
    incomeCents,
    rentCents,
    currency,
    className,
}: {
    /** Revenus mensuels nets du foyer (locataires et garants). */
    incomeCents: number | null;
    /** Loyer visé par le client. */
    rentCents: number | null;
    currency: string;
    className?: string;
}) {
    const result = affordability(incomeCents, rentCents);

    if (result === null) {
        return null;
    }

    const money = (cents: number) => formatMoney(cents, currency);

    return (
        <p
            role={result.ok ? 'status' : 'alert'}
            data-affordable={result.ok}
            className={cn(
                'flex items-start gap-2 rounded-lg border p-3 text-sm',
                result.ok
                    ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200'
                    : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
                className,
            )}
        >
            {result.ok ? (
                <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <span>
                {result.ok ? (
                    <>
                        Revenus de {money(result.incomeCents)} par mois pour un
                        loyer visé de {money(result.rentCents)} :{' '}
                        {result.ratio.toFixed(1).replace('.', ',')} fois le
                        loyer, le dossier passe la règle des {RENT_INCOME_RATIO}{' '}
                        fois.
                    </>
                ) : (
                    <>
                        Revenus de {money(result.incomeCents)} par mois pour un
                        loyer visé de {money(result.rentCents)} : seulement{' '}
                        {result.ratio.toFixed(1).replace('.', ',')} fois le
                        loyer. Il faudrait {money(result.requiredIncomeCents)}{' '}
                        de revenus, ou viser {money(result.affordableRentCents)}{' '}
                        de loyer — sinon, un garant.
                    </>
                )}
            </span>
        </p>
    );
}
