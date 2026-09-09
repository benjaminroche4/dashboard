import { Head } from '@inertiajs/react';
import { MyWorkCard } from '@/components/dashboard/my-work-card';
import { dashboard } from '@/routes';
import type { MyWork } from '@/types';

type Props = {
    mine: MyWork;
};

export default function Dashboard({ mine }: Props) {
    return (
        <>
            <Head title="Tableau de bord" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="pt-8 pb-6">
                    <h1 className="text-lg font-medium">Tableau de bord</h1>
                    <p className="text-muted-foreground text-sm">
                        Ce qui vous est attribué, en un coup d’œil.
                    </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <MyWorkCard mine={mine} />
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Tableau de bord',
            href: dashboard(),
        },
    ],
};
