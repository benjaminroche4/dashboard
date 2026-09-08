<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Équipements et atouts d'un bien proposé à la location.
 */
enum PropertyAmenity: string
{
    case Elevator = 'elevator';
    case Balcony = 'balcony';
    case Terrace = 'terrace';
    case Wifi = 'wifi';
    case WashingMachine = 'washing_machine';
    case Dishwasher = 'dishwasher';
    case Oven = 'oven';
    case Tv = 'tv';
    case AirConditioning = 'air_conditioning';
    case Parking = 'parking';
    case Cellar = 'cellar';
    case Garden = 'garden';
    case Dryer = 'dryer';
    case Microwave = 'microwave';
    case Bathtub = 'bathtub';
    case Intercom = 'intercom';
    case Concierge = 'concierge';
    case NaturalLight = 'natural_light';
    case DoubleGlazing = 'double_glazing';
    case WheelchairAccess = 'wheelchair_access';
    case BikeStorage = 'bike_storage';
    case Workspace = 'workspace';
    case Gym = 'gym';
    case Pool = 'pool';

    public function label(): string
    {
        return match ($this) {
            self::Elevator => 'Ascenseur',
            self::Balcony => 'Balcon',
            self::Terrace => 'Terrasse',
            self::Wifi => 'Wi-Fi',
            self::WashingMachine => 'Lave-linge',
            self::Dishwasher => 'Lave-vaisselle',
            self::Oven => 'Four',
            self::Tv => 'Télévision',
            self::AirConditioning => 'Climatisation',
            self::Parking => 'Parking',
            self::Cellar => 'Cave',
            self::Garden => 'Jardin',
            self::Dryer => 'Sèche-linge',
            self::Microwave => 'Micro-ondes',
            self::Bathtub => 'Baignoire',
            self::Intercom => 'Interphone',
            self::Concierge => 'Gardien',
            self::NaturalLight => 'Lumineux',
            self::DoubleGlazing => 'Double vitrage',
            self::WheelchairAccess => 'Accès PMR',
            self::BikeStorage => 'Local vélos',
            self::Workspace => 'Espace de travail',
            self::Gym => 'Salle de sport',
            self::Pool => 'Piscine',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
