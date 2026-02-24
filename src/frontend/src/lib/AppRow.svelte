<script lang="ts">
    import type { RpcStub } from "capnweb";
    import type { App, RecordRpc } from "../../../backend/lib.ts";

    const {
        app,
        api,
        isRecording,
        isPinned,
        isMediaPinned,
        autoRecord,
        autoRecordMedia,
        isPlaying,
        onToggleRecord,
        onTogglePin,
        onToggleMediaPin,
        onToggleAutoRecord,
        onToggleAutoRecordMedia,
        onPlay,
        onStopPlay,
    }: {
        app: App;
        api: RpcStub<RecordRpc>;
        isRecording: boolean;
        isPinned: boolean;
        isMediaPinned: boolean;
        autoRecord: boolean;
        autoRecordMedia: boolean;
        isPlaying: boolean;
        onToggleRecord: () => void;
        onTogglePin: () => void;
        onToggleMediaPin: () => void;
        onToggleAutoRecord: () => void;
        onToggleAutoRecordMedia: () => void;
        onPlay: () => void;
        onStopPlay: () => void;
    } = $props();

    let isActive = $derived(app.serial !== -1);
</script>

<tr class:recording={isRecording} class:inactive={!isActive}>
    <td class="app-info">
        <div class="app-info-wrapper">
            <button
                class="icon-btn pin-btn"
                class:active={isPinned}
                onclick={onTogglePin}
                title={isPinned ? "Unpin application" : "Pin application"}
            >
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                        d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12M8.8,14L10,12.8V4H14V12.8L15.2,14H8.8Z"
                    />
                </svg>
            </button>
            <button
                class="icon-btn auto-record-btn"
                class:active={autoRecord}
                onclick={onToggleAutoRecord}
                disabled={!isPinned}
                title={autoRecord
                    ? "Disable auto-record"
                    : "Enable auto-record"}
            >
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                        d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"
                    />
                </svg>
            </button>
            <span class="app-name" title={app.appName}>{app.appName}</span>
        </div>
    </td>
    <td class="media-info">
        <div class="media-info-wrapper">
            <button
                class="icon-btn pin-btn"
                class:active={isMediaPinned}
                onclick={onToggleMediaPin}
                title={isMediaPinned ? "Unpin specific media" : "Pin specific media"}
            >
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                        d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12M8.8,14L10,12.8V4H14V12.8L15.2,14H8.8Z"
                    />
                </svg>
            </button>
            <button
                class="icon-btn auto-record-btn"
                class:active={autoRecordMedia}
                onclick={onToggleAutoRecordMedia}
                disabled={!isMediaPinned}
                title={autoRecordMedia
                    ? "Disable auto-record for this media"
                    : "Enable auto-record for this media"}
            >
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                        d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"
                    />
                </svg>
            </button>
            <span class="media-name" title={app.mediaName}>{app.mediaName}</span>
        </div>
    </td>
    <td class="controls">
        <div class="controls-wrapper">
            {#if !autoRecord && !autoRecordMedia}
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
                    aria-label={isPlaying ? "Mute" : "Play audio"}
                    disabled={!isRecording || !isActive}
                    style={isRecording && isActive
                        ? ""
                        : "opacity: 0; pointer-events: none;"}
                >
                    <span class="icon">
                        {#if isPlaying}
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path
                                    d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"
                                />
                            </svg>
                        {:else}
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path
                                    d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"
                                />
                            </svg>
                        {/if}
                    </span>
                    <span class="btn-text">{isPlaying ? "Mute" : "Listen"}</span>
                </button>
            </div>
        </div>
    </td>
</tr>

<style>
    tr {
        border-bottom: 1px solid var(--row-border);
        transition: background-color 0.2s ease;
    }

    tr:hover {
        background-color: var(--row-hover);
    }

    tr.recording {
        background-color: rgba(255, 62, 0, 0.1);
    }

    tr.inactive {
        opacity: 0.6;
        filter: grayscale(0.8);
    }

    td {
        padding: 16px 16px;
        color: var(--text-color);
        font-weight: 500;
        font-size: 0.95rem;
        text-align: left;
        vertical-align: middle;
    }

    .app-info {
        width: 30%;
    }

    .app-info-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .app-name {
        font-weight: 600;
        color: var(--header-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .icon-btn {
        background: transparent;
        border: none;
        padding: 4px;
        border-radius: 4px;
        color: var(--secondary-text);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        opacity: 0.5;
    }

    .icon-btn:hover:not(:disabled) {
        background: var(--hover-bg);
        opacity: 1;
    }

    .icon-btn.active {
        opacity: 1;
        color: var(--path-text);
    }

    .auto-record-btn.active {
        color: rgb(255, 62, 0);
    }

    .icon-btn:disabled {
        opacity: 0.1;
        cursor: not-allowed;
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
    }

    .controls {
        width: 30%;
        text-align: right;
    }

    /* Container for buttons to ensure they align right */
    .controls-wrapper {
        display: flex;
        gap: 12px;
        justify-content: flex-end; /* Align buttons to the right */
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
        gap: 8px;
        background: var(--control-bg);
        border: none;
        border-radius: 6px;
        padding: 10px 16px; /* Larger click area */
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--control-text);
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 110px; /* Ensure consistent button width */
        white-space: nowrap;
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
        background: var(--hover-bg);
        transform: translateY(-1px);
    }

    .record-btn.active {
        background: rgba(255, 62, 0, 0.8);
        box-shadow: 0 2px 10px rgba(255, 62, 0, 0.3);
        color: white; /* Force white text on active buttons */
    }

    .play-btn.active {
        background: rgba(100, 148, 237, 0.8);
        box-shadow: 0 2px 10px rgba(100, 148, 237, 0.3);
        color: white; /* Force white text on active buttons */
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
