<script lang="ts">
    import type { RpcStub } from "capnweb";
    import type { App, RecordRpc } from "../../../backend/lib.ts";

    const {
        app,
        apiPort,
        api,
    }: { app: App; apiPort: number; api: RpcStub<RecordRpc> } = $props();

    let recording = $state();
    let playing = $state();

    async function recordApp(app: App) {
        if (!recording) {
            await api.record(app);
            recording = true;
        } else {
            await api.stopRecord(app);
            playing = false;
            recording = false;
        }
    }

    async function playAudio(app: App) {
        if (!playing) {
            await api.play(app);
            playing = true;
        } else {
            await api.stopPlay(app);
            playing = false;
        }
    }
</script>

<tr class:recording>
    <td>{app.appName}</td>
    <td>{app.mediaName}</td>
    <td>{app.serial}</td>
    <td class="controls">
        <button
            class="control-btn record-btn"
            class:active={recording}
            onclick={() => recordApp(app)}
            aria-label={recording ? "Stop recording" : "Start recording"}
        >
            <span class="icon">
                {#if recording}
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                    </svg>
                {:else}
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <circle cx="12" cy="12" r="8" />
                    </svg>
                {/if}
            </span>
            <span class="btn-text">{recording ? "Stop" : "Record"}</span>
        </button>

        <div class="play-btn-container">
            <button
                class="control-btn play-btn"
                class:active={playing}
                onclick={() => playAudio(app)}
                aria-label={playing ? "Mute" : "Play audio"}
                disabled={!recording}
                style={recording ? "" : "opacity: 0; pointer-events: none;"}
            >
                <span class="icon">
                    {#if playing}
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path
                                d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"
                            />
                        </svg>
                    {:else}
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path
                                d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"
                            />
                        </svg>
                    {/if}
                </span>
                <span class="btn-text">{playing ? "Mute" : "Listen"}</span>
            </button>
        </div>
    </td>
</tr>

<style>
    tr {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: background-color 0.2s ease;
    }

    tr:hover {
        background-color: rgba(255, 255, 255, 0.03);
    }

    tr.recording {
        background-color: rgba(255, 62, 0, 0.1);
    }

    td {
        padding: 14px 16px;
        color: #e0e0e0;
        font-weight: 500;
        font-size: 0.95rem;
        text-align: left;
    }

    td:first-child {
        min-width: 180px;
    }

    td:nth-child(2) {
        min-width: 180px;
    }

    .controls {
        display: flex;
        gap: 12px;
        align-items: center;
    }

    .play-btn-container {
        /* This ensures the space is always reserved */
        width: auto;
        height: auto;
    }

    .control-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 0.85rem;
        font-weight: 600;
        color: #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 95px; /* Ensure consistent button width */
    }

    .record-btn {
        border: 1px solid rgba(255, 62, 0, 0.3);
    }

    .play-btn {
        border: 1px solid rgba(100, 148, 237, 0.3);
        transition:
            opacity 0.3s ease,
            background 0.2s ease,
            transform 0.2s ease;
    }

    .control-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
    }

    .record-btn.active {
        background: rgba(255, 62, 0, 0.8);
        box-shadow: 0 2px 10px rgba(255, 62, 0, 0.3);
    }

    .play-btn.active {
        background: rgba(100, 148, 237, 0.8);
        box-shadow: 0 2px 10px rgba(100, 148, 237, 0.3);
    }

    .icon {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    svg {
        fill: currentColor;
    }

    .record-btn:not(.active) svg {
        fill: rgb(255, 62, 0);
    }

    .play-btn:not(.active) svg {
        fill: rgb(100, 148, 237);
    }

    .btn-text {
        margin-left: 2px;
    }
</style>
