<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reports;

use App\Actions\Reports\BuildReport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ShowReportRequest;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(ShowReportRequest $request, BuildReport $buildReport): Response
    {
        return Inertia::render('reports/index', [
            'report' => $buildReport->handle($request->from(), $request->to()),
            'months' => $request->months(),
            'periods' => ShowReportRequest::MONTHS,
            'generatedAt' => now()->toIso8601String(),
        ]);
    }
}
