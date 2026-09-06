<?php

use App\Http\Controllers\Documents\DocumentRequestController;
use App\Http\Controllers\Invoices\InvoiceController;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\Places\PlacesController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Aucune page publique : la racine renvoie vers le login ou le dashboard.
Route::get('/', fn () => to_route(Auth::check() ? 'dashboard' : 'login'))->name('home');

Route::middleware(['auth'])->group(function (): void {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('tools', 'tools/index')->name('tools.index');
    Route::get('tools/documents', [DocumentRequestController::class, 'index'])->name('tools.documents.index');
    Route::get('tools/documents/create', [DocumentRequestController::class, 'create'])->name('tools.documents.create');
    Route::post('tools/documents', [DocumentRequestController::class, 'store'])->name('tools.documents.store');
    Route::delete('tools/documents/bulk', [DocumentRequestController::class, 'bulkDestroy'])->name('tools.documents.bulk-destroy');
    Route::get('tools/documents/{documentRequest}', [DocumentRequestController::class, 'show'])->name('tools.documents.show');
    Route::get('tools/documents/{documentRequest}/pdf', [DocumentRequestController::class, 'pdf'])->name('tools.documents.pdf');
    Route::get('tools/documents/{documentRequest}/edit', [DocumentRequestController::class, 'edit'])->name('tools.documents.edit');
    Route::put('tools/documents/{documentRequest}', [DocumentRequestController::class, 'update'])->name('tools.documents.update');
    Route::delete('tools/documents/{documentRequest}', [DocumentRequestController::class, 'destroy'])->name('tools.documents.destroy');
    Route::get('leads', [LeadController::class, 'index'])->name('leads.index');
    Route::get('leads/search', [LeadController::class, 'search'])->middleware('throttle:60,1')->name('leads.search');
    Route::get('leads/duplicates', [LeadController::class, 'duplicates'])->middleware('throttle:60,1')->name('leads.duplicates');
    Route::get('leads/create', [LeadController::class, 'create'])->name('leads.create');
    Route::post('leads', [LeadController::class, 'store'])->name('leads.store');
    Route::get('leads/{lead}', [LeadController::class, 'show'])->name('leads.show');
    Route::get('leads/{lead}/edit', [LeadController::class, 'edit'])->name('leads.edit');
    Route::put('leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
    Route::patch('leads/{lead}/assign', [LeadController::class, 'assign'])->name('leads.assign');
    Route::patch('leads/{lead}/contact', [LeadController::class, 'contact'])->name('leads.contact');
    Route::patch('leads/{lead}/status', [LeadController::class, 'updateStatus'])->name('leads.status');
    Route::post('leads/{lead}/notes', [LeadController::class, 'storeNote'])->name('leads.notes.store');
    Route::patch('leads/{lead}/notes/{note}', [LeadController::class, 'updateNote'])->scopeBindings()->name('leads.notes.update');
    Route::delete('leads/{lead}/notes/{note}', [LeadController::class, 'destroyNote'])->scopeBindings()->name('leads.notes.destroy');
    Route::patch('leads/{lead}/recontact', [LeadController::class, 'recontact'])->name('leads.recontact');
    Route::delete('leads/{lead}', [LeadController::class, 'destroy'])->name('leads.destroy');
    Route::post('leads/{lead}/send', [LeadController::class, 'send'])->name('leads.send');
    Route::post('leads/{lead}/visio', [LeadController::class, 'visio'])->name('leads.visio');

    Route::get('invoices', [InvoiceController::class, 'index'])->name('invoices.index');
    Route::get('invoices/search', [InvoiceController::class, 'search'])->middleware('throttle:60,1')->name('invoices.search');
    Route::get('invoices/create', [InvoiceController::class, 'create'])->name('invoices.create');
    Route::post('invoices', [InvoiceController::class, 'store'])->name('invoices.store');
    // Actions groupées, déclarées avant invoices/{invoice}/… pour que « bulk » ne soit pas pris pour un identifiant.
    Route::post('invoices/bulk/send', [InvoiceController::class, 'bulkSend'])->name('invoices.bulk-send');
    Route::post('invoices/bulk/pay', [InvoiceController::class, 'bulkPay'])->name('invoices.bulk-pay');
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show'])->name('invoices.show');
    Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf'])->name('invoices.pdf');
    Route::post('invoices/{invoice}/send', [InvoiceController::class, 'send'])->name('invoices.send');
    Route::post('invoices/{invoice}/pay', [InvoiceController::class, 'pay'])->name('invoices.pay');
    Route::patch('invoices/{invoice}/lead', [InvoiceController::class, 'link'])->name('invoices.link');

    Route::middleware('throttle:60,1')->group(function (): void {
        Route::get('places/suggest', [PlacesController::class, 'suggest'])->name('places.suggest');
        Route::get('places/details', [PlacesController::class, 'details'])->name('places.details');
    });
});

require __DIR__.'/settings.php';
