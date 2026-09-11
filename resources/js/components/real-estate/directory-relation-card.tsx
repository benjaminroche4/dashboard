import { router } from '@inertiajs/react';
import { CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const contactDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/**
 * Suivi de la relation d'une agence ou d'un agent : quand on s'est parlé pour
 * la dernière fois, et le bouton qui note l'échange du jour. Même carte que
 * sur la fiche d'un partenaire.
 */
export function DirectoryRelationCard({
    lastContactedAt,
    touchUrl,
}: {
    lastContactedAt: string | null;
    /** Route qui note l'échange (`agents.touch` ou `agencies.touch`). */
    touchUrl: string;
}) {
    return (
        <section
            aria-label="Suivi de la relation"
            className="bg-sidebar grid gap-3 rounded-xl border p-4"
        >
            <h2 className="text-base font-medium">Suivi de la relation</h2>
            <div className="bg-background grid gap-2 rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">
                    {lastContactedAt
                        ? `Dernier échange le ${contactDate.format(new Date(lastContactedAt))}`
                        : 'Aucun échange noté pour le moment.'}
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() =>
                        router.post(touchUrl, {}, { preserveScroll: true })
                    }
                >
                    <CalendarCheck aria-hidden />
                    Échange noté
                </Button>
            </div>
        </section>
    );
}
