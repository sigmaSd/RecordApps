<!-- App.svelte -->
<script lang="ts">
    import AppRow from "./lib/AppRow.svelte";
    import { onMount } from "svelte";
    import type { App } from "../../lib";

    const fontPort = Number.parseInt(window.location.port);
    let apiPort: number | undefined = $state(undefined);
    let apps: App[] = $state([]);
    let loading: boolean = $state(true);

    onMount(async () => {
        // Disable right-click context menu
        window.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });

        await fetch(`http://localhost:${fontPort}/apiPort`)
            .then((res) => res.text())
            .then((p) => {
                apiPort = Number.parseInt(p);
                loading = false;
            })
            .catch((err) => {
                console.error("Failed to fetch API port:", err);
                loading = false;
            });

        setInterval(() => {
            if (apiPort) {
                fetch(`http://localhost:${apiPort}/apps`)
                    .then((res) => res.json())
                    .then((data) => {
                        apps = data;
                        loading = false;
                    })
                    .catch((err) => {
                        console.error("Failed to fetch apps:", err);
                        loading = false;
                    });
            }
        }, 1000);
    });
</script>

<main class="container">
    <h1>Applications</h1>
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
                        <th>Serial</th>
                        <th>Controls</th>
                    </tr>
                </thead>
                <tbody>
                    {#each apps as app (app.serial)}
                        <AppRow {app} apiPort={apiPort!} />
                    {/each}
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
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }

    h1 {
        text-align: center;
        color: #e0e0e0;
        margin-bottom: 30px;
    }

    .table-wrapper {
        background: #222222;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        min-height: 300px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        text-align: left;
        padding: 12px;
        border-bottom: 2px solid #2c2c2c;
        color: #999;
        font-weight: 600;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        height: 240px;
    }

    .empty-state svg {
        fill: #555;
        margin-bottom: 16px;
    }

    .empty-state h3 {
        color: #ccc;
        margin: 0 0 8px 0;
        font-size: 1.4rem;
    }

    .empty-state p {
        color: #999;
        margin: 0 0 8px 0;
        max-width: 400px;
        font-size: 1rem;
    }

    .empty-state .hint {
        font-size: 0.9rem;
        color: #777;
        margin-top: 16px;
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
