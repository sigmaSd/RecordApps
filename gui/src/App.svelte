<script lang="ts">
    import AppRow from "./lib/AppRow.svelte";
    import { onMount } from "svelte";
    import type { App } from "../../lib";

    const fontPort = Number.parseInt(window.location.port);
    let apiPort: number | undefined = $state(undefined);
    let apps: App[] = $state([]);

    onMount(async () => {
        // Disable right-click context menu
        window.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });

        await fetch(`http://localhost:${fontPort}/apiPort`)
            .then((res) => res.text())
            .then((p) => {
                apiPort = Number.parseInt(p);
            });

        setInterval(() => {
            fetch(`http://localhost:${apiPort}/apps`)
                .then((res) => res.json())
                .then((data) => {
                    apps = data;
                });
        }, 1000);
    });
</script>

<main class="container">
    <h1>Applications</h1>
    <div class="table-wrapper">
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
                    <!-- port set on onMount -->
                    <AppRow {app} apiPort={apiPort!} />
                {/each}
            </tbody>
        </table>
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
</style>
