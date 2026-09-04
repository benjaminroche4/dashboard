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
            $table->decimal('discount_percent', 5, 2)->default(0)->after('vat_rate');
            $table->unsignedBigInteger('discount_cents')->default(0)->after('discount_percent');
            $table->unsignedBigInteger('deposit_cents')->default(0)->after('amount_cents');
            $table->timestamp('sent_at')->nullable()->after('due_at');
        });

        Schema::create('invoice_status_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32);
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_status_changes');

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropColumn(['discount_percent', 'discount_cents', 'deposit_cents', 'sent_at']);
        });
    }
};
