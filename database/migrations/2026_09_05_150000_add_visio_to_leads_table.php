<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dateTime('visio_at')->nullable()->after('recontact_at');
            $table->string('visio_event_id')->nullable()->after('visio_at');
            $table->string('visio_meet_link')->nullable()->after('visio_event_id');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn(['visio_at', 'visio_event_id', 'visio_meet_link']);
        });
    }
};
