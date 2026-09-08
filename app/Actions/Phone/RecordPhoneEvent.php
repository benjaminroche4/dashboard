<?php

declare(strict_types=1);

namespace App\Actions\Phone;

use App\Actions\Leads\CreateLead;
use App\Data\LeadData;
use App\Data\PhoneEventData;
use App\Enums\Currency;
use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\PhoneCallResult;
use App\Enums\PhoneEventKind;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\User;
use App\Models\WebhookDelivery;
use App\Support\PhoneNumber;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Journalise un appel ou un SMS reçu par la téléphonie Allo sur le lead concerné.
 *
 * Le lead est retrouvé par son numéro ; s'il n'existe pas et que le contact est
 * entrant, un lead « Téléphone » est créé et attribué au conseiller qui a répondu.
 * Une note (durée, issue, résumé de l'assistant ou texte du SMS) est ajoutée et
 * `last_contacted_at` est mis à jour. Idempotent par identifiant de livraison.
 */
final readonly class RecordPhoneEvent
{
    public const string OUTCOME_CREATED = 'created';

    public const string OUTCOME_NOTED = 'noted';

    public const string OUTCOME_IGNORED = 'ignored';

    public const string OUTCOME_DUPLICATE = 'duplicate';

    public function __construct(private CreateLead $createLead) {}

    /**
     * @return self::OUTCOME_*
     */
    public function handle(PhoneEventData $event, string $deliveryId): string
    {
        // La réservation de la livraison vit dans la même transaction que le
        // traitement : si celui-ci échoue, la relance d'Allo repart de zéro au
        // lieu de répondre « duplicate » et de perdre l'appel.
        try {
            [$outcome, $lead, $by] = DB::transaction(function () use ($event, $deliveryId): array {
                WebhookDelivery::query()->create(['provider' => 'allo', 'delivery_id' => $deliveryId, 'created_at' => now()]);

                return $this->record($event);
            });
        } catch (UniqueConstraintViolationException) {
            return self::OUTCOME_DUPLICATE;
        }

        if ($lead instanceof Lead) {
            event(new DashboardUpdated('leads', ['id' => $lead->id], $this->message($event, $lead, $by), $by));
        }

        return $outcome;
    }

    /**
     * @return array{0: self::OUTCOME_*, 1: Lead|null, 2: User|null}
     */
    private function record(PhoneEventData $event): array
    {
        if (! $event->isContact()) {
            return [self::OUTCOME_IGNORED, null, null];
        }

        $by = $event->userEmail === null ? null : User::query()->where('email', $event->userEmail)->first();
        $lead = $this->findLead($event->contactNumber());
        $created = false;

        if (! $lead instanceof Lead) {
            if (! $event->inbound) {
                return [self::OUTCOME_IGNORED, null, null];
            }

            $lead = $this->createLead($event, $by);
            $created = true;
        }

        $lead->notes()->create(['body' => $this->noteBody($event), 'user_id' => $by?->id]);

        if ($event->touchesContact()) {
            // Un webhook reçu en retard ne fait jamais reculer le dernier contact.
            $at = $event->at ?? now();
            $lead->forceFill(['last_contacted_at' => $lead->last_contacted_at === null || $lead->last_contacted_at->lt($at) ? $at : $lead->last_contacted_at])->save();
        }

        return [$created ? self::OUTCOME_CREATED : self::OUTCOME_NOTED, $lead, $by];
    }

    private function findLead(string $number): ?Lead
    {
        $suffix = PhoneNumber::suffix($number);

        if ($suffix === '') {
            return null;
        }

        return Lead::query()
            ->whereRaw("replace(replace(replace(replace(phone, ' ', ''), '.', ''), '-', ''), '+', '') like ?", ['%'.$suffix])
            ->latest('updated_at')
            ->get()
            ->first(fn (Lead $lead): bool => PhoneNumber::matches($lead->phone, $number));
    }

    private function createLead(PhoneEventData $event, ?User $by): Lead
    {
        [$firstName, $lastName] = $this->splitName($event);

        $data = new LeadData(
            firstName: $firstName,
            lastName: $lastName,
            email: null,
            phone: $event->contactNumber(),
            company: null,
            language: LeadLanguage::French,
            offer: null,
            source: LeadSource::Phone,
            sourceNote: $event->kind === PhoneEventKind::SmsReceived ? __('SMS reçu via Allo') : __('Appel entrant via Allo'),
            budgetCents: null,
            currency: Currency::EUR,
            arrivalAt: null,
            districts: [],
            propertyTypes: [],
            duration: null,
            guarantors: [],
            furnished: null,
            originCity: null,
            message: null,
            score: null,
            recontactChannel: null,
            recontactAt: null,
            qualificationNote: null,
            assignedTo: $by?->id,
        );

        return $this->createLead->handle($data, $by);
    }

    /**
     * @return array{string, string}
     */
    private function splitName(PhoneEventData $event): array
    {
        if ($event->contactName === null) {
            return [__('Inconnu'), $event->contactNumber()];
        }

        $parts = explode(' ', $event->contactName, 2);

        return [$parts[0], $parts[1] ?? ''];
    }

    private function noteBody(PhoneEventData $event): string
    {
        if ($event->kind === PhoneEventKind::SmsReceived) {
            return __('SMS reçu : :content', ['content' => $event->content ?? '']);
        }

        $details = [];

        if ($event->lengthInMinutes !== null) {
            $details[] = __(':minutes min', ['minutes' => rtrim(rtrim(number_format($event->lengthInMinutes, 1, ',', ''), '0'), ',')]);
        }

        if ($event->result instanceof PhoneCallResult) {
            $details[] = $event->result->label();
        }

        $head = $event->inbound ? __('Appel entrant') : __('Appel sortant');
        $head .= $details === [] ? '' : ' ('.implode(', ', $details).')';

        return $event->summary === null ? $head : "{$head} : {$event->summary}";
    }

    private function message(PhoneEventData $event, Lead $lead, ?User $by): string
    {
        $name = $lead->fullName();

        if ($event->kind === PhoneEventKind::SmsReceived) {
            return $by instanceof User ? "a reçu un SMS de {$name}" : "SMS reçu de {$name}";
        }

        if ($event->inbound) {
            return $by instanceof User ? "a reçu un appel de {$name}" : "Appel reçu de {$name}";
        }

        return $by instanceof User ? "a appelé {$name}" : "Appel passé à {$name}";
    }
}
