export const GOOGLE_DRIVE_CONFIG = {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
    refreshToken: import.meta.env.VITE_GOOGLE_REFRESH_TOKEN,
};

/**
 * Exchanges the refresh token for a short-lived access token.
 */
export async function getAccessToken(): Promise<string> {
    const { clientId, clientSecret, refreshToken } = GOOGLE_DRIVE_CONFIG;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Missing Google Drive credentials in .env");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to refresh token: ${errorData.error_description || errorData.error}`);
    }

    const data = await response.json();
    return data.access_token;
}

export async function createFolder(folderName: string, accessToken: string): Promise<{ id: string, webViewLink: string }> {
    const metadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
    };

    const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create folder: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return { id: data.id, webViewLink: data.webViewLink };
}

export async function setFilePublic(fileId: string, accessToken: string): Promise<void> {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            role: "reader",
            type: "anyone",
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to set public permissions: ${error.error?.message || response.statusText}`);
    }
}

/**
 * Uploads a file to Google Drive.
 */
export async function uploadFile(
    fileBlob: Blob,
    fileName: string,
    mimeType: string,
    accessToken: string,
    folderId?: string,
    onProgress?: (progress: number) => void
): Promise<any> {
    const metadata: any = {
        name: fileName,
        mimeType: mimeType,
    };

    if (folderId) {
        metadata.parents = [folderId];
    }

    const form = new FormData();
    form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", fileBlob);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
        xhr.open(
            "POST",
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
        );
        xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    onProgress(event.loaded / event.total);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error("Network error during upload"));
        };

        xhr.send(form);
    });
}
