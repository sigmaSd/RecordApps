<script lang="ts">
    const {
        appName,
        isPinned,
        autoRecord,
        autoListen,
        onTogglePin,
        onToggleAutoRecord,
        onToggleAutoListen,
        isActive = true,
    }: {
        appName: string;
        isPinned: boolean;
        autoRecord: boolean;
        autoListen: boolean;
        onTogglePin: () => void;
        onToggleAutoRecord: () => void;
        onToggleAutoListen: () => void;
        isActive?: boolean;
    } = $props();
</script>

<tr class="app-header-row" class:inactive={!isActive}>
    <td class="app-info" colspan="2">
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
            <button
                class="icon-btn auto-listen-btn"
                class:active={autoListen}
                onclick={onToggleAutoListen}
                disabled={!isPinned}
                title={autoListen
                    ? "Disable auto-monitor"
                    : "Enable auto-monitor"}
            >
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                        d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M16.5,12L10,16.5V7.5L16.5,12Z"
                    />
                </svg>
            </button>
            <span class="app-name" title={appName}>{appName}</span>
        </div>
    </td>
    <td class="controls-summary">
        <!-- Optional summary of active streams -->
    </td>
</tr>

<style>
    .app-header-row {
        background-color: var(--surface-color);
        border-bottom: 2px solid var(--border-color);
    }

    .app-header-row.inactive {
        opacity: 0.6;
        filter: grayscale(0.8);
    }

    td {
        padding: 12px 16px;
        vertical-align: middle;
    }

    .app-info-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .app-name {
        font-weight: 700;
        color: var(--header-text);
        font-size: 1.1rem;
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

    .auto-listen-btn.active {
        color: rgb(100, 148, 237);
    }

    .icon-btn:disabled {
        opacity: 0.1;
        cursor: not-allowed;
    }

    .controls-summary {
        text-align: right;
    }

    svg {
        fill: currentColor;
    }
</style>
