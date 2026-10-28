import { Link } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import {
    PictureMenuItem,
    PictureTile,
    type PictureLabels,
} from '@/components/picture-tile';
import { show as agencyShow } from '@/routes/agencies';
import {
    destroy as destroyPhoto,
    update as updatePhoto,
} from '@/routes/agents/photo';
import type { Agent } from '@/types';

type PhotoAgent = Pick<Agent, 'uuid' | 'name' | 'photo'> & {
    agency?: Pick<NonNullable<Agent['agency']>, 'uuid' | 'name'> | null;
};

const labels: PictureLabels = {
    add: 'Ajouter une photo',
    change: 'Changer la photo',
    remove: 'Retirer la photo',
    choose: 'Choisir une photo',
    tooLarge: 'La photo ne doit pas dépasser 2 Mo.',
};

/**
 * La pastille de l'en-tête de la fiche agent : sa photo, ou ses initiales
 * sans photo, cliquable pour en poser une (même geste que le logo d'une
 * entreprise, demandé le 28 octobre 2026). Une photo de personne remplit la
 * pastille (`cover`), un logo garde sa marge. Un agent rattaché porte en bas
 * à droite une **pastille d'agence** (pictogramme d'immeuble, lien vers sa
 * fiche, demandé le même jour) ; un indépendant n'en a pas.
 */
export function AgentPhotoTile({
    agent,
    className = 'bg-primary/10 text-primary',
}: {
    agent: PhotoAgent;
    /** Teinte de la pastille d'initiales, sans photo. */
    className?: string;
}) {
    return (
        <span className="relative inline-flex shrink-0">
            <PictureTile
                name={agent.name}
                src={agent.photo}
                uploadUrl={updatePhoto({ agent: agent.uuid }).url}
                field="photo"
                labels={labels}
                fit="cover"
                className={className}
            />
            {agent.agency && (
                <Link
                    href={agencyShow({ agency: agent.agency.uuid })}
                    aria-label={`Agence : ${agent.agency.name}`}
                    title={agent.agency.name}
                    data-testid="agent-agency-badge"
                    className="bg-background text-muted-foreground ring-background hover:text-foreground absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full border ring-2"
                >
                    <Building2 className="size-3" aria-hidden />
                </Link>
            )}
        </span>
    );
}

/** Entrée « Retirer la photo » du menu « ⋯ » de la fiche ; absente sans photo. */
export function AgentPhotoMenuItem({ agent }: { agent: PhotoAgent }) {
    return (
        <PictureMenuItem
            src={agent.photo}
            removeUrl={destroyPhoto({ agent: agent.uuid }).url}
            label={labels.remove}
        />
    );
}
