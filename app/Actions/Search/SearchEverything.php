<?php

declare(strict_types=1);

namespace App\Actions\Search;

use App\Enums\Currency;
use App\Enums\LeadStatus;
use App\Enums\SiteSection;
use App\Enums\VisitStatus;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Partner;
use App\Models\Property;
use App\Models\Quote;
use App\Models\User;
use App\Models\Visit;
use App\Support\PhoneNumber;
use App\Support\SearchSql;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * La recherche de la palette ⌘K en un seul appel : chaque annuaire que le
 * membre peut consulter est interrogé, les résultats sont notés sur leur
 * titre (commence par, un mot commence par, contient) et les groupes se
 * classent par meilleure note — « Durand » remonte le dossier Durand avant
 * la facture adressée à « Société Durand-Lefort ».
 *
 * Sans texte, la palette reçoit « mes dossiers » : les dossiers clients que
 * le membre suit, les plus récemment modifiés d'abord.
 *
 * @phpstan-type Hit array{kind: string, id: int, uuid: string, title: string, subtitle: string|null, meta: string|null, url: string, score: int}
 * @phpstan-type Group array{kind: string, heading: string, hits: list<Hit>}
 */
final class SearchEverything
{
    /** Résultats par groupe. */
    public const int LIMIT = 6;

    /** Dossiers proposés quand la palette s'ouvre à vide. */
    public const int MINE = 5;

    /** Caractères minimum avant d'interroger les annuaires. */
    public const int MIN_LENGTH = 2;

    /** @return array{groups: list<Group>, mine: list<Hit>} */
    public function handle(User $user, string $needle): array
    {
        if (mb_strlen($needle) < self::MIN_LENGTH) {
            return ['groups' => [], 'mine' => array_values($this->mine($user))];
        }

        $like = '%'.$needle.'%';
        $digits = PhoneNumber::digits($needle);
        $phone = strlen($digits) >= 6 ? '%'.substr($digits, -9) : null;

        $groups = array_values(array_filter([
            $user->canRead(SiteSection::Clients) ? $this->group('clients', 'Dossiers clients', $this->leads($needle, $like, $phone, clients: true)) : null,
            $user->canRead(SiteSection::Leads, SiteSection::OwnerLeads) ? $this->group('leads', 'Leads', $this->leads($needle, $like, $phone, clients: false)) : null,
            $user->canRead(SiteSection::Visits) ? $this->group('visits', 'Visites', $this->visits($needle, $like)) : null,
            $user->canRead(SiteSection::Partners) ? $this->group('partners', 'Partenaires', $this->partners($needle, $like, $phone)) : null,
            $user->canRead(SiteSection::Companies) ? $this->group('companies', 'Entreprises', $this->companies($needle, $like, $phone)) : null,
            $user->canRead(SiteSection::Agents) ? $this->group('agents', 'Agents', $this->agents($needle, $like, $phone)) : null,
            $user->canRead(SiteSection::Agents) ? $this->group('agencies', 'Agences', $this->agencies($needle, $like, $phone)) : null,
            $user->canRead(SiteSection::Owners) ? $this->group('owners', 'Propriétaires', $this->owners($needle, $like, $phone)) : null,
            $user->canRead(SiteSection::Properties) ? $this->group('properties', 'Biens', $this->properties($needle, $like)) : null,
            $user->canRead(SiteSection::Quotes) ? $this->group('quotes', 'Devis', $this->quotes($needle, $like)) : null,
            $user->canRead(SiteSection::Invoices) ? $this->group('invoices', 'Factures', $this->invoices($needle, $like)) : null,
        ], fn (?array $group): bool => $group !== null && $group['hits'] !== []));

        // Le groupe qui porte la meilleure note passe en tête ; à égalité, l'ordre ci-dessus.
        usort($groups, fn (array $a, array $b): int => $b['hits'][0]['score'] <=> $a['hits'][0]['score']);

        return ['groups' => $groups, 'mine' => []];
    }

