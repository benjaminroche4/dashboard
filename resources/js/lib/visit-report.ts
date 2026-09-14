import type {
    PropertyApplicationStatus,
    Visit,
    VisitReportForm,
    VisitReportPayload,
} from '@/types';

/** Longueur minimale des impressions générales, miroir de la règle serveur. */
export const REPORT_MIN_LENGTH = 10;

/** Le formulaire repart du compte rendu existant, sinon vide. */
export function initialReportForm(
    visit: Visit,
    status: PropertyApplicationStatus | '' = '',
): VisitReportForm {
    return { report: visit.report ?? '', next_status: status };
}

/** Ce qui bloque l'envoi : des impressions un peu étoffées. */
export function validateReportForm(
    form: VisitReportForm,
): Partial<Record<'report', string>> {
    return form.report.trim().length < REPORT_MIN_LENGTH
        ? {
              report: `Décrivez la visite en au moins ${REPORT_MIN_LENGTH} caractères.`,
          }
        : {};
}

/** Ce qui part au serveur : les impressions, et la suite à donner au bien. */
export function reportPayload(form: VisitReportForm): VisitReportPayload {
    return { report: form.report.trim(), next_status: form.next_status };
}
