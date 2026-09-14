/**
 * Appel JSON à une route de l'assistant IA (`POST`, session et jeton CSRF de
 * la page). Le serveur répond 422 avec un `message` lisible quand l'assistant
 * n'est pas configuré ou refuse : on le remonte tel quel, jamais un code HTTP nu.
 */
export async function askAssistant<T>(
    url: string,
    body: Record<string, unknown> = {},
): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': decodeURIComponent(
                document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
            ),
        },
        body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as T & {
        message?: string;
    };

    if (!response.ok) {
        throw new Error(data.message ?? 'L’assistant n’a pas répondu.');
    }

    return data;
}
