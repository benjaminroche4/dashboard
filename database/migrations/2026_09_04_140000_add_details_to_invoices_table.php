<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table): void {
            $table->text('client_address')->nullable()->after('client_email');
            $table->json('items')->nullable()->after('client_address');
            $table->decimal('vat_rate', 5, 2)->default(0)->after('items');
            $table->unsignedBigInteger('subtotal_cents')->default(0)->after('vat_rate');
            $table->unsignedBigInteger('vat_cents')->default(0)->after('subtotal_cents');
            $table->text('notes')->nullable()->after('paid_at');
            $table->foreignId('created_by')->nullable()->after('notes')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['client_address', 'items', 'vat_rate', 'subtotal_cents', 'vat_cents', 'notes']);
        });
    }
};
