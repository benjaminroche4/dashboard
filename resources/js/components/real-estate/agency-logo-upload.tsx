import {
    PictureMenuItem,
    PictureTile,
    type PictureLabels,
} from '@/components/picture-tile';
import {
    destroy as destroyLogo,
    update as updateLogo,
} from '@/routes/agencies/logo';
import type { Agency } from '@/types';

type LogoAgency = Pick<Agency, 'uuid' | 'name' | 'logo'>;

const labels: PictureLabels = {
    add: 'Ajouter un logo',
    change: 'Changer le logo',
    remove: 'Retirer le logo',
    choose: 'Choisir un logo',
    tooLarge: 'Le logo ne doit pas dépasser 2 Mo.',
};

/**
 * La pastille de l'en-tête de la fiche agence : son logo, ou ses initiales
 * sans logo, cliquable pour en poser un (`PictureTile`, le même geste que le
 * logo d'une entreprise ; demandé le 28 octobre 2026). Un logo garde sa
 * marge dans un carré légèrement arrondi.
 */
export function AgencyLogoTile({ agency }: { agency: LogoAgency }) {
    return (
        <PictureTile
            name={agency.name}
            src={agency.logo}
            uploadUrl={updateLogo({ agency: agency.uuid }).url}
            field="logo"
            labels={labels}
        />
    );
}

/** Entrée « Retirer le logo » du menu « ⋯ » de la fiche ; absente sans logo. */
export function AgencyLogoMenuItem({ agency }: { agency: LogoAgency }) {
    return (
        <PictureMenuItem
            src={agency.logo}
            removeUrl={destroyLogo({ agency: agency.uuid }).url}
            label={labels.remove}
        />
    );
}
