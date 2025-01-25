<script lang="ts">
    import type { App } from "../../../lib";

    const { app } = $props();

    let recording = $state();
    let playing = $state();

    async function recordApp(app: App) {
        if (!recording) {
            await fetch("http://localhost:3000/record", {
                method: "POST",
                body: JSON.stringify(app),
            });
            recording = true;
        } else {
            await fetch("http://localhost:3000/stop-recording", {
                method: "POST",
                body: JSON.stringify(app),
            });
            recording = false;
        }
    }

    async function playAudio(app: App) {
        if (!playing) {
            await fetch("http://localhost:3000/play", {
                method: "POST",
                body: JSON.stringify(app),
            });
            playing = true;
        } else {
            await fetch("http://localhost:3000/stop-playing", {
                method: "POST",
                body: JSON.stringify(app),
            });
            playing = false;
        }
    }
</script>

<tr>
    <td>{app.name}</td>
    <td>{app.id}</td>
    <td>
        <button onclick={() => recordApp(app)}
            >{recording ? "Stop Recording" : "Record"}</button
        >
    </td>
    {#if recording}
        <td>
            <button onclick={() => playAudio(app)}
                >{playing ? "Mute" : "Play"}</button
            >
        </td>
    {/if}
</tr>
