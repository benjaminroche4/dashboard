<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Un contact (partenaire, agence ou agent immobilier) vient d'être ajouté à
 * l'annuaire de l'équipe : on l'en informe et on lui donne son contact.
 */
final class DirectoryWelcome extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $name,
        /** Ce qu'il est pour nous, ex. « partenaire · Assurance », « agence immobilière partenaire ». */
        public readonly string $category,
        public readonly string $email,
        public readonly ?string $phone = null,
        public readonly ?User $sender = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Bienvenue parmi les partenaires de Relocation in Paris');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.directory.welcome', with: [
            'name' => $this->name,
            'category' => $this->category,
            'email' => $this->email,
            'phone' => $this->phone,
            'sender' => $this->sender,
            'mail' => config('company.mail'),
        ]);
    }
}
