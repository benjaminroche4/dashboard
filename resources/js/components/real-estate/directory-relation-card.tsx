import { router } from '@inertiajs/react';
import { CalendarCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { DetailSection } from '@/components/real-estate/detail-header';
import { Button } from '@/components/ui/button';
import { parisFormat } from '@/lib/datetime';

const contactDate = parisFormat({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/**
 * Suivi de la relation d'un agent, d'une agence, d'un partenaire ou d'un
 * propriétaire : le dernier échange, le bouton qui note celui du jour, et les
 * notes libres sous un filet. Les deux tenaient chacune une carte pour une
 * ligne de texte : elles n'en font plus qu'une.
 */
export function DirectoryRelationCard({
    lastContactedAt,
    touchUrl,
    notes = null,
    extraAction,
}: {
    lastContactedAt: string | null;
    /** Route qui note l'échange (`agents.touch`, `partners.contact`…). */
    touchUrl: string;
    notes?: string | null;
    /** Action propre à la fiche, à côté d'« Échange noté ». */
    extraAction?: ReactNode;
}) {
    return (
        <DetailSection
            title="Suivi et notes"
            action={
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            router.post(touchUrl, {}, { preserveScroll: true })
                        }
                    >
                        <CalendarCheck aria-hidden />
                        Échange noté
                    </Button>
                    {extraAction}
                </div>
            }
        >
            <p className="text-muted-foreground text-sm">
                {lastContactedAt
                    ? `Dernier échange le ${contactDate.format(new Date(lastContactedAt))}`
                    : 'Aucun échange noté pour le moment.'}
            </p>
            <div className="border-t pt-3">
                {notes ? (
                    <p className="text-sm/6 whitespace-pre-line">{notes}</p>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Aucune note.
                    </p>
                )}
            </div>
        </DetailSection>
    );
}
