import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    companyColumnLabels,
    companyColumns,
} from '@/components/companies/columns';
import { CompanyDialog } from '@/components/companies/company-dialog';
import { CreateButton } from '@/components/create-button';
import { DataTable } from '@/components/data-table';
import type { CompanyEntry } from '@/types';

type Props = {
    companies: CompanyEntry[];
};

export default function CompaniesIndex({ companies }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CompanyEntry | null>(null);

    const add = () => {
        setEditing(null);
        setDialogOpen(true);
    };
    const edit = (company: CompanyEntry) => {
        setEditing(company);
        setDialogOpen(true);
    };
    const columns = useMemo(() => companyColumns(edit), []);

    return (
        <>
            <Head title="Entreprises" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Entreprises</h1>
                        <p className="text-muted-foreground text-sm">
                            {companies.length} entreprise(s) · employeurs et
                            sociétés dont l’équipe reloge les collaborateurs
                        </p>
                    </div>
                    <CreateButton onClick={add} label="Nouvelle entreprise" />
                </div>
                <DataTable
                    storageKey="companies"
                    columns={columns}
                    data={companies}
                    filterColumn="name"
                    filterPlaceholder="Filtrer par nom…"
                    columnLabels={companyColumnLabels}
                    frame="panel"
                />
            </div>
            <CompanyDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                company={editing}
            />
        </>
    );
}
