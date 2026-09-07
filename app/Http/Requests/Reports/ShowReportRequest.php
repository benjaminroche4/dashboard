<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use Carbon\CarbonInterface;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Période du rapport : 3, 6 ou 12 derniers mois, ou 24 (deux ans).
 */
class ShowReportRequest extends FormRequest
{
    /** @var list<int> */
    public const array MONTHS = [3, 6, 12, 24];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ['months' => ['nullable', 'integer', Rule::in(self::MONTHS)]];
    }

    public function months(): int
    {
        return (int) ($this->validated('months') ?? 12);
    }

    public function from(): CarbonInterface
    {
        return now()->subMonths($this->months() - 1)->startOfMonth();
    }

    public function to(): CarbonInterface
    {
        return now()->endOfDay();
    }
}
