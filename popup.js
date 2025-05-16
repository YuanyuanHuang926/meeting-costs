document.addEventListener('DOMContentLoaded', () => {
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

    const meetingCostProgressBarContainerEl = document.getElementById('meetingCostProgressBarContainer');
    const meetingCostProgressBarFillEl = document.getElementById('meetingCostProgressBarFill');
    const meetingCostProgressPercentageEl = document.getElementById('meetingCostProgressPercentage');

    const exceededMeetingCostContainerEl = document.getElementById('exceededMeetingCostContainer');
    const popupExceededMeetingCostEl = document.getElementById('popupExceededMeetingCost');

    const popupLanguageSelector = document.getElementById('popupLanguageSelector');
    const loadingMessageEl = document.getElementById('loadingMessage');

    let currentMessages = null;

    console.log("[Popup.js] DOMContentLoaded - Script loaded.");

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
        console.log("[Popup.js] updateMeetingTrackerUI called with state:", JSON.parse(JSON.stringify(meetingState || {})));

        const progressBarElementsExist = meetingCostProgressBarContainerEl && meetingCostProgressPercentageEl && meetingCostProgressBarFillEl;
        if (!progressBarElementsExist) {
            console.error("[Popup.js] One or more progress bar DOM elements are missing!");
        }
        const exceededCostElementsExist = exceededMeetingCostContainerEl && popupExceededMeetingCostEl;
         if (!exceededCostElementsExist) {
            console.error("[Popup.js] One or more exceeded cost DOM elements are missing!");
        }


        if (!meetingState) {
            popupMeetingElapsedTimeEl.textContent = formatElapsedTime(0);
            const initialCurrency = popupMeetingSalaryCurrencySelect.value || 'CHF';
            const initialSymbol = getMeetingCurrencySymbol(initialCurrency);
            popupCurrentMeetingCostEl.textContent = `${initialSymbol}0.00`;
            if(projectedMeetingCostContainerEl) projectedMeetingCostContainerEl.style.display = 'none';
            if(exceededCostElementsExist) exceededMeetingCostContainerEl.style.display = 'none';

            if (progressBarElementsExist) {
                meetingCostProgressBarContainerEl.style.display = 'none';
                meetingCostProgressPercentageEl.style.display = 'none';
            }

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

        if (meetingState.projectedCost > 0) {
            if (projectedMeetingCostContainerEl && popupProjectedMeetingCostEl) {
                popupProjectedMeetingCostEl.textContent = `${meetingSymbol}${meetingState.projectedCost.toFixed(2)}`;
                projectedMeetingCostContainerEl.style.display = 'block';
            }

            if (exceededCostElementsExist) {
                if (meetingState.currentCost > meetingState.projectedCost) {
                    const exceededAmount = meetingState.currentCost - meetingState.projectedCost;
                    popupExceededMeetingCostEl.textContent = `${meetingSymbol}${exceededAmount.toFixed(2)}`;
                    exceededMeetingCostContainerEl.style.display = 'block';
                } else {
                    exceededMeetingCostContainerEl.style.display = 'none';
                }
            }
        } else {
            if (projectedMeetingCostContainerEl) projectedMeetingCostContainerEl.style.display = 'none';
            if (exceededCostElementsExist) exceededMeetingCostContainerEl.style.display = 'none';
        }


        if (meetingState.isRunning) {
            console.log("[Popup.js] Meeting is running. Updating UI for running state.");
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

            if (progressBarElementsExist && meetingState.projectedCost > 0) {
                console.log("[Popup.js] Showing progress bar for running meeting.");
                meetingCostProgressBarContainerEl.style.display = 'block';
                meetingCostProgressPercentageEl.style.display = 'block';

                const progressPercentValue = (meetingState.currentCost / meetingState.projectedCost) * 100;
                const barFillPercent = Math.min(100, progressPercentValue);

                meetingCostProgressBarFillEl.style.width = `${barFillPercent}%`;
                meetingCostProgressPercentageEl.textContent = `${Math.round(progressPercentValue)}%`;

                if (progressPercentValue >= 85) {
                    meetingCostProgressBarFillEl.classList.add('warning');
                } else {
                    meetingCostProgressBarFillEl.classList.remove('warning');
                }
            } else {
                if (progressBarElementsExist) {
                    console.log("[Popup.js] Hiding progress bar (running, but no projected cost or elements missing).");
                    meetingCostProgressBarContainerEl.style.display = 'none';
                    meetingCostProgressPercentageEl.style.display = 'none';
                }
            }

        } else {
            console.log("[Popup.js] Meeting is NOT running. Updating UI for stopped state.");
            popupStartMeetingButton.style.display = 'inline-block';
            popupStopMeetingButton.style.display = 'none';
            popupMeetingAttendeesInput.disabled = false;
            popupMeetingAvgHourlySalaryInput.disabled = false;
            popupMeetingExpectedDurationInput.disabled = false;
            popupMeetingSalaryCurrencySelect.disabled = false;

            if (progressBarElementsExist && meetingState.elapsedSeconds > 0 && meetingState.projectedCost > 0) {
                 console.log("[Popup.js] Showing final progress bar for stopped meeting.");
                 meetingCostProgressBarContainerEl.style.display = 'block';
                 meetingCostProgressPercentageEl.style.display = 'block';
                 const progressPercentValue = (meetingState.currentCost / meetingState.projectedCost) * 100;
                 const barFillPercent = Math.min(100, progressPercentValue);

                 meetingCostProgressBarFillEl.style.width = `${barFillPercent}%`;
                 meetingCostProgressPercentageEl.textContent = `${Math.round(progressPercentValue)}%`;

                 if (progressPercentValue >= 85) {
                    meetingCostProgressBarFillEl.classList.add('warning');
                 } else {
                    meetingCostProgressBarFillEl.classList.remove('warning');
                 }
            } else {
                if (progressBarElementsExist) {
                    console.log("[Popup.js] Hiding progress bar (stopped, no history or elements missing).");
                    meetingCostProgressBarContainerEl.style.display = 'none';
                    meetingCostProgressPercentageEl.style.display = 'none';
                    meetingCostProgressBarFillEl.classList.remove('warning');
                }
            }
        }
    }

    async function fetchAndApplyLocalizedStrings(langCode) {
        console.log(`[Popup.js] Attempting to fetch messages for language: ${langCode}`);
        const messagesURL = chrome.runtime.getURL(`_locales/${langCode}/messages.json`);

        try {
            const response = await fetch(messagesURL);
            if (response.ok) {
                currentMessages = await response.json();
                console.log(`[Popup.js] Successfully fetched and parsed messages for ${langCode}.`);
            } else {
                console.warn(`[Popup.js] Failed to fetch messages for ${langCode}. Status: ${response.status}.`);
                currentMessages = null;
            }
        } catch (error) {
            console.error(`[Popup.js] Error fetching messages for ${langCode}:`, error);
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
                     console.warn(`[Popup.js] No translation for key: ${key} (lang ${langCode})`);
                }
            }

            if (translatedString) {
                if (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button') || el.tagName === 'BUTTON') {
                    el.value = translatedString;
                    el.textContent = translatedString;
                } else if (el.tagName === 'OPTION') {
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
        document.title = translatedPageTitle || "Meeting Cost Tracker";
    }

    async function loadLanguagePreferenceAndLocalize() {
        const data = await chrome.storage.sync.get('appSettings');
        const lang = (data.appSettings && data.appSettings.language) ? data.appSettings.language : 'en';
        if (popupLanguageSelector) popupLanguageSelector.value = lang;
        await fetchAndApplyLocalizedStrings(lang);
    }

    if (popupStartMeetingButton) {
        popupStartMeetingButton.addEventListener('click', () => {
            console.log("[Popup.js] Start Meeting button clicked.");
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
            console.log("[Popup.js] Sending startMeetingTimer message to background with data:", { attendees, avgHourlySalary, expectedDurationMinutes, currency });
            chrome.runtime.sendMessage({
                type: "startMeetingTimer",
                data: { attendees, avgHourlySalary, expectedDurationMinutes, currency }
            }, response => {
                if (chrome.runtime.lastError) {
                    console.error("[Popup.js] Error sending startMeetingTimer message:", chrome.runtime.lastError.message);
                } else {
                    console.log("[Popup.js] Background responded to startMeetingTimer:", response);
                }
            });
        });
    }


    if (popupStopMeetingButton) {
        popupStopMeetingButton.addEventListener('click', () => {
            console.log("[Popup.js] Stop Meeting button clicked.");
            chrome.runtime.sendMessage({ type: "stopMeetingTimer" }, response => {
                 if (chrome.runtime.lastError) {
                    console.error("[Popup.js] Error sending stopMeetingTimer message:", chrome.runtime.lastError.message);
                } else {
                    console.log("[Popup.js] Background responded to stopMeetingTimer:", response);
                }
            });
        });
    }

    if (popupLanguageSelector) {
        popupLanguageSelector.addEventListener('change', async (event) => {
            const newLanguage = event.target.value;
            console.log("[Popup.js] Language selected:", newLanguage);
            await chrome.storage.sync.set({ appSettings: { language: newLanguage } });
            chrome.runtime.sendMessage({ type: "languageChanged", language: newLanguage });
            await fetchAndApplyLocalizedStrings(newLanguage);
        });
    }


    async function initializePopup() {
        console.log("[Popup.js] Initializing popup...");
        if(loadingMessageEl) loadingMessageEl.style.display = 'block';
        await loadLanguagePreferenceAndLocalize();

        chrome.runtime.sendMessage({ type: "getMeetingTrackerUIData" }, (response) => {
            console.log("[Popup.js] Received getMeetingTrackerUIData response:", response);
            if (loadingMessageEl) loadingMessageEl.style.display = 'none';
            if (chrome.runtime.lastError) {
                console.error("[Popup.js] Error getting UI data from background:", chrome.runtime.lastError.message);
                updateMeetingTrackerUI(null);
                return;
            }
            if (response) {
                updateMeetingTrackerUI(response.meetingState);
            } else {
                console.warn("[Popup.js] No response or empty response for getMeetingTrackerUIData.");
                updateMeetingTrackerUI(null);
            }
        });
    }

    chrome.runtime.onMessage.addListener((message) => {
        console.log("[Popup.js] Message received from background:", message);
        if (message.type === "meetingStatusUpdate") {
            updateMeetingTrackerUI(message.data);
        }
        return true;
    });

    initializePopup();
});
