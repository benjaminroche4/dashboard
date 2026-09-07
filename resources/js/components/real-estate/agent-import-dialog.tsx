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
import { parseAgentRows } from '@/lib/real-estate-import';
import { importMethod as importAgents } from '@/routes/agents';

/**
 * Import d'agents collés depuis un tableur : aperçu des lignes reconnues,
 * puis envoi. Les agences sont retrouvées ou créées par leur nom, les
 * contacts déjà présents sont ignorés côté serveur.
 */
export function AgentImportDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const parsed = useMemo(() => parseAgentRows(text), [text]);

    const submit = () => {
        setBusy(true);
        router.post(
            importAgents().url,
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
                    <DialogTitle>Importer des agents</DialogTitle>
                    <DialogDescription>
                        Collez des lignes depuis un tableur, une par agent :
                        prénom, nom, agence, fonction, e-mail, téléphone. Une
                        ligne d’en-tête est reconnue si elle contient ces
                        intitulés.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="agent-import">Lignes à importer</Label>
                    <Textarea
                        id="agent-import"
                        rows={8}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder={
                            'Zoé\tMartin\tAgence du Marais\tNégociatrice\tzoe@marais.fr\t+33 6 12 34 56 78'
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
                            agent(s) reconnu(s)
                            {parsed.hasHeader ? ', en-tête détecté' : ''}
                            {parsed.invalid.length > 0
                                ? `, ${parsed.invalid.length} ligne(s) ignorée(s) sans prénom ou nom (${parsed.invalid.join(', ')})`
                                : ''}
                            .
                        </p>
                        {parsed.rows.length > 0 && (
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/50 text-left">
                                        <tr>
                                            <th className="px-2 py-1 font-medium">
                                                Agent
                                            </th>
                                            <th className="px-2 py-1 font-medium">
                                                Agence
                                            </th>
                                            <th className="px-2 py-1 font-medium">
                                                Contact
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
                                                        {row.first_name}{' '}
                                                        {row.last_name}
                                                        {row.position
                                                            ? ` · ${row.position}`
                                                            : ''}
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        {row.agency ||
                                                            'Indépendant'}
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        {[row.email, row.phone]
                                                            .filter(Boolean)
                                                            .join(' · ') || '—'}
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
