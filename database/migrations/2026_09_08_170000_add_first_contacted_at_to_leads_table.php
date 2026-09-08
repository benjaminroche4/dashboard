<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Date du tout premier contact, posée une seule fois : `last_contacted_at`
     * est écrasé à chaque échange et faussait le « délai de premier contact ».
     */
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dateTime('first_contacted_at')->nullable()->after('last_contacted_at');
        });

        DB::table('leads')->whereNotNull('last_contacted_at')->update(['first_contacted_at' => DB::raw('last_contacted_at')]);
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn('first_contacted_at');
        });
    }
};
