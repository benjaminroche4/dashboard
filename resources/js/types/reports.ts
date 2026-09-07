import type { Currency } from './invoices';

export type CurrencyAmounts = Record<Currency, number>;

export type ReportMonth = {
    /** « 2026-09 ». */
    month: string;
    /** « Sept. 2026 ». */
    label: string;
    issued: CurrencyAmounts;
    paid: CurrencyAmounts;
};

export type Report = {
    period: { from: string; to: string };
    leads: {
        total: number;
        converted: number;
        archived: number;
        /** Leads par jour, mois en cours contre mois précédent (hors période choisie). */
        daily: {
            current: string;
            previous: string;
            days: {
                day: number;
                current: number | null;
                previous: number | null;
            }[];
        };
        by_offer: { offer: string | null; label: string; count: number }[];
        by_assignee: {
            assignee: number | null;
            label: string;
            count: number;
            converted: number;
        }[];
        conversion_rate: number | null;
        by_status: { status: string; label: string; count: number }[];
        by_source: {
            source: string;
            label: string;
            count: number;
            converted: number;
            rate: number | null;
        }[];
        first_contact: {
            measured: number;
            average_minutes: number | null;
            within_30_rate: number | null;
        };
    };
    quotes: {
        total: number;
        by_status: { status: string; label: string; count: number }[];
        acceptance_rate: number | null;
        by_offer: {
            offer: string;
            label: string;
            count: number;
            accepted: number;
            declined: number;
            rate: number | null;
        }[];
        accepted_amounts: CurrencyAmounts;
    };
    invoices: {
        count: number;
        paid_count: number;
        issued: CurrencyAmounts;
        paid: CurrencyAmounts;
        overdue: { count: number; amounts: CurrencyAmounts };
        by_month: ReportMonth[];
    };
};
