// popup.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements for Live Meeting Cost Tracker
    const popupMeetingAttendeesInput = document.getElementById('popupMeetingAttendees');
    const popupMeetingAvgHourlySalaryInput = document.getElementById('popupMeetingAvgHourlySalary');
    const popupMeetingExpectedDurationInput = document.getElementById('popupMeetingExpectedDuration');
    const popupMeetingSalaryCurrencySelect = document.getElementById('popupMeetingSalaryCurrency');
    const popupStartMeetingButton = document.getElementById('popupStartMeetingButton');
    const popupStopMeetingButton = document.getElementById('popupStopMeetingButton');
    const popupMeetingElapsedTimeEl = document.getElementById('popupMeetingElapsedTime');
    const popupCurrentMeetingCostEl = document.getElementById('popupCurrentMeetingCost');
    const projectedMeetingCostContainerEl = document.getElementById('projectedMeetingCostContainer');
    const popupProjectedMeetingCostEl = document.getElementById('popupProjectedMeetingCost');

    const popupLanguageSelector = document.getElementById('popupLanguageSelector'); // New
    const loadingMessageEl = document.getElementById('loadingMessage');

    let currentMessages = null; // To store fetched messages for the current language

    function getMeetingCurrencySymbol(currencyCode) {
        const selectedOption = popupMeetingSalaryCurrencySelect.querySelector(`option[value="${currencyCode}"]`);
        if (selectedOption && selectedOption.dataset.symbol) {
            return selectedOption.dataset.symbol;
        }
        const symbols = { 'CNY': '¥', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CHF': 'CHF' };
        return symbols[currencyCode] || currencyCode;
    }

    function formatElapsedTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateMeetingTrackerUI(meetingState) {
        if (!meetingState) {
            popupMeetingElapsedTimeEl.textContent = formatElapsedTime(0);
            const initialCurrency = popupMeetingSalaryCurrencySelect.value;
            const initialSymbol = getMeetingCurrencySymbol(initialCurrency);
            popupCurrentMeetingCostEl.textContent = `${initialSymbol}0.00`;
            projectedMeetingCostContainerEl.style.display = 'none';
            popupStartMeetingButton.style.display = 'inline-block';
            popupStopMeetingButton.style.display = 'none';
            popupMeetingAttendeesInput.disabled = false;
            popupMeetingAvgHourlySalaryInput.disabled = false;
            popupMeetingExpectedDurationInput.disabled = false;
            popupMeetingSalaryCurrencySelect.disabled = false;
            return;
        }

        const meetingSymbol = getMeetingCurrencySymbol(meetingState.currency);

        if (popupMeetingElapsedTimeEl) popupMeetingElapsedTimeEl.textContent = formatElapsedTime(meetingState.elapsedSeconds || 0);
        if (popupCurrentMeetingCostEl) popupCurrentMeetingCostEl.textContent = `${meetingSymbol}${(meetingState.currentCost || 0).toFixed(2)}`;

        if (meetingState.isRunning) {
            popupStartMeetingButton.style.display = 'none';
            popupStopMeetingButton.style.display = 'inline-block';
            popupMeetingAttendeesInput.disabled = true;
            popupMeetingAvgHourlySalaryInput.disabled = true;
            popupMeetingExpectedDurationInput.disabled = true;
            popupMeetingSalaryCurrencySelect.disabled = true;

            if(meetingState.attendees) popupMeetingAttendeesInput.value = meetingState.attendees;
            if(meetingState.avgHourlySalary) popupMeetingAvgHourlySalaryInput.value = meetingState.avgHourlySalary;
            if(meetingState.expectedDurationMinutes) popupMeetingExpectedDurationInput.value = meetingState.expectedDurationMinutes;
            if(meetingState.currency) popupMeetingSalaryCurrencySelect.value = meetingState.currency;

            if (projectedMeetingCostContainerEl && popupProjectedMeetingCostEl && meetingState.projectedCost > 0) {
                popupProjectedMeetingCostEl.textContent = `${meetingSymbol}${meetingState.projectedCost.toFixed(2)}`;
                projectedMeetingCostContainerEl.style.display = 'block';
            } else if (projectedMeetingCostContainerEl) {
                projectedMeetingCostContainerEl.style.display = 'none';
            }

        } else {
            popupStartMeetingButton.style.display = 'inline-block';
            popupStopMeetingButton.style.display = 'none';
            popupMeetingAttendeesInput.disabled = false;
            popupMeetingAvgHourlySalaryInput.disabled = false;
            popupMeetingExpectedDurationInput.disabled = false;
            popupMeetingSalaryCurrencySelect.disabled = false;
            if (projectedMeetingCostContainerEl) projectedMeetingCostContainerEl.style.display = 'none';
        }
    }

    async function fetchAndApplyLocalizedStrings(langCode) {
        console.log(`[Popup.js] Attempting to fetch messages for language: ${langCode}`);
        const messagesURL = chrome.runtime.getURL(`_locales/${langCode}/messages.json`);

        try {
            const response = await fetch(messagesURL);
            if (response.ok) {
                currentMessages = await response.json();
                console.log(`[Popup.js] Successfully fetched and parsed messages for ${langCode}:`, currentMessages);
            } else {
                console.warn(`[Popup.js] Failed to fetch messages for ${langCode}. Status: ${response.status}. Falling back to chrome.i18n.getMessage().`);
                currentMessages = null;
            }
        } catch (error) {
            console.error(`[Popup.js] Error fetching messages for ${langCode}:`, error, ". Falling back to chrome.i18n.getMessage().");
            currentMessages = null;
        }

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            let translatedString = "";

            if (currentMessages && currentMessages[key] && currentMessages[key].message) {
                translatedString = currentMessages[key].message;
            } else {
                translatedString = chrome.i18n.getMessage(key);
                if (!translatedString && key) {
                     console.warn(`[Popup.js] No translation for key: ${key} (using fallback i18n API or key missing for lang ${langCode})`);
                }
            }

            if (translatedString) {
                if (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button') || el.tagName === 'BUTTON') {
                    el.value = translatedString;
                    el.textContent = translatedString;
                } else if (el.tagName === 'OPTION') {
                    // For option elements, we set textContent for the display name of the language
                    // The value attribute should remain the language code (e.g., "en", "de")
                    el.textContent = translatedString;
                }
                else {
                    el.textContent = translatedString;
                }
            }
        });

        const pageTitleKey = "meetingCostTrackerPopupTitle";
        let translatedPageTitle = "";
        if (currentMessages && currentMessages[pageTitleKey] && currentMessages[pageTitleKey].message) {
            translatedPageTitle = currentMessages[pageTitleKey].message;
        } else {
            translatedPageTitle = chrome.i18n.getMessage(pageTitleKey);
        }
        if (translatedPageTitle) {
            document.title = translatedPageTitle;
        } else {
             console.warn(`[Popup.js] No translation found for page title key: ${pageTitleKey}`);
             document.title = "Meeting Cost Tracker"; // Fallback title
        }
    }

    async function loadLanguagePreferenceAndLocalize() {
        const data = await chrome.storage.sync.get('appSettings'); // Changed storage key
        const lang = (data.appSettings && data.appSettings.language) ? data.appSettings.language : 'en';
        popupLanguageSelector.value = lang;
        await fetchAndApplyLocalizedStrings(lang);
    }

    // --- Event Listeners for Meeting Tracker ---
    popupStartMeetingButton.addEventListener('click', () => {
        const attendees = parseInt(popupMeetingAttendeesInput.value);
        const avgHourlySalary = parseFloat(popupMeetingAvgHourlySalaryInput.value);
        const expectedDurationMinutes = parseInt(popupMeetingExpectedDurationInput.value);
        const currency = popupMeetingSalaryCurrencySelect.value;

        let errorKey = null;
        if (isNaN(attendees) || attendees < 1) errorKey = "invalidAttendees";
        else if (isNaN(avgHourlySalary) || avgHourlySalary <= 0) errorKey = "invalidAvgHourlySalary";
        else if (isNaN(expectedDurationMinutes) || expectedDurationMinutes < 1) errorKey = "invalidExpectedDuration";

        if (errorKey) {
            const errorMessage = (currentMessages && currentMessages[errorKey]) ? currentMessages[errorKey].message : chrome.i18n.getMessage(errorKey);
            alert(errorMessage || "Invalid input.");
            return;
        }
        chrome.runtime.sendMessage({
            type: "startMeetingTimer",
            data: { attendees, avgHourlySalary, expectedDurationMinutes, currency }
        });
    });

    popupStopMeetingButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "stopMeetingTimer" });
    });

    // --- Language Selector Logic ---
    popupLanguageSelector.addEventListener('change', async (event) => {
        const newLanguage = event.target.value;
        console.log("[Popup.js] Language selected:", newLanguage);
        // Save the new language preference
        await chrome.storage.sync.set({ appSettings: { language: newLanguage } });
        // Notify background script
        chrome.runtime.sendMessage({ type: "languageChanged", language: newLanguage });
        // Re-fetch and apply translations to the current popup view
        await fetchAndApplyLocalizedStrings(newLanguage);
    });


    // --- Initial Load and Message Handling ---
    async function initializePopup() {
        if(loadingMessageEl) loadingMessageEl.style.display = 'block';
        await loadLanguagePreferenceAndLocalize(); // Load language and initial strings

        chrome.runtime.sendMessage({ type: "getMeetingTrackerUIData" }, (response) => {
            if (loadingMessageEl) loadingMessageEl.style.display = 'none';
            if (chrome.runtime.lastError) {
                console.error("[Popup.js] Error getting UI data from background:", chrome.runtime.lastError.message);
                updateMeetingTrackerUI(null); // Initialize meeting UI to default
                return;
            }
            if (response) {
                updateMeetingTrackerUI(response.meetingState);
            } else {
                updateMeetingTrackerUI(null);
            }
        });
    }


    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "meetingStatusUpdate") {
            updateMeetingTrackerUI(message.data);
        }
        return true;
    });

    initializePopup(); // Call the main initialization function
});
