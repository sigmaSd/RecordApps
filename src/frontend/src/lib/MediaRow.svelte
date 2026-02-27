<script lang="ts">
    import type { App } from "../../../backend/lib.ts";

    const {
        app,
        isRecording,
        isPlaying,
        onToggleRecord,
        onPlay,
        onStopPlay,
        autoRecord = false,
    }: {
        app: App;
        isRecording: boolean;
        isPlaying: boolean;
        onToggleRecord: () => void;
        onPlay: () => void;
        onStopPlay: () => void;
        autoRecord?: boolean;
    } = $props();

    let isActive = $derived(app.serial > 0);
</script>

<tr class="media-row" class:recording={isRecording} class:inactive={!isActive}>
    <td class="indent-cell"></td>
    <td class="media-info">
        <div class="media-info-wrapper">
            <span class="media-name" title={app.mediaName}>{app.mediaName}</span>
        </div>
    </td>
    <td class="controls">
        <div class="controls-wrapper">
            {#if !autoRecord}
                <button
                    class="control-btn record-btn"
                    class:active={isRecording}
                    onclick={onToggleRecord}
                    disabled={!isActive}
                    aria-label={isRecording
                        ? "Stop recording"
                        : "Start recording"}
                >
                    <span class="icon">
                        {#if isRecording}
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <rect
                                    width="18"
                                    height="18"
                                    x="3"
                                    y="3"
                                    rx="2"
                                />
                            </svg>
                        {:else}
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <circle cx="12" cy="12" r="8" />
                            </svg>
                        {/if}
                    </span>
                    <span class="btn-text"
                        >{isRecording ? "Stop" : "Record"}</span
                    >
                </button>
            {/if}

            <div class="play-btn-container">
                <button
                    class="control-btn play-btn"
                    class:active={isPlaying}
                    onclick={() => (isPlaying ? onStopPlay() : onPlay())}
                    aria-label={isPlaying ? "Stop monitoring" : "Monitor audio"}
                    disabled={!isRecording || !isActive}
                    style={isRecording && isActive
                        ? ""
                        : "opacity: 0; pointer-events: none;"}
                >
                    <span class="icon">
                        {#if isPlaying}
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path
                                    d="M3,9V15H7L12,20V4L7,9H3Z"
                                />
                                <path
                                    d="M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12Z"
                                />
                                <path
                                    d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23Z"
                                />
                            </svg>
                        {:else}
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path
                                    d="M3,9V15H7L12,20V4L7,9H3Z"
                                />
                                <path
                                    d="M5.64,7.22L4.22,5.81L16.06,17.65L19.78,21.37L21.19,19.96L17.47,16.24C18.97,14.68 20,12.46 20,12C20,7.72 17,4.14 13,3.23V5.29C15.89,6.15 18,8.83 18,12C18,13.08 17.65,14.09 17.08,14.95L15.55,13.42C15.83,12.99 16,12.52 16,12C16,10.23 15,8.71 13.5,7.97V12.17L7.83,6.5L5.64,7.22Z"
                                />
                                <line x1="2" y1="3" x2="22" y2="21" stroke="currentColor" stroke-width="2" />
                            </svg>
                        {/if}
                    </span>
                    <span class="btn-text">Monitor</span>
                </button>
            </div>
        </div>
    </td>
</tr>

<style>
    .media-row {
        border-bottom: 1px solid var(--row-border);
        transition: background-color 0.2s ease;
    }

    .media-row:hover {
        background-color: var(--row-hover);
    }

    .media-row.recording {
        background-color: rgba(255, 62, 0, 0.05);
    }

    .media-row.inactive {
        opacity: 0.6;
        filter: grayscale(0.8);
    }

    td {
        padding: 12px 16px;
        color: var(--text-color);
        font-weight: 500;
        font-size: 0.95rem;
        vertical-align: middle;
    }

    .indent-cell {
        width: 40px;
        border-right: 2px solid var(--border-color);
        position: relative;
    }

    .indent-cell::after {
        content: "";
        position: absolute;
        left: 20px;
        top: 0;
        bottom: 50%;
        width: 12px;
        border-left: 2px solid var(--border-color);
        border-bottom: 2px solid var(--border-color);
        border-bottom-left-radius: 4px;
    }

    .media-info {
        width: 40%;
    }

    .media-info-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .media-name {
        color: var(--secondary-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-style: italic;
    }

    .controls {
        width: 30%;
        text-align: right;
    }

    .controls-wrapper {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        align-items: center;
    }

    .play-btn-container {
        width: auto;
        height: auto;
    }

    .control-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: var(--control-bg);
        border: none;
        border-radius: 6px;
        padding: 8px 14px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--control-text);
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 100px;
        white-space: nowrap;
    }

    .record-btn {
        border: 1px solid rgba(255, 62, 0, 0.3);
    }

    .play-btn {
        border: 1px solid rgba(100, 148, 237, 0.3);
    }

    .control-btn:hover:not(:disabled) {
        background: var(--hover-bg);
        transform: translateY(-1px);
    }

    .record-btn.active {
        background: rgba(255, 62, 0, 0.8);
        box-shadow: 0 2px 10px rgba(255, 62, 0, 0.3);
        color: white;
    }

    .play-btn.active {
        background: rgba(100, 148, 237, 0.8);
        box-shadow: 0 2px 10px rgba(100, 148, 237, 0.3);
        color: white;
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
</style>
