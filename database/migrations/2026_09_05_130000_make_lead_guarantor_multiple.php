<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->json('guarantors')->nullable()->after('duration');
        });

        DB::table('leads')->whereNotNull('guarantor')->orderBy('id')->each(function (object $lead): void {
            DB::table('leads')->where('id', $lead->id)->update(['guarantors' => json_encode([$lead->guarantor])]);
        });

        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn('guarantor');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->string('guarantor')->nullable()->after('duration');
        });

        DB::table('leads')->whereNotNull('guarantors')->orderBy('id')->each(function (object $lead): void {
            $values = json_decode((string) $lead->guarantors, true);
            DB::table('leads')->where('id', $lead->id)->update(['guarantor' => $values[0] ?? null]);
        });

        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn('guarantors');
        });
    }
};
