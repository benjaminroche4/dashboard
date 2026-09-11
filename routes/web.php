<?php

use App\Http\Controllers\Auth\GoogleLoginController;
use App\Http\Controllers\Clients\ClientController;
use App\Http\Controllers\Clients\ClientPropertyController;
use App\Http\Controllers\Clients\VisitController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Documents\CatalogDocumentController;
use App\Http\Controllers\Documents\DocumentRequestController;
use App\Http\Controllers\Documents\DocumentUploadController;
use App\Http\Controllers\Documents\PublicDocumentUploadController;
use App\Http\Controllers\Invoices\InvoiceController;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\Owners\OwnerController;
use App\Http\Controllers\Owners\OwnerLeadController;
use App\Http\Controllers\Partners\LeadPartnerController;
use App\Http\Controllers\Partners\PartnerContactController;
use App\Http\Controllers\Partners\PartnerController;
use App\Http\Controllers\Places\PlacesController;
use App\Http\Controllers\Properties\PropertyController;
use App\Http\Controllers\Quotes\QuoteController;
use App\Http\Controllers\RealEstate\AgencyController;
use App\Http\Controllers\RealEstate\AgentController;
use App\Http\Controllers\Reports\ReportController;
use App\Http\Controllers\Tools\ActivityController;
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

// « Se connecter avec Google » : hors session comme les routes de Fortify, mais
// sans inscription — seul un membre déjà créé peut entrer (404 sans identifiants).
Route::middleware('guest')->group(function (): void {
    Route::get('auth/google/redirect', [GoogleLoginController::class, 'redirect'])
        ->middleware('throttle:10,1')
        ->name('auth.google.redirect');
    Route::get('auth/google/callback', [GoogleLoginController::class, 'callback'])
        ->middleware('throttle:10,1')
        ->name('auth.google.callback');
});