    /**
     * @param  array<int, Hit>  $hits
     * @return Group
     */
    private function group(string $kind, string $heading, array $hits): array
    {
        usort($hits, fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return ['kind' => $kind, 'heading' => $heading, 'hits' => array_slice($hits, 0, self::LIMIT)];
    }

    /**
     * Note d'un résultat d'après son titre : 3 s'il commence par le texte,
     * 2 si l'un de ses mots commence par le texte, 1 sinon (trouvé ailleurs :
     * e-mail, téléphone, adresse…). Accents et casse ignorés.
     */
    public static function score(string $title, string $needle): int
    {
        $title = Str::lower(Str::ascii($title));
        $needle = Str::lower(Str::ascii($needle));

        if ($needle === '' || $title === '') {
            return 1;
        }

        if (str_starts_with($title, $needle)) {
            return 3;
        }

        foreach (preg_split('/[\s\-\']+/', $title) ?: [] as $word) {
            if ($word !== '' && str_starts_with($word, $needle)) {
                return 2;
            }
        }

        return 1;
    }

    /** @return Hit */
    private function hit(string $kind, int $id, string $uuid, string $title, ?string $subtitle, ?string $meta, string $url, string $needle): array
    {
        return [
            'kind' => $kind,
            'id' => $id,
            'uuid' => $uuid,
            'title' => $title,
            'subtitle' => $subtitle !== '' ? $subtitle : null,
            'meta' => $meta,
            'url' => $url,
            'score' => self::score($title, $needle),
        ];
    }

    private function money(int $cents, Currency $currency): string
    {
        return number_format($cents / 100, 2, ',', ' ').' '.($currency === Currency::EUR ? '€' : $currency->value);
    }

    /** @return array<int, Hit> */
    private function mine(User $user): array
    {
        if (! $user->canRead(SiteSection::Clients)) {
            return [];
        }

        return Lead::query()
            ->where('status', LeadStatus::Converted)
            ->where(fn (Builder $query) => $query->where('assigned_to', $user->id)->orWhere('co_assigned_to', $user->id))
            ->latest('updated_at')
            ->limit(self::MINE)
            ->get()
            ->map(fn (Lead $lead): array => $this->hit('clients', $lead->id, $lead->uuid, $lead->householdName(), $lead->reference, $lead->offer?->label(), route('clients.show', $lead), ''))
            ->all();
    }

    /**
     * Dossiers (leads convertis ou clôturés) ou leads en cours : une personne se
     * trouve par son nom, sa référence, sa société, sa ville, son e-mail ou la fin
     * de son numéro.
     *
     * @return array<int, Hit>
     */
    private function leads(string $needle, string $like, ?string $phone, bool $clients): array
    {
        return Lead::query()
            ->where(fn (Builder $query) => $clients
                ? $query->where('status', LeadStatus::Converted)->orWhereNotNull('closed_at')
                : $query->where('status', '!=', LeadStatus::Converted)->whereNull('closed_at'))
            ->where(function (Builder $query) use ($like, $phone): void {
                $query->where(SearchSql::fullName(), 'like', $like)
                    ->orWhere(SearchSql::coFullName(), 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('reference', 'like', $like)
                    ->orWhere('company', 'like', $like)
                    ->orWhere('origin_city', 'like', $like)
                    ->when($phone, fn (Builder $query, string $phone) => $query
                        ->orWhere(SearchSql::phoneDigits(), 'like', $phone)
                        ->orWhere(SearchSql::coPhoneDigits(), 'like', $phone));
            })
            ->latest('updated_at')
            ->limit(self::LIMIT * 2)
            ->get()
            ->map(fn (Lead $lead): array => $this->hit(
                $clients ? 'clients' : 'leads',
                $lead->id,
                $lead->uuid,
                $lead->isClient() ? $lead->householdName() : $lead->fullName(),
                implode(' · ', array_filter([$lead->reference, $lead->company])),
                $lead->isClosed() ? 'Dossier clôturé' : $lead->status->label(),
                $lead->isClient() ? route('clients.show', $lead) : route('leads.show', $lead),
                $needle,
            ))
            ->all();
    }

    /**
     * Visites à venir ou récentes, par client ou par adresse du bien.
     *
     * @return array<int, Hit>
     */
    private function visits(string $needle, string $like): array
    {
        return Visit::query()
            ->with(['lead', 'property'])
            ->where('status', '!=', VisitStatus::Cancelled)
            ->where(fn (Builder $query) => $query
                ->whereHas('lead', fn (Builder $lead) => $lead->where(SearchSql::fullName(), 'like', $like)->orWhere('reference', 'like', $like))
                ->orWhereHas('property', fn (Builder $property) => $property->where('street', 'like', $like)->orWhere('title', 'like', $like)))
            ->orderByRaw('case when scheduled_at >= ? then 0 else 1 end', [now()])
            ->oldest('scheduled_at')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Visit $visit): array => $this->hit(
                'visits',
                $visit->id,
                $visit->uuid,
                $visit->lead->householdName(),
                $visit->property->label(),
                $visit->scheduled_at->locale('fr')->isoFormat('ddd D MMM · HH:mm'),
                route('clients.visits.show', $visit),
                $needle,
            ))
            ->all();
    }

