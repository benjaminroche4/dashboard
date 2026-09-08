import { Head, router, usePage } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import type { DocumentLanguage } from '@/types';

type Props = {
    request: { name: string; language: DocumentLanguage };
    verifyUrl: string;
    company: { name: string; email: string; phone: string };
    labels: Record<'title' | 'intro' | 'code' | 'submit' | 'contact', string>;
};

/**
 * Porte d'entrée de la page publique de dépôt : le client saisit le code
 * d'appairage à 6 chiffres reçu avec le lien, puis accède à ses pièces.
 */
export default function PublicDocumentCode({
    request,
    verifyUrl,
    company,
    labels,
}: Props) {
    const { errors } = usePage().props;
    const [code, setCode] = useState('');
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        router.post(
            verifyUrl,
            { code },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: () => setCode(''),
            },
        );
    };

    return (
        <>
            <Head title={`${labels.title} · ${company.name}`} />
            <main
                lang={request.language}
                className="bg-background text-foreground flex min-h-dvh items-center justify-center px-4 py-10"
            >
                <form
                    aria-label={labels.code}
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                    className="grid w-full max-w-sm gap-6"
                >
                    <div className="flex items-center gap-3">
                        <img
                            src="/images/logo.jpg"
                            alt=""
                            className="size-10 rounded-md border"
                        />
                        <p className="text-muted-foreground text-sm">
                            {company.name}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-balance">
                            {labels.title}
                        </h1>
                        <p className="text-muted-foreground text-pretty">
                            {request.name} · {labels.intro}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <label
                            htmlFor="access-code"
                            className="flex items-center gap-2 text-sm font-medium"
                        >
                            <KeyRound className="size-4" aria-hidden />
                            {labels.code}
                        </label>
                        <InputOTP
                            id="access-code"
                            maxLength={6}
                            value={code}
                            onChange={setCode}
                            onComplete={submit}
                            inputMode="numeric"
                            pattern="^[0-9]+$"
                            autoFocus
                            containerClassName="justify-start"
                        >
                            <InputOTPGroup>
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <InputOTPSlot
                                        key={index}
                                        index={index}
                                        className="h-12 w-11 text-lg"
                                    />
                                ))}
                            </InputOTPGroup>
                        </InputOTP>
                        <InputError message={errors?.code} />
                    </div>
                    <Button
                        type="submit"
                        disabled={processing || code.length < 6}
                    >
                        {processing && <Spinner />}
                        {labels.submit}
                    </Button>
                    <p className="text-muted-foreground text-sm">
                        {labels.contact}{' '}
                        <a
                            href={`mailto:${company.email}`}
                            className="text-foreground underline-offset-4 hover:underline"
                        >
                            {company.email}
                        </a>{' '}
                        · {company.phone}
                    </p>
                </form>
            </main>
        </>
    );
}
