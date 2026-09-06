<?php

declare(strict_types=1);

use App\Actions\Leads\GenerateLeadReference;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->string('reference', 20)->nullable()->unique()->after('id');
        });

        $generate = new GenerateLeadReference;
        DB::table('leads')->whereNull('reference')->orderBy('id')->each(function (object $lead) use ($generate): void {
            DB::table('leads')->where('id', $lead->id)->update(['reference' => $generate->handle()]);
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropUnique(['reference']);
            $table->dropColumn('reference');
        });
    }
};
