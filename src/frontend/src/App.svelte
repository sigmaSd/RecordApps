<!-- App.svelte -->
<script lang="ts">
    import AppHeaderRow from "./lib/AppHeaderRow.svelte";
    import MediaRow from "./lib/MediaRow.svelte";
    import NotificationToast from "./lib/NotificationToast.svelte";
    import { onMount } from "svelte";
    import type { App, RecordRpc } from "../../backend/lib.ts";
    import { newWebSocketRpcSession, RpcStub } from "capnweb";

    interface AppGroup {
        appName: string;
        isPinned: boolean;
        autoRecord: boolean;
        autoListen: boolean;
        streams: App[];
    }

    const fontPort = Number.parseInt(window.location.port);
    let apiPort: number | undefined = $state(undefined);
    let api: RpcStub<RecordRpc> | undefined = $state(undefined);
    let appGroups: AppGroup[] = $state([]);
    let loading: boolean = $state(true);
    let downloadPath: string | undefined = $state(undefined);
    let recordingApps: Map<number, App> = $state(new Map());
    let recordingInProgress: Set<number> = $state(new Set());
    let playingSerials: Set<number> = $state(new Set());
    let playingInProgress: Set<number> = $state(new Set());
    let selectedFormat = $state("opus");
    const formats = ["opus", "mp3", "flac", "wav", "ogg"];

    // Pinned apps state: Record<string, { autoRecord: boolean, autoListen: boolean }>
    // Key is appName
    let pinnedApps: Record<string, { autoRecord: boolean; autoListen: boolean }> =
        $state({});

    let toastMessage = $state("");
    let toastVisible = $state(false);
    let toastType: "success" | "error" = $state("success");
    let connected = $state(true);

    async function syncPinnedApps() {
        if (api) {
            await api.setPinnedApps(pinnedApps);
        }
    }

    function togglePin(appName: string) {
        if (pinnedApps[appName]) {
            delete pinnedApps[appName];
        } else {
            pinnedApps[appName] = { autoRecord: false, autoListen: false };
        }
        pinnedApps = { ...pinnedApps };
        syncPinnedApps();
    }

    function toggleAutoRecord(appName: string) {
        if (pinnedApps[appName]) {
            const wasAutoRecording = pinnedApps[appName].autoRecord;
            pinnedApps[appName].autoRecord = !wasAutoRecording;
            pinnedApps = { ...pinnedApps };
            syncPinnedApps();

            // If auto-record was just turned off, stop any active recordings for matching apps
            if (wasAutoRecording) {
                for (const [serial, app] of recordingApps) {
                    if (app.appName === appName) {
                        stopRecord(app);
                    }
                }
            }
        }
    }

    function toggleAutoListen(appName: string) {
        if (pinnedApps[appName]) {
            pinnedApps[appName].autoListen = !pinnedApps[appName].autoListen;
            pinnedApps = { ...pinnedApps };
            syncPinnedApps();
        }
    }

    async function play(app: App) {
        if (!api) return;
        playingInProgress.add(app.serial);
        playingInProgress = new Set(playingInProgress);
        try {
            await api.play(app);
            playingSerials.add(app.serial);
            playingSerials = new Set(playingSerials);
        } catch (err) {
            console.error("Failed to start playback:", err);
            showToast("Failed to start monitoring", "error");
        } finally {
            playingInProgress.delete(app.serial);
            playingInProgress = new Set(playingInProgress);
        }
    }

    async function stopPlay(app: App) {
        if (!api) return;
        try {
            await api.stopPlay(app);
            playingSerials.delete(app.serial);
            playingSerials = new Set(playingSerials);
        } catch (err) {
            console.error("Failed to stop playback:", err);
            showToast("Failed to stop monitoring", "error");
        }
    }

    async function connectApi(port: number) {
        const wsUrl = `ws://localhost:${port}/api`;
        const ws = new WebSocket(wsUrl);

        try {
            await new Promise<void>((resolve, reject) => {
                ws.addEventListener("open", () => resolve());
                ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")));
            });
        } catch {
            // Connection failed — retry after delay
            connected = false;
            setTimeout(() => connectApi(port), 2000);
            return;
        }

        ws.addEventListener("close", () => {
            connected = false;
            api = undefined;
            // Reconnect after a short delay
            setTimeout(() => connectApi(port), 1000);
        });

        api = newWebSocketRpcSession(ws);
        connected = true;

        try {
            downloadPath = await api.getDownloadPath();
            pinnedApps = await api.getPinnedApps();

            // Sync recording state from backend
            const activeSerials = await api.activeRecordings();
            if (activeSerials.length > 0) {
                const currentApps = await api.apps();
                for (const serial of activeSerials) {
                    const app = currentApps.find(a => a.serial === serial);
                    if (app) {
                        recordingApps.set(serial, app);
                    }
                }
                recordingApps = new Map(recordingApps);
            }
        } catch (err) {
            console.error("Failed to sync state:", err);
        }
    }

    function showToast(message: string, type: "success" | "error" = "success") {
        toastMessage = message;
        toastType = type;
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
                await connectApi(apiPort);
                loading = false;
            })
            .catch((err) => {
                console.error("Failed to fetch API port:", err);
                loading = false;
            });

        setInterval(async () => {
            if (!api || !connected) return;
            try {
                const currentApps = await api.apps();
                
                // Check for stopped apps that were recording
                const currentSerials = new Set(currentApps.map(a => a.serial));
                for (const [serial, app] of recordingApps) {
                    if (!currentSerials.has(serial)) {
                        stopRecord(app);
                    }
                }

                // Auto-record & Auto-listen logic (only for active apps)
                for (const app of currentApps) {
                    const pinConfig = pinnedApps[app.appName];

                    if (pinConfig) {
                        if (pinConfig.autoRecord && !recordingApps.has(app.serial) && !recordingInProgress.has(app.serial)) {
                            record(app);
                        }
                        if (pinConfig.autoListen && recordingApps.has(app.serial) && !playingSerials.has(app.serial) && !playingInProgress.has(app.serial)) {
                            play(app);
                        }
                    }
                }

                // Create a grouped list that includes all pinned apps even if they're not running
                const groupsMap = new Map<string, AppGroup>();

                for (const app of currentApps) {
                    if (!groupsMap.has(app.appName)) {
                        groupsMap.set(app.appName, {
                            appName: app.appName,
                            isPinned: !!pinnedApps[app.appName],
                            autoRecord: pinnedApps[app.appName]?.autoRecord || false,
                            autoListen: pinnedApps[app.appName]?.autoListen || false,
                            streams: []
                        });
                    }
                    groupsMap.get(app.appName)!.streams.push(app);
                }

                // Add inactive pinned apps
                for (const appName in pinnedApps) {
                    if (!groupsMap.has(appName)) {
                        groupsMap.set(appName, {
                            appName,
                            isPinned: true,
                            autoRecord: pinnedApps[appName].autoRecord,
                            autoListen: pinnedApps[appName].autoListen,
                            streams: []
                        });
                    }
                }

                // Sort groups: pinned first, then by appName
                appGroups = Array.from(groupsMap.values()).sort((a, b) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return a.appName.localeCompare(b.appName);
                });

                loading = false;
            } catch (err) {
                console.warn("Poll failed (WebSocket may be disconnected):", err);
            }
        }, 1000);
    });

    async function record(app: App) {
        if (!api) return;
        recordingInProgress.add(app.serial);
        recordingInProgress = new Set(recordingInProgress);
        try {
            await api.record(app, selectedFormat);
            recordingApps.set(app.serial, app);
            recordingApps = new Map(recordingApps);

            // If autoListen is enabled, start monitoring immediately
            const pinConfig = pinnedApps[app.appName];
            if (pinConfig?.autoListen) {
                play(app);
            }
        } catch (err) {
            console.error("Failed to start recording:", err);
            showToast(`Failed to start recording ${app.appName}`, "error");
        } finally {
            recordingInProgress.delete(app.serial);
            recordingInProgress = new Set(recordingInProgress);
        }
    }

    async function stopRecord(app: App) {
        if (!api) return;
        // Optimistically remove from map to prevent double-calls
        if (recordingApps.has(app.serial)) {
            recordingApps.delete(app.serial);
            recordingApps = new Map(recordingApps);
            playingSerials.delete(app.serial);
            playingSerials = new Set(playingSerials);
            try {
                const path = await api.stopRecord(app);
                showToast(path);
            } catch (err) {
                console.error("Failed to stop recording:", err);
                showToast(`Failed to stop recording ${app.appName}`, "error");
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
        {#if !connected}
            <div class="reconnect-banner">
                <div class="spinner small"></div>
                <span>Reconnecting...</span>
            </div>
        {/if}
        {#if loading}
            <div class="empty-state">
                <div class="spinner"></div>
                <p>Connecting to system...</p>
            </div>
        {:else if appGroups.length === 0}
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
                            <th style="width: 40px;"></th>
                            <th>Application / Media</th>
                            <th class="controls-header">Controls</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#if api !== undefined && apiPort !== undefined}
                            {#each appGroups as group (group.appName)}
                                <AppHeaderRow
                                    appName={group.appName}
                                    isPinned={group.isPinned}
                                    autoRecord={group.autoRecord}
                                    autoListen={group.autoListen}
                                    isActive={group.streams.length > 0}
                                    onTogglePin={() => togglePin(group.appName)}
                                    onToggleAutoRecord={() => toggleAutoRecord(group.appName)}
                                    onToggleAutoListen={() => toggleAutoListen(group.appName)}
                                />
                                {#each group.streams as app (app.serial)}
                                    <MediaRow
                                        {app}
                                        isRecording={recordingApps.has(app.serial)}
                                        isPlaying={playingSerials.has(app.serial)}
                                        autoRecord={group.autoRecord}
                                        onPlay={() => play(app)}
                                        onStopPlay={() => stopPlay(app)}
                                        onToggleRecord={() => {
                                            if (recordingApps.has(app.serial)) {
                                                stopRecord(app);
                                            } else {
                                                record(app);
                                            }
                                        }}
                                    />
                                {/each}
                                {#if group.streams.length === 0}
                                    <MediaRow
                                        app={{ appName: group.appName, mediaName: "(no active streams)", serial: -1 }}
                                        isRecording={false}
                                        isPlaying={false}
                                        onPlay={() => {}}
                                        onStopPlay={() => {}}
                                        onToggleRecord={() => {}}
                                    />
                                {/if}
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>

    <NotificationToast message={toastMessage} type={toastType} bind:visible={toastVisible} />
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

    .controls-header {
        text-align: right;
        padding-right: 24px;
        width: 300px;
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

    .spinner.small {
        width: 18px;
        height: 18px;
        border-width: 2px;
        margin-bottom: 0;
    }

    .reconnect-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
        padding: 8px 16px;
        background: var(--warning-bg, #4a3600);
        color: var(--warning-text, #ffd666);
        font-size: 0.9rem;
        border-radius: 6px;
        margin: 8px 16px;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
