import { Head, Link } from '@inertiajs/react';
import { FileSignature, FileText, History, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { index as invoicesIndex } from '@/routes/invoices';
import { index as toolsIndex } from '@/routes/tools';
import { index as activityIndex } from '@/routes/tools/activity';
import { index as documentsIndex } from '@/routes/tools/documents';
import { index as quotesIndex } from '@/routes/tools/quotes';

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
                    {/* Même panneau que les fiches : fond « sidebar », une seule bordure. */}
                    <section
                        aria-label="Devis"
                        className="bg-sidebar flex flex-col gap-4 rounded-xl border p-4"
                    >
                        <div className="flex items-start gap-3">
                            <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                                <FileSignature
                                    aria-hidden="true"
                                    className="text-muted-foreground size-4"
                                />
                            </span>
                            <div className="grid gap-1">
                                <h2 className="text-sm font-medium">Devis</h2>
                                <p className="text-muted-foreground text-sm">
                                    Chiffrez une offre avant la facture : PDF
                                    envoyé au client, suivi accepté ou refusé,
                                    puis facture créée d'un clic.
                                </p>
                            </div>
                        </div>
                        <div className="mt-auto flex justify-end">
                            <Button size="sm" asChild>
                                <Link href={quotesIndex()}>Voir les devis</Link>
                            </Button>
                        </div>
                    </section>
                    <section
                        aria-label="Factures"
                        className="bg-sidebar flex flex-col gap-4 rounded-xl border p-4"
                    >
                        <div className="flex items-start gap-3">
                            <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                                <Receipt
                                    aria-hidden="true"
                                    className="text-muted-foreground size-4"
                                />
                            </span>
                            <div className="grid gap-1">
                                <h2 className="text-sm font-medium">
                                    Factures
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Émettez et suivez les factures : envoi avec
                                    PDF, paiement, retards détectés chaque nuit,
                                    rattachement au lead.
                                </p>
                            </div>
                        </div>
                        <div className="mt-auto flex justify-end">
                            <Button size="sm" asChild>
                                <Link href={invoicesIndex()}>
                                    Voir les factures
                                </Link>
                            </Button>
                        </div>
                    </section>
                    <section
                        aria-label="Liste de documents"
                        className="bg-sidebar flex flex-col gap-4 rounded-xl border p-4"
                    >
                        <div className="flex items-start gap-3">
                            <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                                <FileText
                                    aria-hidden="true"
                                    className="text-muted-foreground size-4"
                                />
                            </span>
                            <div className="grid gap-1">
                                <h2 className="text-sm font-medium">
                                    Liste de documents
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Générez le PDF des pièces à fournir par le
                                    client (pièce d'identité, justificatifs,
                                    contrat signé…), par personne du foyer.
                                </p>
                            </div>
                        </div>
                        <div className="mt-auto flex justify-end">
                            <Button size="sm" asChild>
                                <Link href={documentsIndex()}>
                                    Voir les demandes
                                </Link>
                            </Button>
                        </div>
                    </section>
                    <section
                        aria-label="Journal d'activité"
                        className="bg-sidebar flex flex-col gap-4 rounded-xl border p-4"
                    >
                        <div className="flex items-start gap-3">
                            <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                                <History
                                    aria-hidden="true"
                                    className="text-muted-foreground size-4"
                                />
                            </span>
                            <div className="grid gap-1">
                                <h2 className="text-sm font-medium">
                                    Journal d'activité
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Toutes les actions de l'équipe, jour par
                                    jour : qui a fait quoi, sur quel dossier,
                                    avec filtres par membre et par ressource.
                                </p>
                            </div>
                        </div>
                        <div className="mt-auto flex justify-end">
                            <Button size="sm" asChild>
                                <Link href={activityIndex()}>
                                    Voir le journal
                                </Link>
                            </Button>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

ToolsIndex.layout = {
    breadcrumbs: [{ title: 'Outils', href: toolsIndex() }],
};
