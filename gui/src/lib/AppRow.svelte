<script lang="ts">
    import type { App } from "../../../lib";

    const { app, apiPort } = $props();

    let recording = $state();
    let playing = $state();

    async function recordApp(app: App) {
        if (!recording) {
            await fetch(`http://localhost:${apiPort}/record`, {
                method: "POST",
                body: JSON.stringify(app),
            });
            recording = true;
        } else {
            await fetch(`http://localhost:${apiPort}/stop-recording`, {
                method: "POST",
                body: JSON.stringify(app),
            });
            playing = false;
            recording = false;
        }
    }

    async function playAudio(app: App) {
        if (!playing) {
            await fetch(`http://localhost:${apiPort}/play`, {
                method: "POST",
                body: JSON.stringify(app),
            });
            playing = true;
        } else {
            await fetch(`http://localhost:${apiPort}/stop-playing`, {
                method: "POST",
                body: JSON.stringify(app),
            });
            playing = false;
        }
    }
</script>

<tr class:recording>
    <td>{app.name}</td>
    <td>{app.id}</td>
    <td class="controls">
        <button
            class="control-btn"
            class:active={recording}
            onclick={() => recordApp(app)}
        >
            {recording ? "⏹️" : "🔴"}
        </button>

        {#if recording}
            <button
                class="control-btn"
                class:active={playing}
                onclick={() => playAudio(app)}
            >
                {playing ? "🔇" : "🔊"}
            </button>
        {/if}
    </td>
</tr>

<style>
    tr {
        border-bottom: 1px solid #2c2c2c;
        transition: background-color 0.2s;
    }

    tr:hover {
        background-color: #2a2a2a;
    }

    tr.recording {
        background-color: #3d2626;
    }

    td {
        padding: 12px;
        color: #e0e0e0;
        font-weight: 600;
        text-align: left;
    }
    td:first-child {
        min-width: 200px;
    }
    td:nth-child(2) {
        min-width: 200px;
    }

    .controls {
        min-width: 200px;
        display: flex;
        gap: 8px;
    }

    .control-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: all 0.2s;
        font-size: 1.2em;
    }

    .control-btn:hover {
        background: #3a3a3a;
    }

    .control-btn.active {
        background: #ff3e00;
        color: white;
    }
</style>
