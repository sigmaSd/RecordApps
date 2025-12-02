<!-- App.svelte -->
<script lang="ts">
    import AppRow from "./lib/AppRow.svelte";
    import { onMount } from "svelte";
    import type { App, RecordRpc } from "../../backend/lib.ts";
    import { newWebSocketRpcSession, RpcStub } from "capnweb";

    const fontPort = Number.parseInt(window.location.port);
    let apiPort: number | undefined = $state(undefined);
    let api: RpcStub<RecordRpc> | undefined = $state(undefined);
    let apps: App[] = $state([]);
    let loading: boolean = $state(true);
    let downloadPath: string | undefined = $state(undefined);

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
                apps = await api.apps();
                loading = false;
            }
        }, 1000);
    });

    async function openFolder() {
        if (api) {
            await api.openDownloadFolder();
        }
    }
</script>

<main class="container">
    <header class="app-header">
        <h1>Applications</h1>
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
                            <AppRow {app} {apiPort} {api} />
                        {/each}
                    {/if}
                </tbody>
            </table>
        {/if}
    </div>
</main>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        background-color: #1a1a1a;
        color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, sans-serif;
        user-select: none;
        cursor: default;
    }

    .container {
        width: 95%;
        max-width: 1600px;
        margin: 0 auto;
        padding: 20px;
    }

    .app-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 0 10px;
    }

    h1 {
        color: #e0e0e0;
        margin: 0;
        font-size: 2rem;
    }

    .path-display {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #2a2a2a;
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid #333;
    }

    .label {
        color: #999;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .path {
        font-family: "JetBrains Mono", "Fira Code", monospace;
        color: #4ec9b0;
        background: rgba(0, 0, 0, 0.2);
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
        color: #e0e0e0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
    }

    .icon-btn svg {
        fill: currentColor;
    }

    .table-wrapper {
        background: #222222;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        min-height: 300px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        text-align: left;
        padding: 16px;
        border-bottom: 2px solid #2c2c2c;
        color: #aaa;
        font-weight: 600;
        font-size: 1rem;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
        height: 300px;
    }

    .empty-state svg {
        fill: #555;
        margin-bottom: 20px;
    }

    .empty-state h3 {
        color: #ccc;
        margin: 0 0 12px 0;
        font-size: 1.5rem;
    }

    .empty-state p {
        color: #999;
        margin: 0 0 8px 0;
        max-width: 400px;
        font-size: 1.1rem;
    }

    .empty-state .hint {
        font-size: 0.95rem;
        color: #777;
        margin-top: 20px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 62, 0, 0.1);
        border-left-color: rgba(255, 62, 0, 0.8);
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
