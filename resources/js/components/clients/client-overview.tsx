import {
    Building2,
    CalendarDays,
    Home,
    Languages,
    Mail,
    Map,
    MapPin,
    Phone,
    ShieldCheck,
    Sofa,
    Wallet,
} from 'lucide-react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { DossierAttentionCard } from '@/components/clients/dossier-attention-card';
import { DossierReadinessCard } from '@/components/clients/dossier-readiness';
import { DistrictMap } from '@/components/leads/district-map';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { DetailSection } from '@/components/real-estate/detail-header';
import type { AttentionItem } from '@/lib/dossier-attention';
import type { ClientDetail, DossierReadiness } from '@/types';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type FactValue = {
    icon: IconType;
    label: string;
    value: string | null;
    /** Un petit lien sous la valeur (« Voir sur la carte »), s'il y a lieu. */
    action?: ReactNode;
};

function Missing() {
    return (
        <span className="text-muted-foreground font-normal">Non renseigné</span>
    );
}

/** Un fait : le pictogramme et le libellé au-dessus, la valeur dessous. */
function Row({ icon: Icon, label, value, action }: FactValue) {
    return (
        <div className="bg-sidebar grid gap-0.5 rounded-lg border p-3">
            <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}
            </dt>
            <dd className="text-sm font-medium [overflow-wrap:anywhere]">
                {value ?? <Missing />}
            </dd>
            {action}
        </div>
    );
}

/**
 * Les arrondissements recherchés, sur la carte de Paris : un petit lien dans
 * la carte « Arrondissements », la même carte que la fiche lead en lecture.
 */
function DistrictMapDialog({ districts }: { districts: number[] }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground mt-1 inline-flex w-fit items-center gap-1 text-xs underline-offset-4 hover:underline"
                >
                    <Map className="size-3" aria-hidden />
                    Voir sur la carte
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogTitle>Arrondissements recherchés</DialogTitle>
                <DialogDescription>
                    {districts.map((d) => `${d}e`).join(', ')}
                </DialogDescription>
                <DistrictMap value={districts} readOnly />
            </DialogContent>
        </Dialog>
    );
}

/** Le projet en une phrase, comme on le dirait à un propriétaire. */
export function projectSentence(
    client: ClientDetail,
    budget: string | null,
): string {
    const type =
        client.property_types.length > 0
            ? client.property_types.join(' ou ')
            : 'un logement';
    const furnished =
        client.furnished_label && client.furnished_label !== 'Indifférent'
            ? ` ${client.furnished_label.toLowerCase()}`
            : '';
    const where =
        client.districts.length > 0
            ? ` dans le ${client.districts.map((d) => `${d}e`).join(' ou le ')}`
            : ' à Paris';
    const price = budget ? ` pour ${budget} par mois` : '';
    const duration = client.duration_label
        ? `, ${client.duration_label.toLowerCase()}`
        : '';

    return `Cherche ${type}${furnished}${where}${price}${duration}.`;
}

/**
 * Onglet « Aperçu » d'un dossier client, en deux tiers / un tiers : à gauche
 * ce qu'on lit — le projet en une phrase puis en faits, les coordonnées —, à
 * droite ce qui attend et où en est le dossier de location.
 */
export function ClientOverview({
    client,
    attention,
    readiness,
    noteButton,
    onOpenTab,
    money,
}: {
    client: ClientDetail;
    attention: AttentionItem[];
    readiness: DossierReadiness;
    /** Un bouton à droite de l'aperçu, s'il y a lieu. */
    noteButton?: ReactNode;
    onOpenTab: (tab: string) => void;
    money: (cents: number, currency: string) => string;
}) {
    const budget =
        client.budget_cents === null
            ? null
            : money(client.budget_cents, client.currency);

    const contact: FactValue[] = [
        { icon: Mail, label: 'E-mail', value: client.email },
        { icon: Phone, label: 'Téléphone', value: client.phone },
        { icon: Building2, label: 'Société', value: client.company },
        { icon: Languages, label: 'Langue', value: client.language_label },
        { icon: MapPin, label: "Ville d'origine", value: client.origin_city },
    ];
    const project: FactValue[] = [
        { icon: Wallet, label: 'Budget mensuel', value: budget },
        {
            icon: MapPin,
            label: 'Arrondissements',
            value:
                client.districts.length > 0
                    ? client.districts.map((d) => `${d}e`).join(', ')
                    : null,
            action:
                client.districts.length > 0 ? (
                    <DistrictMapDialog districts={client.districts} />
                ) : null,
        },
        {
            icon: Home,
            label: 'Type de bien',
            value:
                client.property_types.length > 0
                    ? client.property_types.join(', ')
                    : null,
        },
        { icon: CalendarDays, label: 'Durée', value: client.duration_label },
        { icon: Sofa, label: 'Meublé', value: client.furnished_label },
        { icon: ShieldCheck, label: 'Garants', value: client.guarantor_label },
    ];

    return (
        <div className="grid items-start gap-4 lg:grid-cols-3">
            {noteButton && (
                <div className="flex justify-end lg:col-span-3">
                    {noteButton}
                </div>
            )}

            <div className="grid gap-4 lg:col-span-2">
                <DetailSection title="Projet de logement">
                    <p className="text-base font-medium">
                        {projectSentence(client, budget)}
                    </p>
                    <dl className="grid gap-4 sm:grid-cols-3">
                        {project.map((fact) => (
                            <Row key={fact.label} {...fact} />
                        ))}
                    </dl>
                    {client.message && (
                        <blockquote className="text-muted-foreground border-l-2 pl-3 text-sm whitespace-pre-line">
                            {client.message}
                        </blockquote>
                    )}
                </DetailSection>
                <DetailSection title="Coordonnées">
                    <dl className="grid gap-4 sm:grid-cols-3">
                        {contact.map((fact) => (
                            <Row key={fact.label} {...fact} />
                        ))}
                    </dl>
                </DetailSection>
            </div>

            <div className="grid gap-4">
                <DossierAttentionCard items={attention} onOpenTab={onOpenTab} />
                <DetailSection title="Dossier de location">
                    <DossierReadinessCard
                        readiness={readiness}
                        leadUuid={client.uuid}
                        onOpenDocuments={() => onOpenTab('documents')}
                    />
                </DetailSection>
            </div>
        </div>
    );
}
