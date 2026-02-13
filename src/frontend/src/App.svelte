<!-- App.svelte -->
<script lang="ts">
    import AppRow from "./lib/AppRow.svelte";
    import NotificationToast from "./lib/NotificationToast.svelte";
    import { onMount } from "svelte";
    import type { App, RecordRpc } from "../../backend/lib.ts";
    import { newWebSocketRpcSession, RpcStub } from "capnweb";

    const fontPort = Number.parseInt(window.location.port);
    let apiPort: number | undefined = $state(undefined);
    let api: RpcStub<RecordRpc> | undefined = $state(undefined);
    let apps: App[] = $state([]);
    let loading: boolean = $state(true);
    let downloadPath: string | undefined = $state(undefined);
    let recordingApps: Map<number, App> = $state(new Map());
    let selectedFormat = $state("opus");
    const formats = ["opus", "mp3", "flac", "wav", "ogg"];

    let toastMessage = $state("");
    let toastVisible = $state(false);

    function showToast(path: string) {
        toastMessage = path;
        toastVisible = true;
    }

    onMount(async () => {
        // Disable right-click context menu
        window.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });

        await fetch(`http://localhost:${fontPort}/apiPort`)
            .then((res) => res.text())
            .then(async (p) => {
                apiPort = Number.parseInt(p);
                if (Number.isNaN(apiPort)) apiPort = 8000;
                api = newWebSocketRpcSession(`ws://localhost:${apiPort}/api`);
                downloadPath = await api.getDownloadPath();
                loading = false;
            })
            .catch((err) => {
                console.error("Failed to fetch API port:", err);
                loading = false;
            });

        setInterval(async () => {
            if (api) {
                const currentApps = await api.apps();
                
                // Check for stopped apps that were recording
                const currentSerials = new Set(currentApps.map(a => a.serial));
                for (const [serial, app] of recordingApps) {
                    if (!currentSerials.has(serial)) {
                        stopRecord(app);
                    }
                }

                apps = currentApps;
                loading = false;
            }
        }, 1000);
    });

    async function record(app: App) {
        if (!api) return;
        try {
            await api.record(app, selectedFormat);
            recordingApps.set(app.serial, app);
            recordingApps = new Map(recordingApps);
        } catch (err) {
            console.error("Failed to start recording:", err);
        }
    }

    async function stopRecord(app: App) {
        if (!api) return;
        // Optimistically remove from map to prevent double-calls
        if (recordingApps.has(app.serial)) {
            recordingApps.delete(app.serial);
            recordingApps = new Map(recordingApps);
            try {
                const path = await api.stopRecord(app);
                showToast(path);
            } catch (err) {
                console.error("Failed to stop recording:", err);
            }
        }
    }

    async function openFolder() {
        if (api) {
            await api.openDownloadFolder();
        }
    }
</script>

