<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Livraisons de webhooks déjà traitées (Allo livre « au moins une fois ») : un même
        // identifiant de livraison n'est jamais rejoué.
        Schema::create('webhook_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 30);
            $table->string('delivery_id', 120);
            $table->timestamp('created_at')->nullable();
            $table->unique(['provider', 'delivery_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_deliveries');
    }
};
