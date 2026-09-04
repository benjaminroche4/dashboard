<?php

use App\Http\Controllers\Invoices\InvoiceController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Aucune page publique : la racine renvoie vers le login ou le dashboard.
Route::get('/', fn () => to_route(Auth::check() ? 'dashboard' : 'login'))->name('home');

Route::middleware(['auth'])->group(function (): void {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::get('invoices', [InvoiceController::class, 'index'])->name('invoices.index');
});

require __DIR__.'/settings.php';
