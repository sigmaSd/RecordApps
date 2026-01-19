<script lang="ts">
    import { fade, fly } from "svelte/transition";

    let { message, visible = $bindable(false) } = $props();

    $effect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                visible = false;
            }, 3000);
            return () => clearTimeout(timer);
        }
    });
</script>

{#if visible}
    <div
        class="toast"
        in:fly={{ y: 50, duration: 300 }}
        out:fade={{ duration: 200 }}
    >
        <div class="icon">
            <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                    d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                />
            </svg>
        </div>
        <div class="content">
            <div class="title">Recording Saved</div>
            <div class="message" title={message}>{message}</div>
        </div>
    </div>
{/if}

<style>
    .toast {
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: var(--surface-color, #222);
        color: var(--text-color, #e0e0e0);
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000;
        border: 1px solid var(--border-color, #333);
        max-width: 350px;
    }

    .icon {
        color: #4ec9b0;
        display: flex;
        align-items: center;
    }

    .icon svg {
        fill: currentColor;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: hidden;
    }

    .title {
        font-weight: 600;
        font-size: 0.9rem;
    }

    .message {
        font-size: 0.8rem;
        color: var(--secondary-text, #999);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
