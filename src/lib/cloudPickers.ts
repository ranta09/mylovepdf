/* Cloud Storage File Pickers — Dropbox Chooser, Google Drive Picker, OneDrive Picker */

declare global {
  interface Window {
    Dropbox?: any;
    gapi?: any;
    google?: any;
    OneDrive?: any;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function loadScript(src: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function urlToFile(url: string, name: string, headers?: HeadersInit): Promise<File> {
  const res = await fetch(url, headers ? { headers } : undefined);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "application/pdf" });
}

// ── Config fetcher ───────────────────────────────────────────────────────────

let _cfg: { dropboxAppKey: string; googleApiKey: string; googleClientId: string; onedriveClientId: string } | null = null;

async function getConfig() {
  if (_cfg) return _cfg;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/get-picker-config`);
  if (!res.ok) throw new Error("Could not load cloud picker config");
  _cfg = await res.json();
  return _cfg!;
}

// ── Dropbox Chooser ──────────────────────────────────────────────────────────

export async function openDropboxChooser(accept: string, multiple: boolean): Promise<File[]> {
  const cfg = await getConfig();
  if (!cfg.dropboxAppKey) throw new Error("Dropbox is not configured yet");

  await loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
    id: "dropboxjs",
    "data-app-key": cfg.dropboxAppKey,
  });

  return new Promise((resolve, reject) => {
    window.Dropbox.choose({
      success: async (files: any[]) => {
        try {
          const results = await Promise.all(files.map((f: any) => urlToFile(f.link, f.name)));
          resolve(results);
        } catch (e) { reject(e); }
      },
      cancel: () => resolve([]),
      linkType: "direct",
      multiselect: multiple,
      extensions: accept ? accept.split(",").map(s => s.trim()) : undefined,
    });
  });
}

// ── Google Drive Picker ──────────────────────────────────────────────────────

export async function openGoogleDrivePicker(accept: string, multiple: boolean): Promise<File[]> {
  const cfg = await getConfig();
  if (!cfg.googleApiKey || !cfg.googleClientId) throw new Error("Google Drive is not configured yet");

  await loadScript("https://apis.google.com/js/api.js");
  await loadScript("https://accounts.google.com/gsi/client");

  // Load the picker API
  await new Promise<void>((resolve, reject) => {
    window.gapi.load("picker", { callback: resolve, onerror: reject });
  });

  // Get OAuth token
  const token = await new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: cfg.googleClientId,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (resp: any) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });

  // Build mime type filter
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".html": "text/html",
  };
  const mimes = accept.split(",").map(e => mimeMap[e.trim()]).filter(Boolean).join(",");

  return new Promise((resolve, reject) => {
    const view = new window.google.picker.DocsView()
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false);
    if (mimes) view.setMimeTypes(mimes);

    const builder = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(cfg.googleApiKey)
      .setCallback(async (data: any) => {
        if (data.action === "picked") {
          try {
            const results = await Promise.all(
              data.docs.map((doc: any) =>
                urlToFile(
                  `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                  doc.name,
                  { Authorization: `Bearer ${token}` }
                )
              )
            );
            resolve(results);
          } catch (e) { reject(e); }
        } else if (data.action === "cancel") {
          resolve([]);
        }
      });

    if (multiple) builder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
    builder.build().setVisible(true);
  });
}

// ── OneDrive Picker ──────────────────────────────────────────────────────────

export async function openOneDrivePicker(accept: string, multiple: boolean): Promise<File[]> {
  const cfg = await getConfig();
  if (!cfg.onedriveClientId) throw new Error("OneDrive is not configured yet");

  await loadScript("https://js.live.net/v7.2/OneDrive.js");

  const extFilter = accept ? accept.split(",").map(s => s.trim()) : undefined;

  return new Promise((resolve, reject) => {
    window.OneDrive.open({
      clientId: cfg.onedriveClientId,
      action: "download",
      multiSelect: multiple,
      advanced: {
        filter: extFilter ? extFilter.join(",") : undefined,
        redirectUri: window.location.origin,
      },
      success: async (response: any) => {
        try {
          const results = await Promise.all(
            response.value.map((item: any) =>
              urlToFile(item["@microsoft.graph.downloadUrl"], item.name)
            )
          );
          resolve(results);
        } catch (e) { reject(e); }
      },
      cancel: () => resolve([]),
      error: (e: any) => reject(new Error(e?.errorMessage || "OneDrive picker error")),
    });
  });
}
