let socket = null;
let isConnected = false;
let reconnectTimer = null;
let heartbeatInterval = null;
let cachedTabs = [];

async function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Edg/") > -1) {
        return "edge";
    }
    if (ua.indexOf("OPR/") > -1 || ua.indexOf("Opera/") > -1) {
        return "opera";
    }
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
        try {
            const isBrave = await navigator.brave.isBrave();
            if (isBrave) return "brave";
        } catch (e) {
            // Ignore
        }
    }
    return "chrome";
}

async function getTabsList() {
    try {
        const tabs = await chrome.tabs.query({});
        return tabs.map(tab => {
            let domain = "";
            if (tab.url) {
                try {
                    const urlObj = new URL(tab.url);
                    domain = urlObj.hostname;
                } catch (e) {}
            }
            
            return {
                tabId: tab.id,
                windowId: tab.windowId,
                title: tab.title || "",
                url: tab.url || "",
                domain: domain,
                active: tab.active,
                lastAccessed: tab.lastAccessed || null
            };
        });
    } catch (e) {
        console.error("Failed to query tabs:", e);
        return [];
    }
}

async function updateAndSendTabs() {
    cachedTabs = await getTabsList();
    if (!isConnected || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    const browserName = await getBrowserName();
    const payload = {
        type: "TABS_UPDATE",
        browser: browserName,
        tabs: cachedTabs
    };
    
    try {
        socket.send(JSON.stringify(payload));
    } catch (e) {
        console.error("Failed to send tabs update to host:", e);
    }
}

function sendResponse(msg) {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify(msg));
        } catch (e) {
            console.error("Failed to send response to host:", e);
        }
    }
}

function connectHost() {
    if (socket) {
        try {
            socket.close();
        } catch (e) {}
    }
    
    console.log("Connecting to EasyWheel Host...");
    socket = new WebSocket("ws://127.0.0.1:23436");
    
    socket.onopen = async () => {
        console.log("Connected to EasyWheel Host WebSocket server");
        isConnected = true;
        
        // Push initial tab state
        await updateAndSendTabs();
        
        // Start heartbeat to keep connection alive and prevent service worker termination
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "PONG" }));
            }
        }, 20000);
    };
    
    socket.onclose = () => {
        console.log("Disconnected from EasyWheel Host. Reconnecting in 5 seconds...");
        isConnected = false;
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        scheduleReconnect();
    };
    
    socket.onerror = (err) => {
        console.error("WebSocket error:", err);
    };
    
    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log("Received command from host:", data);
            
            if (data.type === "ACTIVATE_TAB") {
                const tabId = parseInt(data.tabId, 10);
                const windowId = parseInt(data.windowId, 10);
                
                console.log(`[Activation] Matched Tab ID: ${tabId}, Matched Window ID: ${windowId}`);
                
                if (isNaN(tabId) || isNaN(windowId)) {
                    const errStr = "Invalid Tab ID or Window ID received";
                    console.error(`[Activation] Error: ${errStr}`);
                    sendResponse({
                        type: "ACTIVATE_TAB_RESULT",
                        success: false,
                        error: errStr,
                        tabId: data.tabId,
                        windowId: data.windowId
                    });
                    return;
                }

                try {
                    // Check if window is minimized and restore it first
                    const win = await chrome.windows.get(windowId);
                    console.log(`[Activation] Current window state: ${win.state}`);
                    if (win.state === "minimized") {
                        console.log("[Activation] Window is minimized, restoring to normal state");
                        await chrome.windows.update(windowId, { state: "normal" });
                    }
                } catch (e) {
                    console.warn("[Activation] Failed to check/restore window state before activation:", e);
                }

                // Sequence A: tabs.update() -> windows.update()
                try {
                    console.log(`[Activation] Attempting Sequence A: tabs.update(${tabId}) -> windows.update(${windowId})`);
                    
                    const tabRes = await chrome.tabs.update(tabId, { active: true });
                    console.log("[Activation] chrome.tabs.update result:", tabRes);
                    console.log("[Activation] Tab activated successfully");
                    
                    const winRes = await chrome.windows.update(windowId, { focused: true });
                    console.log("[Activation] chrome.windows.update result:", winRes);
                    console.log("[Activation] Window focused successfully");
                    
                    sendResponse({
                        type: "ACTIVATE_TAB_RESULT",
                        success: true,
                        tabId: tabId,
                        windowId: windowId
                    });
                } catch (errA) {
                    console.warn("[Activation] Sequence A failed:", errA);
                    
                    // Fallback to Sequence B: windows.update() -> tabs.update()
                    try {
                        console.log(`[Activation] Attempting Sequence B: windows.update(${windowId}) -> tabs.update(${tabId})`);
                        
                        const winRes = await chrome.windows.update(windowId, { focused: true });
                        console.log("[Activation] chrome.windows.update result:", winRes);
                        console.log("[Activation] Window focused successfully");
                        
                        const tabRes = await chrome.tabs.update(tabId, { active: true });
                        console.log("[Activation] chrome.tabs.update result:", tabRes);
                        console.log("[Activation] Tab activated successfully");
                        
                        sendResponse({
                            type: "ACTIVATE_TAB_RESULT",
                            success: true,
                            tabId: tabId,
                            windowId: windowId
                        });
                    } catch (errB) {
                        let errMsg = errB.message || String(errB);
                        if (chrome.runtime.lastError) {
                            errMsg += ` (lastError: ${chrome.runtime.lastError.message})`;
                        }
                        
                        console.error("[Activation] Browser API errors:", errMsg);
                        
                        sendResponse({
                            type: "ACTIVATE_TAB_RESULT",
                            success: false,
                            error: errMsg,
                            tabId: tabId,
                            windowId: windowId
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    };
}

function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectHost, 5000);
}

// Global listener for unhandled promise rejections
self.addEventListener("unhandledrejection", (event) => {
    console.error("[Unhandled Promise Rejection]:", event.reason);
});

// Register listeners for tab and window events
chrome.tabs.onCreated.addListener(() => updateAndSendTabs());
chrome.tabs.onRemoved.addListener(() => updateAndSendTabs());
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") {
        updateAndSendTabs();
    }
});
chrome.tabs.onActivated.addListener(() => updateAndSendTabs());
chrome.windows.onFocusChanged.addListener(() => updateAndSendTabs());

// Initial connection
connectHost();
