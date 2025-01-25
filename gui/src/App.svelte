<script lang="ts">
    import svelteLogo from "./assets/svelte.svg";
    import viteLogo from "/vite.svg";
    import Counter from "./lib/Counter.svelte";
    import AppRow from "./lib/AppRow.svelte";
    import { onMount } from "svelte";
    import type { App } from "../../../lib";

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

<main>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>ID</th>
            </tr>
        </thead>
        {#each apps as app}
            <tbody>
                <AppRow {app} />
            </tbody>
        {/each}
    </table>
</main>

<style>
</style>
