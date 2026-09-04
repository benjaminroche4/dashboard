export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type Invoice = {
    id: number;
    number: string;
    client_name: string;
    client_email: string | null;
    amount_cents: number;
    currency: string;
    status: InvoiceStatus;
    status_label: string;
    issued_at: string;
    due_at: string;
    paid_at: string | null;
};
