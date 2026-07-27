// EasyWheel Browser Extension — background.js (MV3 Service Worker)
//
// Key constraints in MV3 service workers:
//   - navigator.userAgent is NOT available (use self.navigator or a try/catch)
//   - setInterval / setTimeout are cancelled when the service worker is suspended
//   - Global state resets every time Chrome wakes the service worker
//   - WebSocket connections do NOT persist across service worker lifetimes
//   - chrome.windows.* requires the "windows" permission in manifest.json
//
// Solution:
//   - Detect browser via self.navigator.userAgent (available) with a fallback
//   - Re-connect on every service worker wake-up (event listener registration)
//   - Use chrome.alarms (MV3 safe) for a periodic keep-alive ping
//   - Never rely on module-level socket state surviving more than one session

const HOST_PORT = 23436;
const HOST_URL  = `ws://127.0.0.1:${HOST_PORT}`;

let socket          = null;
let isConnected     = false;
let reconnectTimer  = null;
let reconnectDelay  = 1000;        // ms — start at 1 s
const MAX_DELAY     = 16000;       // ms — cap at 16 s

// ---------------------------------------------------------------------------
// Browser detection — safe in service workers via self.navigator
// ---------------------------------------------------------------------------
async function getBrowserName() {
    try {
        const ua = (self.navigator && self.navigator.userAgent) ? self.navigator.userAgent : "";

        if (ua.includes("Edg/"))                          return "edge";
        if (ua.includes("OPR/") || ua.includes("Opera/")) return "opera";

        // Brave exposes navigator.brave
        if (self.navigator && self.navigator.brave) {
            try {
                const isBrave = await self.navigator.brave.isBrave();
                if (isBrave) return "brave";
            } catch (_) { /* Brave check failed, continue */ }
        }

        return "chrome";
    } catch (e) {
        console.warn("[EasyWheel] getBrowserName failed:", e);
        return "chrome";
    }
}

// ---------------------------------------------------------------------------
// Tab list helpers
// ---------------------------------------------------------------------------
async function getTabsList() {
    try {
        const tabs = await chrome.tabs.query({});
        return tabs.map(tab => {
            let domain = "";
            if (tab.url) {
                try { domain = new URL(tab.url).hostname; } catch (_) {}
            }
            return {
                tabId:        tab.id,
                windowId:     tab.windowId,
                title:        tab.title        || "",
                url:          tab.url          || "",
                domain,
                active:       tab.active,
                lastAccessed: tab.lastAccessed || null,
            };
        });
    } catch (e) {
        console.error("[EasyWheel] Failed to query tabs:", e);
        return [];
    }
}

async function sendTabsUpdate() {
    if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN) return;

    try {
        const [browserName, tabs] = await Promise.all([getBrowserName(), getTabsList()]);
        socket.send(JSON.stringify({ type: "TABS_UPDATE", browser: browserName, tabs }));
    } catch (e) {
        console.error("[EasyWheel] Failed to send tab update:", e);
    }
}

// ---------------------------------------------------------------------------
// Send a message back to the host
// ---------------------------------------------------------------------------
function sendToHost(msg) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify(msg));
        } catch (e) {
            console.error("[EasyWheel] Failed to send to host:", e);
        }
    }
}

// ---------------------------------------------------------------------------
// Tab activation
// ---------------------------------------------------------------------------
async function activateTab(tabId, windowId) {
    // Step 1 — restore minimised window
    try {
        const win = await chrome.windows.get(windowId);
        console.log(`[EasyWheel] Window ${windowId} state: ${win.state}`);
        if (win.state === "minimized") {
            console.log("[EasyWheel] Restoring minimised window...");
            await chrome.windows.update(windowId, { state: "normal" });
        }
    } catch (e) {
        console.warn("[EasyWheel] Could not check window state:", e.message);
    }

    // Step 2 — Sequence A: activate tab → focus window
    try {
        console.log(`[EasyWheel] Sequence A — tabs.update(${tabId}) then windows.update(${windowId})`);
        const updatedTab = await chrome.tabs.update(tabId, { active: true });
        console.log("[EasyWheel] tabs.update result:", updatedTab);

        const updatedWin = await chrome.windows.update(windowId, { focused: true });
        console.log("[EasyWheel] windows.update result:", updatedWin);

        return { success: true };
    } catch (errA) {
        console.warn("[EasyWheel] Sequence A failed:", errA.message);

        // Step 3 — Sequence B fallback: focus window → activate tab
        try {
            console.log(`[EasyWheel] Sequence B — windows.update(${windowId}) then tabs.update(${tabId})`);
            const updatedWin = await chrome.windows.update(windowId, { focused: true });
            console.log("[EasyWheel] windows.update result:", updatedWin);

            const updatedTab = await chrome.tabs.update(tabId, { active: true });
            console.log("[EasyWheel] tabs.update result:", updatedTab);

            return { success: true };
        } catch (errB) {
            const msg = errB.message || String(errB);
            console.error("[EasyWheel] Both activation sequences failed:", msg);
            return { success: false, error: msg };
        }
    }
}

