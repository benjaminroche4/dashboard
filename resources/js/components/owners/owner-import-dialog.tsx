import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { parseOwnerRows } from '@/lib/owner-import';
import { importMethod as importOwners } from '@/routes/owners';

/**
 * Import de propriétaires collés depuis un tableur : les listes arrivent en
 * feuille de calcul. Aperçu des lignes reconnues, puis envoi ; les contacts
 * déjà connus sont ignorés côté serveur.
 */
export function OwnerImportDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const parsed = useMemo(() => parseOwnerRows(text), [text]);

    const submit = () => {
        setBusy(true);
        router.post(
            importOwners().url,
            { rows: parsed.rows },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setText('');
                    onOpenChange(false);
                },
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Importer des propriétaires</DialogTitle>
                    <DialogDescription>
                        Collez des lignes depuis un tableur, une par
                        propriétaire : prénom, nom, société, e-mail, téléphone,
                        rue, code postal, ville. Une ligne d’en-tête est
                        reconnue si elle contient ces intitulés.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="owner-import">Lignes à importer</Label>
                    <Textarea
                        id="owner-import"
                        rows={8}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder={
                            'Zoé\tMartin\t\tzoe@example.com\t+33 6 12 34 56 78\t8 rue de Rivoli\t75004\tParis'
                        }
                        className="font-mono text-xs"
                    />
                </div>
                {text.trim() !== '' && (
                    <div
                        className="text-muted-foreground grid gap-1 text-sm"
                        data-testid="import-preview"
                    >
                        <p>
                            <span className="text-foreground font-medium tabular-nums">
                                {parsed.rows.length}
                            </span>{' '}
                            propriétaire(s) reconnu(s)
                            {parsed.hasHeader ? ', en-tête détecté' : ''}
                            {parsed.invalid.length > 0
                                ? `, ${parsed.invalid.length} ligne(s) ignorée(s) sans nom ou sans contact (${parsed.invalid.join(', ')})`
                                : ''}
                            .
                        </p>
                        {parsed.rows.length > 0 && (
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/50 text-left">
                                        <tr>
                                            <th className="px-2 py-1 font-medium">
                                                Propriétaire
                                            </th>
                                            <th className="px-2 py-1 font-medium">
                                                Contact
                                            </th>
                                            <th className="px-2 py-1 font-medium">
                                                Adresse
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsed.rows
                                            .slice(0, 5)
                                            .map((row, index) => (
                                                <tr
                                                    key={index}
                                                    className="border-t"
                                                >
                                                    <td className="px-2 py-1">
                                                        {row.company ||
                                                            `${row.first_name} ${row.last_name}`.trim()}
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        {[row.email, row.phone]
                                                            .filter(Boolean)
                                                            .join(' · ') || '—'}
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        {[
                                                            row.street,
                                                            [
                                                                row.postal_code,
                                                                row.city,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' '),
                                                        ]
                                                            .filter(Boolean)
                                                            .join(', ') || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                                {parsed.rows.length > 5 && (
                                    <p className="px-2 py-1 text-xs">
                                        … et {parsed.rows.length - 5} autre(s).
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="button"
                        disabled={busy || parsed.rows.length === 0}
                        onClick={submit}
                    >
                        {busy && <Spinner />}
                        Importer{' '}
                        {parsed.rows.length > 0
                            ? `(${parsed.rows.length})`
                            : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