<main class="container">
    <header class="app-header">
        <h1>Applications</h1>
        <div class="header-right">
            <div class="format-display">
                <span class="label">Format:</span>
                <select bind:value={selectedFormat} class="format-select">
                    {#each formats as format}
                        <option value={format}>{format.toUpperCase()}</option>
                    {/each}
                </select>
            </div>
            {#if downloadPath}
                <div class="path-display">
                    <span class="label">Save Location:</span>
                    <code class="path" title={downloadPath}>{downloadPath}</code>
                    <button
                        class="icon-btn"
                        onclick={openFolder}
                        title="Open Save Folder"
                        aria-label="Open Save Folder"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path
                                d="M19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4H9L11,6H19A2,2 0 0,1 21,8V18A2,2 0 0,1 19,20M19,8H5V18H19V8Z"
                            />
                        </svg>
                    </button>
                </div>
            {/if}
        </div>
    </header>

    <div class="table-wrapper">
        {#if loading}
            <div class="empty-state">
                <div class="spinner"></div>
                <p>Connecting to system...</p>
            </div>
        {:else if apps.length === 0}
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48">
                    <path
                        d="M12,12A3,3 0 0,0 9,15A3,3 0 0,0 12,18A3,3 0 0,0 15,15A3,3 0 0,0 12,12M12,20A5,5 0 0,1 7,15A5,5 0 0,1 12,10A5,5 0 0,1 17,15A5,5 0 0,1 12,20M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8C10.89,8 10,7.1 10,6C10,4.89 10.89,4 12,4M17,2H7C5.89,2 5,2.89 5,4V20A2,2 0 0,0 7,22H17A2,2 0 0,0 19,20V4C19,2.89 18.1,2 17,2Z"
                    />
                </svg>
                <h3>No Applications Detected</h3>
                <p>Launch audio applications to see them appear here.</p>
                <p class="hint">
                    Applications with active audio streams will be automatically
                    detected.
                </p>
            </div>
        {:else}
            <div class="scroll-container">
                <table>
                    <thead>
                        <tr>
                            <th>App Name</th>
                            <th>Media Name</th>
                            <th>Controls</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if api !== undefined && apiPort !== undefined}
                            {#each apps as app (app.serial)}
                                <AppRow 
                                    {app} 
                                    {api} 
                                    isRecording={recordingApps.has(app.serial)}
                                    onToggleRecord={() => {
                                        if (recordingApps.has(app.serial)) {
                                            stopRecord(app);
                                        } else {
                                            record(app);
                                        }
                                    }}
                                />
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>

    <NotificationToast message={toastMessage} bind:visible={toastVisible} />
</main>

<style>
    :global(:root) {
        color-scheme: light;
        --bg-color: #ffffff;
        --text-color: #333333;
        --surface-color: #f5f5f5;
        --surface-border: #e0e0e0;
        --border-color: #dddddd;
        --secondary-text: #666666;
        --tertiary-text: #888888;
        --path-bg: rgba(0, 0, 0, 0.05);
        --hover-bg: rgba(0, 0, 0, 0.05);
        --header-text: #222222;
        --icon-color: #555555;
        --path-text: #007acc;
        --spinner-color: rgba(255, 62, 0, 0.8);
        --spinner-bg: rgba(255, 62, 0, 0.1);
        --row-hover: rgba(0, 0, 0, 0.03);
        --row-border: rgba(0, 0, 0, 0.1);
        --control-bg: rgba(0, 0, 0, 0.08);
        --control-text: #333333;
        --select-bg: #ffffff;
    }

    :global(html.dark-theme) {
        color-scheme: dark;
        --bg-color: #1a1a1a;
        --text-color: #e0e0e0;
        --surface-color: #222222;
        --surface-border: #333333;
        --border-color: #2c2c2c;
        --secondary-text: #aaaaaa;
        --tertiary-text: #999999;
        --path-bg: rgba(0, 0, 0, 0.2);
        --hover-bg: rgba(255, 255, 255, 0.1);
        --header-text: #e0e0e0;
        --icon-color: #e0e0e0;
        --path-text: #4ec9b0;
        --spinner-color: rgba(255, 62, 0, 0.8);
        --spinner-bg: rgba(255, 62, 0, 0.1);
        --row-hover: rgba(255, 255, 255, 0.03);
        --row-border: rgba(255, 255, 255, 0.1);
        --control-bg: rgba(255, 255, 255, 0.08);
        --control-text: #ffffff;
        --select-bg: #2c2c2c;
    }

    :global(body) {
        margin: 0;
        padding: 0;
        background-color: var(--bg-color);
        color: var(--text-color);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, sans-serif;
        user-select: none;
        cursor: default;
        height: 100vh;
        overflow: hidden; /* Prevent body scroll */
    }

    .container {
        width: 95%;
        max-width: 1600px;
        height: 100vh; /* Fill full height */
        margin: 0 auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        box-sizing: border-box; /* Important for padding */
    }

    .app-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 0 10px;
        flex-shrink: 0; /* Header doesn't shrink */
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .format-display {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--surface-color);
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid var(--surface-border);
    }

    .format-select {
        background: var(--select-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 4px 8px;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .format-select:hover {
        border-color: var(--path-text);
    }

    .format-select:focus {
        outline: none;
        border-color: var(--path-text);
        box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
    }

    h1 {
        color: var(--header-text);
        margin: 0;
        font-size: 2rem;
    }

    .path-display {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--surface-color);
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid var(--surface-border);
    }

    .label {
        color: var(--secondary-text);
        font-size: 0.9rem;
        font-weight: 500;
    }

    .path {
        font-family: "JetBrains Mono", "Fira Code", monospace;
        color: var(--path-text);
        background: var(--path-bg);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.9rem;
        max-width: 400px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .icon-btn {
        background: transparent;
        border: none;
        padding: 6px;
        border-radius: 4px;
        color: var(--icon-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .icon-btn:hover {
        background: var(--hover-bg);
        color: var(--text-color);
    }

    .icon-btn svg {
        fill: currentColor;
    }

    .table-wrapper {
        background: var(--surface-color);
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        flex: 1; /* Fill remaining vertical space */
        min-height: 0; /* Required for nested flex scrolling */
        overflow: hidden; /* Manage overflow internally */
    }

    .scroll-container {
        overflow-y: auto;
        flex: 1;
        width: 100%;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        text-align: left;
        padding: 16px;
        border-bottom: 2px solid var(--border-color);
        color: var(--secondary-text);
        font-weight: 600;
        font-size: 1rem;
        background-color: var(--surface-color); /* For sticky header */
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
        flex: 1; /* Center vertically in the available space */
    }

    .empty-state svg {
        fill: var(--icon-color);
        margin-bottom: 20px;
        opacity: 0.7;
    }

    .empty-state h3 {
        color: var(--header-text);
        margin: 0 0 12px 0;
        font-size: 1.5rem;
    }

    .empty-state p {
        color: var(--secondary-text);
        margin: 0 0 8px 0;
        max-width: 400px;
        font-size: 1.1rem;
    }

    .empty-state .hint {
        font-size: 0.95rem;
        color: var(--tertiary-text);
        margin-top: 20px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--spinner-bg);
        border-left-color: var(--spinner-color);
        border-radius: 50%;
        margin-bottom: 20px;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
