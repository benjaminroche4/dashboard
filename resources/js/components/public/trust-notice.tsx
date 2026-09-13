import { Lock, ShieldCheck, UserCheck } from 'lucide-react';

/** Libellés du bloc, servis par `PublicDocumentUploadController::trustLabels()`. */
export type TrustLabels = {
    privacy_title: string;
    privacy_secure: string;
    privacy_private: string;
    privacy_kept: string;
};

/**
 * Ce qui rassure le client sur une page publique : elle lui demande une pièce
 * d'identité et des bulletins de salaire, elle doit donc dire où ils vont
 * plutôt que d'afficher un numéro de téléphone. Partagé par l'écran du code
 * et celui du dépôt, dans la langue du client.
 */
export function TrustNotice({ labels }: { labels: TrustLabels }) {
    const lines = [
        { icon: Lock, text: labels.privacy_secure },
        { icon: UserCheck, text: labels.privacy_private },
        { icon: ShieldCheck, text: labels.privacy_kept },
    ];

    return (
        <section
            aria-label={labels.privacy_title}
            className="bg-sidebar grid gap-3 rounded-xl border p-4"
        >
            <p className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck
                    aria-hidden
                    className="size-4 shrink-0 text-green-700 dark:text-green-400"
                />
                {labels.privacy_title}
            </p>
            <ul role="list" className="grid gap-2">
                {lines.map(({ icon: Icon, text }) => (
                    <li
                        key={text}
                        className="text-muted-foreground flex items-start gap-2 text-sm"
                    >
                        <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                        <span className="text-pretty">{text}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
