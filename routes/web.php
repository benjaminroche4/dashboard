<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Aucune page publique : la racine renvoie vers le login ou le dashboard.
Route::get('/', fn () => to_route(Auth::check() ? 'dashboard' : 'login'))->name('home');

Route::middleware(['auth'])->group(function (): void {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