    /** @return array<int, Hit> */
    private function partners(string $needle, string $like, ?string $phone): array
    {
        return Partner::query()
            ->with('contacts')
            ->where(function (Builder $query) use ($like, $phone): void {
                $query->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->when($phone, fn (Builder $query, string $phone) => $query->orWhere(SearchSql::phoneDigits(), 'like', $phone))
                    ->orWhereHas('contacts', fn (Builder $contacts) => $contacts
                        ->where(SearchSql::fullName(), 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->when($phone, fn (Builder $query, string $phone) => $query->orWhere(SearchSql::phoneDigits(), 'like', $phone)));
            })
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Partner $partner): array => $this->hit('partners', $partner->id, $partner->uuid, $partner->name, $partner->contacts->first()?->fullName(), $partner->type->label(), route('partners.show', $partner), $needle))
            ->all();
    }

    /** @return array<int, Hit> */
    private function companies(string $needle, string $like, ?string $phone): array
    {
        return Company::query()
            ->with('contacts')
            ->where(function (Builder $query) use ($like, $phone): void {
                $query->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->when($phone, fn (Builder $query, string $phone) => $query->orWhere(SearchSql::phoneDigits(), 'like', $phone))
                    ->orWhereHas('contacts', fn (Builder $contacts) => $contacts
                        ->where(SearchSql::fullName(), 'like', $like)
                        ->orWhere('email', 'like', $like));
            })
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Company $company): array => $this->hit('companies', $company->id, $company->uuid, $company->name, $company->contacts->firstWhere('is_primary', true)?->fullName() ?? $company->contacts->first()?->fullName() ?? $company->city, null, route('companies.show', $company), $needle))
            ->all();
    }

    /** @return array<int, Hit> */
    private function agents(string $needle, string $like, ?string $phone): array
    {
        return Agent::query()
            ->with('agency')
            ->where(function (Builder $query) use ($like, $phone): void {
                $query->where(SearchSql::fullName(), 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->when($phone, fn (Builder $query, string $phone) => $query->orWhere(SearchSql::phoneDigits(), 'like', $phone))
                    ->orWhereHas('agency', fn (Builder $agency) => $agency->where('name', 'like', $like));
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Agent $agent): array => $this->hit('agents', $agent->id, $agent->uuid, $agent->fullName(), $agent->agency?->name, $agent->position?->label(), route('agents.show', $agent), $needle))
            ->all();
    }

    /** @return array<int, Hit> */
    private function agencies(string $needle, string $like, ?string $phone): array
    {
        return Agency::query()
            ->withCount('agents')
            ->where(function (Builder $query) use ($like, $phone): void {
                $query->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('city', 'like', $like)
                    ->when($phone, fn (Builder $query, string $phone) => $query->orWhere(SearchSql::phoneDigits(), 'like', $phone));
            })
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Agency $agency): array => $this->hit('agencies', $agency->id, $agency->uuid, $agency->name, $agency->city, $agency->agents_count > 0 ? "{$agency->agents_count} agent(s)" : null, route('agencies.show', $agency), $needle))
            ->all();
    }

    /** @return array<int, Hit> */
    private function owners(string $needle, string $like, ?string $phone): array
    {
        return Owner::query()
            ->where(function (Builder $query) use ($like, $phone): void {
                $query->where(SearchSql::fullName(), 'like', $like)
                    ->orWhere('company', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->when($phone, fn (Builder $query, string $phone) => $query->orWhere(SearchSql::phoneDigits(), 'like', $phone));
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Owner $owner): array => $this->hit('owners', $owner->id, $owner->uuid, $owner->fullName(), $owner->contactName(), $owner->kind->label(), route('owners.show', $owner), $needle))
            ->all();
    }

    /** @return array<int, Hit> */
    private function properties(string $needle, string $like): array
    {
        $district = preg_match('/^(\d{1,2})\s*(?:e|er|ème|eme)?$/iu', $needle, $matches) === 1 ? (int) $matches[1] : null;

        return Property::query()
            ->where(function (Builder $query) use ($like, $district): void {
                $query->where('title', 'like', $like)
                    ->orWhere('street', 'like', $like)
                    ->orWhere('city', 'like', $like)
                    ->when($district !== null && $district >= 1 && $district <= 20, fn (Builder $query) => $query->orWhere('district', $district));
            })
            ->latest()
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Property $property): array => $this->hit('properties', $property->id, $property->uuid, $property->label(), trim($property->street.', '.$property->postal_code.' '.$property->city, ', '), $property->status->label(), route('properties.show', $property), $needle))
            ->all();
    }

    /** @return array<int, Hit> */
    private function quotes(string $needle, string $like): array
    {
        return Quote::query()
            ->where(fn (Builder $query) => $query->where('number', 'like', $like)->orWhere('client_name', 'like', $like))
            ->latest('issued_at')
            ->orderByDesc('id')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Quote $quote): array => $this->hit('quotes', $quote->id, $quote->uuid, $quote->number, $quote->client_name.' · '.$this->money($quote->amount_cents, $quote->currency), $quote->status->label(), route('tools.quotes.show', $quote), $needle))
            ->all();
    }

    /** @return array<int, Hit> */
    private function invoices(string $needle, string $like): array
    {
        return Invoice::query()
            ->where(fn (Builder $query) => $query->where('number', 'like', $like)->orWhere('client_name', 'like', $like)->orWhere('client_email', 'like', $like))
            ->latest('issued_at')
            ->orderByDesc('id')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Invoice $invoice): array => $this->hit('invoices', $invoice->id, $invoice->uuid, $invoice->number, $invoice->client_name.' · '.$this->money($invoice->amount_cents, $invoice->currency), $invoice->status->label(), route('invoices.show', $invoice), $needle))
            ->all();
    }
}