// ---------------------------------------------------------------------------
// WebSocket connection
// ---------------------------------------------------------------------------
function connectHost() {
    // Cancel any pending reconnect timer
    if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    // Close any stale socket
    if (socket) {
        try { socket.close(); } catch (_) {}
        socket = null;
    }

    isConnected = false;
    console.log("[EasyWheel] Attempting connection...");

    try {
        socket = new WebSocket(HOST_URL);
    } catch (e) {
        console.error("[EasyWheel] Failed to create WebSocket:", e.message);
        scheduleReconnect();
        return;
    }

    socket.onopen = async () => {
        console.log("[EasyWheel] Connected");
        isConnected    = true;
        reconnectDelay = 1000; // reset backoff on successful connect

        await sendTabsUpdate();
    };

    socket.onclose = (ev) => {
        if (isConnected) {
            console.log(`[EasyWheel] Disconnected (code=${ev.code} reason="${ev.reason}")`);
        }
        isConnected = false;
        socket      = null;
        scheduleReconnect();
    };

    socket.onerror = (ev) => {
        // onerror is always followed by onclose; just log it so the dev console
        // shows it clearly instead of an opaque "WebSocket error" default message.
        console.warn("[EasyWheel] WebSocket error (will reconnect)");
    };

    socket.onmessage = async (event) => {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            console.error("[EasyWheel] Received non-JSON message:", event.data);
            return;
        }

        console.log("[EasyWheel] Received from host:", data);

        if (data.type === "ACTIVATE_TAB") {
            const tabId    = parseInt(data.tabId,    10);
            const windowId = parseInt(data.windowId, 10);

            if (isNaN(tabId) || tabId <= 0 || isNaN(windowId) || windowId <= 0) {
                const err = `Invalid tabId=${data.tabId} or windowId=${data.windowId}`;
                console.error("[EasyWheel]", err);
                sendToHost({ type: "ACTIVATE_TAB_RESULT", success: false, error: err, tabId: data.tabId });
                return;
            }

            console.log(`[EasyWheel] Activating tab ${tabId} in window ${windowId}`);
            const result = await activateTab(tabId, windowId);

            if (result.success) {
                console.log("[EasyWheel] Tab activated successfully");
            } else {
                console.error("[EasyWheel] Activation failed:", result.error);
            }

            sendToHost({ type: "ACTIVATE_TAB_RESULT", ...result, tabId, windowId });
        }
    };
}

function scheduleReconnect() {
    const sec = (reconnectDelay / 1000).toFixed(0);
    console.log(`[EasyWheel] Retrying in ${sec} second${sec === "1" ? "" : "s"}...`);
    reconnectTimer  = setTimeout(connectHost, reconnectDelay);
    reconnectDelay  = Math.min(reconnectDelay * 2, MAX_DELAY);
}

// ---------------------------------------------------------------------------
// Keep-alive alarm (MV3-safe replacement for setInterval)
// Chrome may suspend the service worker between events. chrome.alarms
// guarantees periodic wakeup without relying on a live JS timer.
// ---------------------------------------------------------------------------
chrome.alarms.create("keepalive", { periodInMinutes: 0.4 }); // ~24 s

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "keepalive") {
        if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(JSON.stringify({ type: "PONG" }));
            } catch (_) {}
        } else if (!isConnected && !reconnectTimer) {
            // Service worker was woken up but socket is gone — reconnect
            connectHost();
        }
    }
});

// ---------------------------------------------------------------------------
// Tab / window event listeners — each event wakes the service worker
// and re-sends the current tab list
// ---------------------------------------------------------------------------
chrome.tabs.onCreated.addListener(() => sendTabsUpdate());
chrome.tabs.onRemoved.addListener(() => sendTabsUpdate());
chrome.tabs.onUpdated.addListener((_id, changeInfo) => {
    if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") {
        sendTabsUpdate();
    }
});
chrome.tabs.onActivated.addListener(() => sendTabsUpdate());
chrome.windows.onFocusChanged.addListener(() => sendTabsUpdate());

// ---------------------------------------------------------------------------
// Global unhandled rejection logger
// ---------------------------------------------------------------------------
self.addEventListener("unhandledrejection", (event) => {
    console.error("[EasyWheel] Unhandled promise rejection:", event.reason);
});

// ---------------------------------------------------------------------------
// Initial connection attempt when service worker first loads
// ---------------------------------------------------------------------------
connectHost();
