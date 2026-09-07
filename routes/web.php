<?php

use App\Http\Controllers\Clients\ClientController;
use App\Http\Controllers\Documents\CatalogDocumentController;
use App\Http\Controllers\Documents\DocumentRequestController;
use App\Http\Controllers\Invoices\InvoiceController;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\Owners\OwnerController;
use App\Http\Controllers\Partners\LeadPartnerController;
use App\Http\Controllers\Partners\PartnerContactController;
use App\Http\Controllers\Partners\PartnerController;
use App\Http\Controllers\Places\PlacesController;
use App\Http\Controllers\Quotes\QuoteController;
use App\Http\Controllers\RealEstate\AgencyController;
use App\Http\Controllers\RealEstate\AgentController;
use App\Http\Controllers\Reports\ReportController;
use App\Http\Controllers\Webhooks\AlloWebhookController;
use App\Http\Controllers\Webhooks\WebsiteContactController;
use App\Http\Middleware\VerifyAlloWebhookSignature;
use App\Http\Middleware\VerifyRipWebhookSignature;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Aucune page publique : la racine renvoie vers le login ou le dashboard.
Route::get('/', fn () => to_route(Auth::check() ? 'dashboard' : 'login'))->name('home');

// Seule entrée sans session : le site Relocation In Paris pousse ses demandes de
// contact, authentifiées par signature HMAC (RIP_WEBHOOK_SECRET), jamais par un cookie.
Route::post('webhooks/rip/contact', WebsiteContactController::class)
    ->middleware([VerifyRipWebhookSignature::class, 'throttle:60,1'])
    ->name('webhooks.rip.contact');

// Téléphonie Allo : appels terminés et SMS reçus, signés au format Standard Webhooks (ALLO_WEBHOOK_SECRET).
Route::post('webhooks/allo', AlloWebhookController::class)
    ->middleware([VerifyAlloWebhookSignature::class, 'throttle:120,1'])
    ->name('webhooks.allo');