// Page publique de dépôt des pièces : la demande est retrouvée par son jeton (jamais par son identifiant).
Route::get('depot/{documentRequest:public_token}', [PublicDocumentUploadController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('documents.public.show');
Route::post('depot/{documentRequest:public_token}', [PublicDocumentUploadController::class, 'store'])
    ->middleware('throttle:30,1')
    ->name('documents.public.store');
Route::post('depot/{documentRequest:public_token}/code', [PublicDocumentUploadController::class, 'verify'])
    ->middleware('throttle:10,1')
    ->name('documents.public.verify');

Route::middleware(['auth'])->group(function (): void {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
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
    Route::post('tools/documents/{documentRequest}/send-link', [DocumentRequestController::class, 'sendLink'])->name('tools.documents.send-link');
    Route::patch('tools/documents/{documentRequest}/lead', [DocumentRequestController::class, 'link'])->name('tools.documents.link');
    Route::get('tools/documents/{documentRequest}/edit', [DocumentRequestController::class, 'edit'])->name('tools.documents.edit');
    Route::put('tools/documents/{documentRequest}', [DocumentRequestController::class, 'update'])->name('tools.documents.update');
    Route::delete('tools/documents/{documentRequest}', [DocumentRequestController::class, 'destroy'])->name('tools.documents.destroy');
    Route::get('tools/documents/{documentRequest}/uploads/{upload}', [DocumentUploadController::class, 'download'])->scopeBindings()->name('tools.documents.uploads.download');
    Route::delete('tools/documents/{documentRequest}/uploads/{upload}', [DocumentUploadController::class, 'destroy'])->scopeBindings()->name('tools.documents.uploads.destroy');
    // Devis : même cycle que les factures, transformables en facture d'un clic.
    // Rapports : chiffres clés de l'activité sur les derniers mois.
    Route::get('tools/reports', [ReportController::class, 'index'])->name('tools.reports.index');
    // Journal d'activité : toutes les actions du backoffice (droits de la section Rapports).
    Route::get('tools/activity', [ActivityController::class, 'index'])->name('tools.activity.index');
    Route::get('tools/quotes', [QuoteController::class, 'index'])->name('tools.quotes.index');
    Route::get('tools/quotes/search', [QuoteController::class, 'search'])->middleware('throttle:60,1')->name('tools.quotes.search');
    Route::get('tools/quotes/create', [QuoteController::class, 'create'])->name('tools.quotes.create');
    Route::post('tools/quotes', [QuoteController::class, 'store'])->name('tools.quotes.store');
    // Déclarées avant `tools/quotes/{quote}` : « bulk » n'est pas un devis.
    Route::post('tools/quotes/bulk-send', [QuoteController::class, 'bulkSend'])->name('tools.quotes.bulk-send');
    Route::post('tools/quotes/bulk-accept', [QuoteController::class, 'bulkAccept'])->name('tools.quotes.bulk-accept');
    Route::get('tools/quotes/{quote}', [QuoteController::class, 'show'])->name('tools.quotes.show');
    Route::get('tools/quotes/{quote}/pdf', [QuoteController::class, 'pdf'])->name('tools.quotes.pdf');
    Route::post('tools/quotes/{quote}/send', [QuoteController::class, 'send'])->name('tools.quotes.send');
    Route::post('tools/quotes/{quote}/accept', [QuoteController::class, 'accept'])->name('tools.quotes.accept');
    Route::post('tools/quotes/{quote}/decline', [QuoteController::class, 'decline'])->name('tools.quotes.decline');
    Route::post('tools/quotes/{quote}/invoice', [QuoteController::class, 'invoice'])->name('tools.quotes.invoice');
    Route::patch('tools/quotes/{quote}/lead', [QuoteController::class, 'link'])->name('tools.quotes.link');
    Route::get('tools/quotes/{quote}/edit', [QuoteController::class, 'edit'])->name('tools.quotes.edit');
    Route::put('tools/quotes/{quote}', [QuoteController::class, 'update'])->name('tools.quotes.update');
    Route::get('real-estate/agencies', [AgencyController::class, 'index'])->name('agencies.index');
    Route::get('real-estate/agencies/duplicates', [AgencyController::class, 'duplicates'])->middleware('throttle:60,1')->name('agencies.duplicates');
    Route::post('real-estate/agencies/import', [AgencyController::class, 'import'])->name('agencies.import');
    Route::get('real-estate/agencies/search', [AgencyController::class, 'search'])->middleware('throttle:60,1')->name('agencies.search');
    Route::post('real-estate/agencies', [AgencyController::class, 'store'])->name('agencies.store');
    Route::delete('real-estate/agencies/bulk', [AgencyController::class, 'bulkDestroy'])->name('agencies.bulk-destroy');
    Route::get('real-estate/agencies/{agency}', [AgencyController::class, 'show'])->name('agencies.show');
    Route::patch('real-estate/agencies/{agency}', [AgencyController::class, 'update'])->name('agencies.update');
    Route::delete('real-estate/agencies/{agency}', [AgencyController::class, 'destroy'])->name('agencies.destroy');
    Route::post('real-estate/agencies/{agency}/favorite', [AgencyController::class, 'favorite'])->name('agencies.favorite');
    Route::post('real-estate/agencies/{agency}/touch', [AgencyController::class, 'touch'])->name('agencies.touch');
    Route::get('real-estate/agents', [AgentController::class, 'index'])->name('agents.index');
    Route::get('real-estate/agents/duplicates', [AgentController::class, 'duplicates'])->middleware('throttle:60,1')->name('agents.duplicates');
    Route::get('real-estate/agents/search', [AgentController::class, 'search'])->middleware('throttle:60,1')->name('agents.search');
    Route::post('real-estate/agents/import', [AgentController::class, 'import'])->name('agents.import');
    Route::post('real-estate/agents', [AgentController::class, 'store'])->name('agents.store');
    Route::delete('real-estate/agents/bulk', [AgentController::class, 'bulkDestroy'])->name('agents.bulk-destroy');
    Route::get('real-estate/agents/{agent}', [AgentController::class, 'show'])->name('agents.show');
    Route::patch('real-estate/agents/{agent}', [AgentController::class, 'update'])->name('agents.update');
    Route::delete('real-estate/agents/{agent}', [AgentController::class, 'destroy'])->name('agents.destroy');
    Route::post('real-estate/agents/{agent}/favorite', [AgentController::class, 'favorite'])->name('agents.favorite');
    Route::post('real-estate/agents/{agent}/touch', [AgentController::class, 'touch'])->name('agents.touch');
    // Propriétaires : prospection pour la gestion locative, et leads propriétaires.
    Route::get('owners', [OwnerController::class, 'index'])->name('owners.index');
    Route::get('owners/leads', [OwnerController::class, 'leads'])->name('owners.leads');
    Route::get('owners/leads/create', [OwnerLeadController::class, 'create'])->name('owners.leads.create');
    Route::post('owners/leads', [OwnerLeadController::class, 'store'])->name('owners.leads.store');
    Route::get('owners/leads/{lead}/edit', [OwnerLeadController::class, 'edit'])->name('owners.leads.edit');
    Route::put('owners/leads/{lead}', [OwnerLeadController::class, 'update'])->name('owners.leads.update');
    Route::get('owners/duplicates', [OwnerController::class, 'duplicates'])->middleware('throttle:60,1')->name('owners.duplicates');
    Route::get('owners/search', [OwnerController::class, 'search'])->middleware('throttle:60,1')->name('owners.search');
    Route::post('owners', [OwnerController::class, 'store'])->name('owners.store');
    Route::post('owners/import', [OwnerController::class, 'import'])->name('owners.import');
    // Un lead propriétaire signé entre dans l'annuaire sans ressaisie.
    Route::post('owners/from-lead/{lead}', [OwnerController::class, 'fromLead'])->name('owners.from-lead');
    Route::delete('owners/bulk', [OwnerController::class, 'bulkDestroy'])->name('owners.bulk-destroy');
    Route::get('owners/{owner}', [OwnerController::class, 'show'])->name('owners.show');
    Route::patch('owners/{owner}', [OwnerController::class, 'update'])->name('owners.update');
    Route::post('owners/{owner}/contact', [OwnerController::class, 'contact'])->name('owners.contact');
    Route::delete('owners/{owner}', [OwnerController::class, 'destroy'])->name('owners.destroy');
    Route::get('partners', [PartnerController::class, 'index'])->name('partners.index');
    Route::get('partners/duplicates', [PartnerController::class, 'duplicates'])->middleware('throttle:60,1')->name('partners.duplicates');
    Route::get('partners/search', [PartnerController::class, 'search'])->middleware('throttle:60,1')->name('partners.search');
    Route::post('partners', [PartnerController::class, 'store'])->name('partners.store');
    Route::delete('partners/bulk', [PartnerController::class, 'bulkDestroy'])->name('partners.bulk-destroy');
    Route::get('partners/{partner}', [PartnerController::class, 'show'])->name('partners.show');
    Route::patch('partners/{partner}', [PartnerController::class, 'update'])->name('partners.update');
    Route::delete('partners/{partner}', [PartnerController::class, 'destroy'])->name('partners.destroy');
    Route::post('partners/{partner}/contact', [PartnerController::class, 'touch'])->name('partners.contact');
    Route::post('partners/{partner}/welcome', [PartnerController::class, 'welcome'])->name('partners.welcome');
    Route::post('partners/{partner}/favorite', [PartnerController::class, 'favorite'])->name('partners.favorite');
    Route::post('partners/{partner}/contacts', [PartnerContactController::class, 'store'])->name('partners.contacts.store');
    Route::patch('partners/{partner}/contacts/{contact}', [PartnerContactController::class, 'update'])->scopeBindings()->name('partners.contacts.update');
    Route::delete('partners/{partner}/contacts/{contact}', [PartnerContactController::class, 'destroy'])->scopeBindings()->name('partners.contacts.destroy');
    Route::get('clients', [ClientController::class, 'index'])->name('clients.index');
    Route::get('clients/visits', [VisitController::class, 'index'])->name('clients.visits');
    Route::get('clients/visits/create', [VisitController::class, 'create'])->name('clients.visits.create');
    Route::post('clients/visits', [VisitController::class, 'store'])->name('clients.visits.store');
    Route::get('clients/visits/{visit}', [VisitController::class, 'show'])->name('clients.visits.show');
    Route::get('clients/visits/{visit}/edit', [VisitController::class, 'edit'])->name('clients.visits.edit');
    Route::patch('clients/visits/{visit}', [VisitController::class, 'update'])->name('clients.visits.update');
    Route::post('clients/visits/{visit}/report', [VisitController::class, 'report'])->name('clients.visits.report');
    Route::delete('clients/visits/{visit}', [VisitController::class, 'destroy'])->name('clients.visits.destroy');
    Route::get('properties', [PropertyController::class, 'index'])->name('properties.index');
    Route::get('properties/search', [PropertyController::class, 'search'])->middleware('throttle:60,1')->name('properties.search');
    // Tous les biens situables, pour la carte de l'annuaire (la liste, elle, est paginée).
    Route::get('properties/map', [PropertyController::class, 'map'])->middleware('throttle:60,1')->name('properties.map');
    Route::post('properties', [PropertyController::class, 'store'])->name('properties.store');
    Route::get('properties/create', [PropertyController::class, 'create'])->name('properties.create');
    Route::post('properties/extract', [PropertyController::class, 'extract'])->middleware('throttle:20,1')->name('properties.extract');
    // Transports proches d'une adresse, proposés par l'assistant : JSON, non enregistré.
    Route::post('properties/transit', [PropertyController::class, 'transit'])->middleware('throttle:20,1')->name('properties.transit');
    Route::patch('properties/{property}/cover', [PropertyController::class, 'cover'])->name('properties.cover');
    Route::patch('properties/{property}/status', [PropertyController::class, 'status'])->name('properties.status');
    Route::get('properties/{property}/edit', [PropertyController::class, 'edit'])->name('properties.edit');
    Route::get('properties/{property}/pdf', [PropertyController::class, 'pdf'])->name('properties.pdf');
    Route::delete('properties/bulk', [PropertyController::class, 'bulkDestroy'])->name('properties.bulk-destroy');
    Route::get('properties/{property}', [PropertyController::class, 'show'])->name('properties.show');
    Route::patch('properties/{property}', [PropertyController::class, 'update'])->name('properties.update');
    Route::patch('properties/{property}/assign', [PropertyController::class, 'assign'])->name('properties.assign');
    Route::delete('properties/{property}', [PropertyController::class, 'destroy'])->name('properties.destroy');
    Route::get('clients/{lead}', [ClientController::class, 'show'])->name('clients.show');
    Route::post('clients/{lead}/properties/explain', [ClientPropertyController::class, 'explain'])->middleware('throttle:20,1')->name('clients.properties.explain');
    Route::post('clients/{lead}/properties', [ClientPropertyController::class, 'store'])->name('clients.properties.store');
    Route::delete('clients/{lead}/properties/{property}', [ClientPropertyController::class, 'destroy'])->name('clients.properties.destroy');
    Route::patch('clients/{lead}/priority', [ClientController::class, 'priority'])->name('clients.priority');
    Route::patch('clients/{lead}/people', [ClientController::class, 'people'])->name('clients.people');
    Route::post('clients/{lead}/guarantors', [ClientController::class, 'saveGuarantor'])->name('clients.guarantors.store');
    Route::patch('clients/{lead}/guarantors/{guarantor}', [ClientController::class, 'saveGuarantor'])->name('clients.guarantors.update');
    Route::delete('clients/{lead}/guarantors/{guarantor}', [ClientController::class, 'destroyGuarantor'])->name('clients.guarantors.destroy');
    Route::patch('clients/{lead}/tenants/{slot}', [ClientController::class, 'tenantProfile'])->name('clients.tenant-profile');
    Route::get('locataires', [LeadController::class, 'index'])->name('leads.index');
    Route::get('locataires/search', [LeadController::class, 'search'])->middleware('throttle:60,1')->name('leads.search');
    Route::get('locataires/duplicates', [LeadController::class, 'duplicates'])->middleware('throttle:60,1')->name('leads.duplicates');
    Route::get('locataires/create', [LeadController::class, 'create'])->name('leads.create');
    Route::post('locataires', [LeadController::class, 'store'])->name('leads.store');
    Route::get('locataires/{lead}', [LeadController::class, 'show'])->name('leads.show');
    Route::get('locataires/{lead}/edit', [LeadController::class, 'edit'])->name('leads.edit');
    Route::put('locataires/{lead}', [LeadController::class, 'update'])->name('leads.update');
    Route::patch('locataires/{lead}/assign', [LeadController::class, 'assign'])->name('leads.assign');
    Route::patch('locataires/{lead}/agent', [LeadController::class, 'agent'])->name('leads.agent');
    Route::patch('locataires/{lead}/segment', [LeadController::class, 'segment'])->name('leads.segment');
    Route::post('locataires/{lead}/qualify', [LeadController::class, 'qualify'])->middleware('throttle:20,1')->name('leads.qualify');
    Route::post('locataires/{lead}/qualification', [LeadController::class, 'applyQualification'])->name('leads.qualification.apply');
    Route::delete('locataires/{lead}/qualification', [LeadController::class, 'dismissQualification'])->name('leads.qualification.dismiss');
    Route::post('locataires/{lead}/partners', [LeadPartnerController::class, 'store'])->name('leads.partners.store');
    Route::delete('locataires/{lead}/partners/{partnerLink}', [LeadPartnerController::class, 'destroy'])->name('leads.partners.destroy');
    Route::post('locataires/{lead}/partners/{partnerLink}/forward', [LeadPartnerController::class, 'forward'])->name('leads.partners.forward');
    Route::patch('locataires/{lead}/contact', [LeadController::class, 'contact'])->name('leads.contact');
    Route::patch('locataires/{lead}/status', [LeadController::class, 'updateStatus'])->name('leads.status');
    Route::post('locataires/{lead}/notes', [LeadController::class, 'storeNote'])->name('leads.notes.store');
    Route::patch('locataires/{lead}/notes/{note}', [LeadController::class, 'updateNote'])->scopeBindings()->name('leads.notes.update');
    Route::delete('locataires/{lead}/notes/{note}', [LeadController::class, 'destroyNote'])->scopeBindings()->name('leads.notes.destroy');
    Route::patch('locataires/{lead}/recontact', [LeadController::class, 'recontact'])->name('leads.recontact');
    Route::post('locataires/{lead}/convert', [LeadController::class, 'convert'])->name('leads.convert');
    Route::delete('locataires/{lead}', [LeadController::class, 'destroy'])->name('leads.destroy');
    Route::post('locataires/{lead}/send', [LeadController::class, 'send'])->name('leads.send');
    Route::post('locataires/{lead}/visio', [LeadController::class, 'visio'])->name('leads.visio');
    Route::post('locataires/{lead}/visio/report', [LeadController::class, 'visioReport'])->name('leads.visio.report');

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
    Route::get('invoices/{invoice}/edit', [InvoiceController::class, 'edit'])->name('invoices.edit');
    Route::put('invoices/{invoice}', [InvoiceController::class, 'update'])->name('invoices.update');

    Route::middleware('throttle:60,1')->group(function (): void {
        Route::get('places/suggest', [PlacesController::class, 'suggest'])->name('places.suggest');
        Route::get('places/details', [PlacesController::class, 'details'])->name('places.details');
    });
});

require __DIR__.'/settings.php';
