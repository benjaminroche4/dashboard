<?php

declare(strict_types=1);

use App\Enums\QuoteStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table): void {
            $table->id();
            $table->string('number')->unique();
            $table->string('client_name');
            $table->string('client_email')->nullable();
            $table->string('client_street')->nullable();
            $table->string('client_postal_code', 32)->nullable();
            $table->string('client_city')->nullable();
            $table->string('client_country', 64)->nullable();
            $table->text('client_address')->nullable();
            $table->json('items')->nullable();
            $table->decimal('vat_rate', 5, 2)->default(0);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->unsignedBigInteger('discount_cents')->default(0);
            $table->unsignedBigInteger('subtotal_cents')->default(0);
            $table->unsignedBigInteger('vat_cents')->default(0);
            $table->unsignedBigInteger('amount_cents')->default(0);
            $table->string('currency', 3)->default('EUR');
            $table->string('status', 32)->default(QuoteStatus::Draft->value)->index();
            $table->date('issued_at');
            $table->date('valid_until');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('declined_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('quote_status_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32);
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_status_changes');
        Schema::dropIfExists('quotes');
    }
};