Route::middleware(['auth'])->group(function (): void {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('tools', 'tools/index')->name('tools.index');
    Route::get('tools/documents', [DocumentRequestController::class, 'index'])->name('tools.documents.index');
    Route::get('tools/documents/create', [DocumentRequestController::class, 'create'])->name('tools.documents.create');
    Route::post('tools/documents', [DocumentRequestController::class, 'store'])->name('tools.documents.store');
    Route::delete('tools/documents/bulk', [DocumentRequestController::class, 'bulkDestroy'])->name('tools.documents.bulk-destroy');
    // Catalogue des pièces (admins), déclaré avant tools/documents/{documentRequest}.
    Route::get('tools/documents/catalog', [CatalogDocumentController::class, 'index'])->name('tools.documents.catalog.index');
    Route::post('tools/documents/catalog', [CatalogDocumentController::class, 'store'])->name('tools.documents.catalog.store');
    Route::patch('tools/documents/catalog/{catalogDocument}', [CatalogDocumentController::class, 'update'])->name('tools.documents.catalog.update');
    Route::delete('tools/documents/catalog/{catalogDocument}', [CatalogDocumentController::class, 'destroy'])->name('tools.documents.catalog.destroy');
    Route::get('tools/documents/{documentRequest}', [DocumentRequestController::class, 'show'])->name('tools.documents.show');
    Route::get('tools/documents/{documentRequest}/pdf', [DocumentRequestController::class, 'pdf'])->name('tools.documents.pdf');
    Route::get('tools/documents/{documentRequest}/edit', [DocumentRequestController::class, 'edit'])->name('tools.documents.edit');
    Route::put('tools/documents/{documentRequest}', [DocumentRequestController::class, 'update'])->name('tools.documents.update');
    Route::delete('tools/documents/{documentRequest}', [DocumentRequestController::class, 'destroy'])->name('tools.documents.destroy');
    // Devis : même cycle que les factures, transformables en facture d'un clic.
    // Rapports : chiffres clés de l'activité sur les derniers mois.
    Route::get('tools/reports', [ReportController::class, 'index'])->name('tools.reports.index');
    Route::get('tools/quotes', [QuoteController::class, 'index'])->name('tools.quotes.index');
    Route::get('tools/quotes/create', [QuoteController::class, 'create'])->name('tools.quotes.create');
    Route::post('tools/quotes', [QuoteController::class, 'store'])->name('tools.quotes.store');
    Route::get('tools/quotes/{quote}', [QuoteController::class, 'show'])->name('tools.quotes.show');
    Route::get('tools/quotes/{quote}/pdf', [QuoteController::class, 'pdf'])->name('tools.quotes.pdf');
    Route::post('tools/quotes/{quote}/send', [QuoteController::class, 'send'])->name('tools.quotes.send');
    Route::post('tools/quotes/{quote}/accept', [QuoteController::class, 'accept'])->name('tools.quotes.accept');
    Route::post('tools/quotes/{quote}/decline', [QuoteController::class, 'decline'])->name('tools.quotes.decline');
    Route::post('tools/quotes/{quote}/invoice', [QuoteController::class, 'invoice'])->name('tools.quotes.invoice');
    Route::get('real-estate/agencies', [AgencyController::class, 'index'])->name('agencies.index');
    Route::get('real-estate/agencies/duplicates', [AgencyController::class, 'duplicates'])->middleware('throttle:60,1')->name('agencies.duplicates');
    Route::post('real-estate/agencies', [AgencyController::class, 'store'])->name('agencies.store');
    Route::get('real-estate/agencies/{agency}', [AgencyController::class, 'show'])->name('agencies.show');
    Route::patch('real-estate/agencies/{agency}', [AgencyController::class, 'update'])->name('agencies.update');
    Route::delete('real-estate/agencies/{agency}', [AgencyController::class, 'destroy'])->name('agencies.destroy');
    Route::get('real-estate/agents', [AgentController::class, 'index'])->name('agents.index');
    Route::get('real-estate/agents/duplicates', [AgentController::class, 'duplicates'])->middleware('throttle:60,1')->name('agents.duplicates');
    Route::post('real-estate/agents/import', [AgentController::class, 'import'])->name('agents.import');
    Route::post('real-estate/agents', [AgentController::class, 'store'])->name('agents.store');
    Route::get('real-estate/agents/{agent}', [AgentController::class, 'show'])->name('agents.show');
    Route::patch('real-estate/agents/{agent}', [AgentController::class, 'update'])->name('agents.update');
    Route::delete('real-estate/agents/{agent}', [AgentController::class, 'destroy'])->name('agents.destroy');
    // Propriétaires : prospection pour la gestion locative, et leads propriétaires.
    Route::get('owners', [OwnerController::class, 'index'])->name('owners.index');
    Route::get('owners/leads', [OwnerController::class, 'leads'])->name('owners.leads');
    Route::get('owners/duplicates', [OwnerController::class, 'duplicates'])->middleware('throttle:60,1')->name('owners.duplicates');
    Route::post('owners', [OwnerController::class, 'store'])->name('owners.store');
    Route::patch('owners/{owner}', [OwnerController::class, 'update'])->name('owners.update');
    Route::post('owners/{owner}/convert', [OwnerController::class, 'convert'])->name('owners.convert');
    Route::delete('owners/{owner}', [OwnerController::class, 'destroy'])->name('owners.destroy');
    Route::get('partners', [PartnerController::class, 'index'])->name('partners.index');
    Route::get('partners/duplicates', [PartnerController::class, 'duplicates'])->middleware('throttle:60,1')->name('partners.duplicates');
    Route::get('partners/search', [PartnerController::class, 'search'])->middleware('throttle:60,1')->name('partners.search');
    Route::post('partners', [PartnerController::class, 'store'])->name('partners.store');
    Route::get('partners/{partner}', [PartnerController::class, 'show'])->name('partners.show');
    Route::patch('partners/{partner}', [PartnerController::class, 'update'])->name('partners.update');
    Route::delete('partners/{partner}', [PartnerController::class, 'destroy'])->name('partners.destroy');
    Route::post('partners/{partner}/contacts', [PartnerContactController::class, 'store'])->name('partners.contacts.store');
    Route::patch('partners/{partner}/contacts/{contact}', [PartnerContactController::class, 'update'])->scopeBindings()->name('partners.contacts.update');
    Route::delete('partners/{partner}/contacts/{contact}', [PartnerContactController::class, 'destroy'])->scopeBindings()->name('partners.contacts.destroy');
    Route::get('clients', [ClientController::class, 'index'])->name('clients.index');
    Route::get('clients/visits', [ClientController::class, 'visits'])->name('clients.visits');
    Route::get('clients/{lead}', [ClientController::class, 'show'])->name('clients.show');
    Route::get('leads', [LeadController::class, 'index'])->name('leads.index');
    Route::get('leads/search', [LeadController::class, 'search'])->middleware('throttle:60,1')->name('leads.search');
    Route::get('leads/duplicates', [LeadController::class, 'duplicates'])->middleware('throttle:60,1')->name('leads.duplicates');
    Route::get('leads/create', [LeadController::class, 'create'])->name('leads.create');
    Route::post('leads', [LeadController::class, 'store'])->name('leads.store');
    Route::get('leads/{lead}', [LeadController::class, 'show'])->name('leads.show');
    Route::get('leads/{lead}/edit', [LeadController::class, 'edit'])->name('leads.edit');
    Route::put('leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
    Route::patch('leads/{lead}/assign', [LeadController::class, 'assign'])->name('leads.assign');
    Route::patch('leads/{lead}/agent', [LeadController::class, 'agent'])->name('leads.agent');
    Route::post('leads/{lead}/partners', [LeadPartnerController::class, 'store'])->name('leads.partners.store');
    Route::delete('leads/{lead}/partners/{partnerLink}', [LeadPartnerController::class, 'destroy'])->name('leads.partners.destroy');
    Route::post('leads/{lead}/partners/{partnerLink}/forward', [LeadPartnerController::class, 'forward'])->name('leads.partners.forward');
    Route::patch('leads/{lead}/contact', [LeadController::class, 'contact'])->name('leads.contact');
    Route::patch('leads/{lead}/status', [LeadController::class, 'updateStatus'])->name('leads.status');
    Route::post('leads/{lead}/notes', [LeadController::class, 'storeNote'])->name('leads.notes.store');
    Route::patch('leads/{lead}/notes/{note}', [LeadController::class, 'updateNote'])->scopeBindings()->name('leads.notes.update');
    Route::delete('leads/{lead}/notes/{note}', [LeadController::class, 'destroyNote'])->scopeBindings()->name('leads.notes.destroy');
    Route::patch('leads/{lead}/recontact', [LeadController::class, 'recontact'])->name('leads.recontact');
    Route::post('leads/{lead}/convert', [LeadController::class, 'convert'])->name('leads.convert');
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
