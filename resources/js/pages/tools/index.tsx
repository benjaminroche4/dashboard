import { Head, Link } from '@inertiajs/react';
import { FileSignature, FileText, History, Receipt } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { index as invoicesIndex } from '@/routes/invoices';
import { index as toolsIndex } from '@/routes/tools';
import { index as activityIndex } from '@/routes/tools/activity';
import { index as documentsIndex } from '@/routes/tools/documents';
import { index as quotesIndex } from '@/routes/tools/quotes';

type ToolCardProps = {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    href: ReturnType<typeof toolsIndex>;
    cta: string;
};

/** Même panneau que les fiches : fond « sidebar », une seule bordure. */
function ToolCard({
    title,
    description,
    icon: Icon,
    href,
    cta,
}: ToolCardProps) {
    return (
        <section
            aria-label={title}
            className="bg-sidebar flex flex-col gap-3 rounded-xl border p-4"
        >
            <div className="flex items-center gap-3">
                <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                    <Icon
                        aria-hidden={true}
                        className="text-muted-foreground size-4"
                    />
                </span>
                <h2 className="text-sm font-medium">{title}</h2>
            </div>
            {/* Trait et texte alignés sur le titre, pas sur l'icône : ils commencent
                après la colonne de l'icône (size-8) et son écart (gap-3). */}
            <div className="grid gap-3 pl-11">
                <Separator />
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            <div className="mt-auto flex justify-end pt-1">
                <Button size="sm" asChild>
                    <Link href={href}>{cta}</Link>
                </Button>
            </div>
        </section>
    );
}

export default function ToolsIndex() {
    return (
        <>
            <Head title="Outils" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="pt-8 pb-6">
                    <h1 className="text-lg font-medium">Outils</h1>
                    <p className="text-muted-foreground text-sm">
                        Les outils de l'équipe pour accompagner les clients.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ToolCard
                        title="Devis"
                        icon={FileSignature}
                        description="Chiffrez une offre avant la facture : PDF envoyé au client, suivi accepté ou refusé, puis facture créée d'un clic."
                        href={quotesIndex()}
                        cta="Voir les devis"
                    />
                    <ToolCard
                        title="Factures"
                        icon={Receipt}
                        description="Émettez et suivez les factures : envoi avec PDF, paiement, retards détectés chaque nuit, rattachement au lead."
                        href={invoicesIndex()}
                        cta="Voir les factures"
                    />
                    <ToolCard
                        title="Listes de pièces"
                        icon={FileText}
                        description="Générez le PDF des pièces à fournir par le client (pièce d'identité, justificatifs, contrat signé…), par personne du foyer."
                        href={documentsIndex()}
                        cta="Voir les listes"
                    />
                    <ToolCard
                        title="Journal d'activité"
                        icon={History}
                        description="Toutes les actions de l'équipe, jour par jour : qui a fait quoi, sur quel dossier, avec filtres par membre et par ressource."
                        href={activityIndex()}
                        cta="Voir le journal"
                    />
                </div>
            </div>
        </>
    );
}

ToolsIndex.layout = {
    breadcrumbs: [{ title: 'Outils', href: toolsIndex() }],
};
