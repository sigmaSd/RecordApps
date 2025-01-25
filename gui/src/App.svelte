<script lang="ts">
    import AppRow from "./lib/AppRow.svelte";
    import { onMount } from "svelte";
    import type { App } from "../../lib";

    let apps: App[] = [];
    onMount(() => {
        setInterval(() => {
            fetch("http://localhost:3000/apps")
                .then((res) => res.json())
                .then((data) => {
                    apps = data;
                });
        }, 1000);
    });
</script>

<main class="container">
    <h1>Record Apps</h1>
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Controls</th>
                </tr>
            </thead>
            <tbody>
                {#each apps as app}
                    <AppRow {app} />
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
    }

    .container {
        max-width: 800px;
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
