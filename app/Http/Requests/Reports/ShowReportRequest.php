<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Enums\ReportPeriod;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Date;
use Illuminate\Validation\Rule;

/**
 * Période du rapport : un raccourci (`period`) ou deux dates (`period=custom`).
 */
class ShowReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'period' => ['nullable', Rule::enum(ReportPeriod::class)],
            'from' => ['nullable', 'date', 'required_if:period,custom'],
            'to' => ['nullable', 'date', 'after_or_equal:from', 'required_if:period,custom'],
        ];
    }

    public function period(): ReportPeriod
    {
        return ReportPeriod::tryFrom((string) $this->validated('period')) ?? ReportPeriod::Days30;
    }

    public function from(): CarbonInterface
    {
        $period = $this->period();

        return $period->start(today())
            ?? Date::parse((string) $this->validated('from'))->startOfDay();
    }

    public function to(): CarbonInterface
    {
        if ($this->period() !== ReportPeriod::Custom) {
            return now()->endOfDay();
        }

        return Date::parse((string) $this->validated('to'))->endOfDay();
    }
}
