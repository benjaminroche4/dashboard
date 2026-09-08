<?php

use App\Http\Controllers\Settings\AvatarController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\TeamController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function (): void {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('settings/profile/avatar', [AvatarController::class, 'update'])->name('profile.avatar.update');
    Route::delete('settings/profile/avatar', [AvatarController::class, 'destroy'])->name('profile.avatar.destroy');
});

Route::middleware(['auth', 'verified'])->group(function (): void {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(RequirePassword::class)
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    // Équipe : membres ayant accès au dashboard, administrateurs seulement.
    Route::middleware('role:admin')->group(function (): void {
        Route::get('settings/team', [TeamController::class, 'index'])->name('team.index');
        Route::post('settings/team', [TeamController::class, 'store'])->name('team.store');
        Route::get('settings/team/{member}', [TeamController::class, 'show'])->name('team.show');
        Route::patch('settings/team/{member}/access', [TeamController::class, 'access'])->name('team.access');
        Route::delete('settings/team/{member}', [TeamController::class, 'destroy'])->name('team.destroy');
    });
});

Route::get('.well-known/passkey-endpoints', fn () => response()->json([
    'enroll' => route('security.edit'),
    'manage' => route('security.edit'),
]))->name('well-known.passkeys');
