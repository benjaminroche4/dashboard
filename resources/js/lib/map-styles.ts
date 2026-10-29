/**
 * Fond discret partagé par toutes les cartes Google du backoffice (visites,
 * biens, agences, origine des leads) : couleurs désaturées, ni commerces ni
 * transports, pour que les pastilles restent ce qu'on lit en premier.
 */
export const mapStyles: google.maps.MapTypeStyle[] = [
    {
        elementType: 'geometry',
        stylers: [{ saturation: -60 }, { lightness: 20 }],
    },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
