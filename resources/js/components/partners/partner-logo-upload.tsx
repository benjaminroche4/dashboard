import {
    PictureMenuItem,
    PictureTile,
    type PictureLabels,
} from '@/components/picture-tile';
import {
    destroy as destroyLogo,
    update as updateLogo,
} from '@/routes/partners/logo';
import type { Partner } from '@/types';

type LogoPartner = Pick<Partner, 'uuid' | 'name' | 'logo'>;

const labels: PictureLabels = {
    add: 'Ajouter un logo',
    change: 'Changer le logo',
    remove: 'Retirer le logo',
    choose: 'Choisir un logo',
    tooLarge: 'Le logo ne doit pas dépasser 2 Mo.',
};

/**
 * La pastille de l'en-tête de la fiche partenaire : son logo, ou ses
 * initiales sans logo, cliquable pour en poser un (`PictureTile`, le même
 * geste que le logo d'une agence ; demandé le 28 octobre 2026).
 */
export function PartnerLogoTile({ partner }: { partner: LogoPartner }) {
    return (
        <PictureTile
            name={partner.name}
            src={partner.logo}
            uploadUrl={updateLogo({ partner: partner.uuid }).url}
            field="logo"
            labels={labels}
        />
    );
}

/** Entrée « Retirer le logo » du menu « ⋯ » de la fiche ; absente sans logo. */
export function PartnerLogoMenuItem({ partner }: { partner: LogoPartner }) {
    return (
        <PictureMenuItem
            src={partner.logo}
            removeUrl={destroyLogo({ partner: partner.uuid }).url}
            label={labels.remove}
        />
    );
}
