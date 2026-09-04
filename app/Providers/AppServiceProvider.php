<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use App\Services\DocRaptor;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Services externes construits depuis la config (injectables dans les Actions).
        $this->app->bind(DocRaptor::class, fn (): DocRaptor => DocRaptor::fromConfig());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureGates();
    }

    /**
     * Gates transverses. Les autorisations par modèle vivent dans app/Policies.
     */
    private function configureGates(): void
    {
        // Tableau de bord Laravel Pulse (/pulse) : administrateurs uniquement.
        Gate::define('viewPulse', fn (User $user): bool => $user->isAdmin());
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
