<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Champs complets de la Converting Machine : contact enrichi, projet logement, qualification.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->string('company')->nullable()->after('phone');
            $table->string('language', 2)->default('fr')->after('company');
            $table->string('source_note')->nullable()->after('source');
            $table->json('districts')->nullable()->after('origin_city');
            $table->json('property_types')->nullable()->after('districts');
            $table->string('duration')->nullable()->after('property_types');
            $table->string('guarantor')->nullable()->after('duration');
            $table->string('furnished')->nullable()->after('guarantor');
            $table->string('recontact_channel')->nullable()->after('score');
            $table->date('recontact_at')->nullable()->after('recontact_channel');
            $table->text('qualification_note')->nullable()->after('recontact_at');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->dropColumn([
                'company', 'language', 'source_note', 'districts', 'property_types', 'duration',
                'guarantor', 'furnished', 'recontact_channel', 'recontact_at', 'qualification_note',
            ]);
        });
    }
};
