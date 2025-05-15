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
let currentLanguageSetting = 'en';

const defaultCurrencySymbols = { 'CNY': '¥', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CHF': 'CHF' };

async function loadPersistentState() {
    try {
        const settingsData = await chrome.storage.sync.get('appSettings');
        if (settingsData.appSettings && settingsData.appSettings.language) {
            currentLanguageSetting = settingsData.appSettings.language;
        } else {
            await chrome.storage.sync.set({ appSettings: { language: 'en' } });
            currentLanguageSetting = 'en';
        }

        const meetingData = await chrome.storage.local.get('activeMeetingState');
        if (meetingData.activeMeetingState && meetingData.activeMeetingState.isRunning && meetingData.activeMeetingState.lastUpdateTime) {
            meetingState = meetingData.activeMeetingState;
            const now = Date.now();
            const elapsedSinceLastSave = Math.floor((now - meetingState.lastUpdateTime) / 1000);
            meetingState.elapsedSeconds += elapsedSinceLastSave;
            meetingState.currentCost += meetingState.costPerSecond * elapsedSinceLastSave;
            meetingState.projectedCost = meetingState.costPerSecond * (meetingState.expectedDurationMinutes * 60);
            startMeetingInterval();
        } else {
            meetingState = { ...initialMeetingState, currency: 'CHF', currencySymbol: 'CHF' };
        }
    } catch (e) {
        meetingState = { ...initialMeetingState, currency: 'CHF', currencySymbol: 'CHF' };
        currentLanguageSetting = 'en';
    }
}

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
            console.warn("[Background.js] Error sending meeting update to popup:", err.message);
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getMeetingTrackerUIData") {
        sendResponse({ meetingState: { ...meetingState }, language: currentLanguageSetting });
    } else if (message.type === "languageChanged") {
        currentLanguageSetting = message.language;
        sendResponse({ status: "Language update received by background" });
    } else if (message.type === "startMeetingTimer") {
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
        sendResponse({ status: "Meeting timer started", initialMeetingState: { ...meetingState } }); // Send a copy
    } else if (message.type === "stopMeetingTimer") {
        if (meetingTimerIntervalId) clearInterval(meetingTimerIntervalId);
        meetingTimerIntervalId = null;
        meetingState.isRunning = false;
        meetingState.lastUpdateTime = Date.now();
        chrome.storage.local.set({ activeMeetingState: meetingState });
        broadcastMeetingUpdate();
        sendResponse({ status: "Meeting timer stopped", finalMeetingState: { ...meetingState } });
    }
    return true;
});

chrome.runtime.onStartup.addListener(async () => {
    await loadPersistentState();
});

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        await chrome.storage.sync.set({ appSettings: { language: 'en' } });
        currentLanguageSetting = 'en';
        meetingState = { ...initialMeetingState, currency: 'CHF', currencySymbol: 'CHF' };
        await chrome.storage.local.set({ activeMeetingState: meetingState });
    } else {
      await loadPersistentState();
    }
});

loadPersistentState();
