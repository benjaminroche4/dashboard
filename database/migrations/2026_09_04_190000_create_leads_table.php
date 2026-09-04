<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table): void {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('offer')->nullable();
            $table->date('arrival_at')->nullable();
            $table->unsignedInteger('budget_cents')->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->string('origin_city')->nullable();
            $table->string('source')->default('website');
            $table->text('message')->nullable();
            $table->string('status')->default('todo')->index();
            $table->timestamp('last_contacted_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
