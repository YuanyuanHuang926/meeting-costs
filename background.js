// background.js

let meetingTimerIntervalId = null;

const initialMeetingState = {
    isRunning: false,
    startTime: 0,
    attendees: 1,
    avgHourlySalary: 0,
    expectedDurationMinutes: 0,
    currency: 'CHF',
    currencySymbol: 'CHF',
    costPerSecond: 0,
    elapsedSeconds: 0,
    currentCost: 0,
    projectedCost: 0,
    lastUpdateTime: 0
};
let meetingState = { ...initialMeetingState };
let currentLanguageSetting = 'en'; // Default language

const defaultCurrencySymbols = { 'CNY': '¥', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CHF': 'CHF' };

async function loadPersistentState() {
    try {
        // Load language setting (now stored under 'appSettings')
        const settingsData = await chrome.storage.sync.get('appSettings');
        if (settingsData.appSettings && settingsData.appSettings.language) {
            currentLanguageSetting = settingsData.appSettings.language;
        } else {
            // If no language setting, save default 'en'
            await chrome.storage.sync.set({ appSettings: { language: 'en' } });
            currentLanguageSetting = 'en';
        }
        console.log("[Background.js] Loaded language setting:", currentLanguageSetting);

        const meetingData = await chrome.storage.local.get('activeMeetingState');
        if (meetingData.activeMeetingState && meetingData.activeMeetingState.isRunning && meetingData.activeMeetingState.lastUpdateTime) {
            meetingState = meetingData.activeMeetingState;
            const now = Date.now();
            const elapsedSinceLastSave = Math.floor((now - meetingState.lastUpdateTime) / 1000);
            meetingState.elapsedSeconds += elapsedSinceLastSave;
            meetingState.currentCost += meetingState.costPerSecond * elapsedSinceLastSave;
            meetingState.projectedCost = meetingState.costPerSecond * (meetingState.expectedDurationMinutes * 60);
            startMeetingInterval();
            console.log("[Background.js] Resumed active meeting:", meetingState);
        } else {
            meetingState = { ...initialMeetingState, currency: 'CHF', currencySymbol: 'CHF' };
        }
    } catch (e) {
        console.error("[Background.js] Error loading persistent state:", e);
        meetingState = { ...initialMeetingState, currency: 'CHF', currencySymbol: 'CHF' };
        currentLanguageSetting = 'en';
    }
    // No initial broadcast here, popup will request data
}

// --- Meeting Timer Logic ---
function calculateMeetingCostPerSecond(attendees, avgHourlySalary) {
    if (avgHourlySalary <= 0 || attendees < 1) return 0;
    const costPerHourAllAttendees = avgHourlySalary * attendees;
    return costPerHourAllAttendees / 3600;
}

function updateMeetingTimer() {
    if (!meetingState.isRunning) return;
    meetingState.elapsedSeconds++;
    meetingState.currentCost += meetingState.costPerSecond;
    meetingState.lastUpdateTime = Date.now();
    chrome.storage.local.set({ activeMeetingState: meetingState });
    broadcastMeetingUpdate();
}

function startMeetingInterval() {
    if (meetingTimerIntervalId) clearInterval(meetingTimerIntervalId);
    if (meetingState.isRunning) {
        meetingTimerIntervalId = setInterval(updateMeetingTimer, 1000);
    }
}

function broadcastMeetingUpdate() {
    chrome.runtime.sendMessage({ type: "meetingStatusUpdate", data: { ...meetingState } }).catch(err => {
        if (err.message !== "Could not establish connection. Receiving end does not exist." &&
            err.message !== "The message port closed before a response was received.") {
            // console.warn("[Background.js] Error sending meeting update to popup:", err.message);
        }
    });
}

// --- Message Handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getMeetingTrackerUIData") {
        // Send current meeting state and language to popup
        sendResponse({ meetingState: { ...meetingState }, language: currentLanguageSetting });
    } else if (message.type === "languageChanged") { // Message from popup
        currentLanguageSetting = message.language;
        // Persist this change (optional, popup already saves it to sync)
        // chrome.storage.sync.set({ appSettings: { language: currentLanguageSetting } });
        console.log("[Background.js] Language setting updated by popup to:", currentLanguageSetting);
        sendResponse({ status: "Language update received by background" });
    } else if (message.type === "startMeetingTimer") {
        console.log("[Background.js] Start meeting timer request received:", message.data);
        if (meetingTimerIntervalId) clearInterval(meetingTimerIntervalId);

        meetingState.isRunning = true;
        meetingState.startTime = Date.now();
        meetingState.lastUpdateTime = meetingState.startTime;
        meetingState.attendees = message.data.attendees;
        meetingState.avgHourlySalary = message.data.avgHourlySalary;
        meetingState.expectedDurationMinutes = message.data.expectedDurationMinutes;
        meetingState.currency = message.data.currency;
        meetingState.currencySymbol = defaultCurrencySymbols[message.data.currency] || message.data.currency;
        meetingState.costPerSecond = calculateMeetingCostPerSecond(message.data.attendees, message.data.avgHourlySalary);
        meetingState.elapsedSeconds = 0;
        meetingState.currentCost = 0;
        meetingState.projectedCost = meetingState.costPerSecond * (message.data.expectedDurationMinutes * 60);

        chrome.storage.local.set({ activeMeetingState: meetingState });
        startMeetingInterval();
        broadcastMeetingUpdate();
        sendResponse({ status: "Meeting timer started", initialMeetingState: meetingState });
    } else if (message.type === "stopMeetingTimer") {
        console.log("[Background.js] Stop meeting timer request received.");
        if (meetingTimerIntervalId) clearInterval(meetingTimerIntervalId);
        meetingTimerIntervalId = null;
        meetingState.isRunning = false;
        meetingState.lastUpdateTime = Date.now();
        chrome.storage.local.set({ activeMeetingState: meetingState });
        broadcastMeetingUpdate();
        sendResponse({ status: "Meeting timer stopped", finalMeetingState: meetingState });
    }
    return true;
});

// --- Extension Lifecycle ---
chrome.runtime.onStartup.addListener(async () => {
    console.log("[Background.js] Extension started up. Loading persistent state.");
    await loadPersistentState();
});

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log("[Background.js] Extension installed or updated. Reason:", details.reason);
    if (details.reason === "install") {
        console.log("[Background.js] Performing first-time install setup.");
        // No options page to open, but set default language
        await chrome.storage.sync.set({ appSettings: { language: 'en' } });
        currentLanguageSetting = 'en';
        // Initialize meetingState with a default currency
        meetingState = { ...initialMeetingState, currency: 'CHF', currencySymbol: 'CHF' };
        await chrome.storage.local.set({ activeMeetingState: meetingState });
    } else {
      await loadPersistentState();
    }
});

// Initial load
loadPersistentState();
