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
        Schema::create('partner_contacts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('position')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->timestamps();
        });

        // L'ancien interlocuteur unique devient le premier contact du partenaire.
        $now = now();
        DB::table('partners')->whereNotNull('contact_name')->orderBy('id')->each(function (object $partner) use ($now): void {
            $parts = preg_split('/\s+/', trim((string) $partner->contact_name), 2) ?: [];
            $first = $parts[0] ?? '';

            if ($first === '') {
                return;
            }

            DB::table('partner_contacts')->insert([
                'partner_id' => $partner->id,
                'first_name' => $first,
                'last_name' => $parts[1] ?? '',
                'email' => $partner->email,
                'phone' => $partner->phone,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });

        Schema::table('partners', function (Blueprint $table): void {
            $table->dropColumn('contact_name');
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table): void {
            $table->string('contact_name')->nullable()->after('type');
        });
        Schema::dropIfExists('partner_contacts');
    }
};
