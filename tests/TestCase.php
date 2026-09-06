<?php

declare(strict_types=1);

namespace Tests;

use App\Support\DocumentCatalog;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Les tests ne doivent pas dépendre d'un build Vite présent sur disque.
        $this->withoutVite();

        // Le catalogue est mémorisé en statique : chaque test repart de la base.
        DocumentCatalog::flush();
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
