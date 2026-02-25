import api from './api';

/**
 * Download a CSV export from the backend.
 * @param {string} endpoint - Export endpoint path (e.g., '/export/leads')
 * @param {object} params - Query parameters (e.g., { status: 'Active' })
 * @param {string} fallbackFilename - Default filename if content-disposition header is absent
 */
export async function downloadCSV(endpoint, params = {}, fallbackFilename = 'export.csv') {
    try {
        const response = await api.get(endpoint, {
            params,
            responseType: 'blob',
        });

        // Extract filename from content-disposition header
        const contentDisposition = response.headers['content-disposition'] || '';
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        const filename = filenameMatch ? filenameMatch[1] : fallbackFilename;

        // Create download link
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('CSV export failed:', error);
        return false;
    }
}
