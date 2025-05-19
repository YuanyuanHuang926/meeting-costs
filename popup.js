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
    const meetingCostProgressBarBudgetEl = document.getElementById('meetingCostProgressBarBudget');
    const meetingCostProgressBarExceededEl = document.getElementById('meetingCostProgressBarExceeded');
    const meetingCostProgressPercentageEl = document.getElementById('meetingCostProgressPercentage');

    const exceededMeetingCostContainerEl = document.getElementById('exceededMeetingCostContainer');
    const popupExceededMeetingCostEl = document.getElementById('popupExceededMeetingCost');

    const popupLanguageSelector = document.getElementById('popupLanguageSelector');
    const loadingMessageEl = document.getElementById('loadingMessage');
    let currentMessages = null;

    console.log("[Popup.js] DOMContentLoaded - Script loaded.");

    function getMeetingCurrencySymbol(currencyCode) {
        const selectedOption = popupMeetingSalaryCurrencySelect.querySelector(`option[value="${currencyCode}"]`);
        if (selectedOption && selectedOption.dataset.symbol) return selectedOption.dataset.symbol;
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

        const progressBarElementsExist = meetingCostProgressBarContainerEl && meetingCostProgressPercentageEl && meetingCostProgressBarBudgetEl && meetingCostProgressBarExceededEl;
        if (!progressBarElementsExist) console.error("[Popup.js] One or more progress bar DOM elements are missing!");

        const exceededCostElementsExist = exceededMeetingCostContainerEl && popupExceededMeetingCostEl;
        if (!exceededCostElementsExist) console.error("[Popup.js] One or more exceeded cost DOM elements are missing!");

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

        if (progressBarElementsExist && meetingState.projectedCost > 0) {
            meetingCostProgressBarContainerEl.style.display = 'block';
            meetingCostProgressPercentageEl.style.display = 'block';

            const currentCost = meetingState.currentCost || 0;
            const projectedCost = meetingState.projectedCost;
            const overallPercentage = (currentCost / projectedCost) * 100;
            meetingCostProgressPercentageEl.textContent = `${Math.round(overallPercentage)}%`;

            meetingCostProgressBarBudgetEl.classList.remove('warning', 'normal');
            meetingCostProgressBarExceededEl.style.width = '0%';

            if (currentCost <= projectedCost) {
                const budgetFillPercent = overallPercentage;
                meetingCostProgressBarBudgetEl.style.width = `${Math.min(100, budgetFillPercent)}%`;
                if (budgetFillPercent >= 85) {
                    meetingCostProgressBarBudgetEl.classList.add('warning');
                } else {
                    meetingCostProgressBarBudgetEl.classList.add('normal');
                }
            } else {
                const greenPartVisualWidth = (projectedCost / currentCost) * 100;
                const redPartVisualWidth = ((currentCost - projectedCost) / currentCost) * 100;

                meetingCostProgressBarBudgetEl.style.width = `${greenPartVisualWidth}%`;
                meetingCostProgressBarBudgetEl.classList.add('normal');

                meetingCostProgressBarExceededEl.style.width = `${redPartVisualWidth}%`;
            }
        } else if (progressBarElementsExist) {
            meetingCostProgressBarContainerEl.style.display = 'none';
            meetingCostProgressPercentageEl.style.display = 'none';
        }


        if (meetingState.isRunning) {
            console.log("[Popup.js] Meeting is running.");
            popupStartMeetingButton.style.display = 'none';
            popupStopMeetingButton.style.display = 'inline-block';
            popupMeetingAttendeesInput.disabled = true;
        } else {
            console.log("[Popup.js] Meeting is NOT running.");
            popupStartMeetingButton.style.display = 'inline-block';
            popupStopMeetingButton.style.display = 'none';
            popupMeetingAttendeesInput.disabled = false;
        }
    }

    async function fetchAndApplyLocalizedStrings(langCode) {
        console.log(`[Popup.js] Attempting to fetch messages for language: ${langCode}`);
        const messagesURL = chrome.runtime.getURL(`_locales/${langCode}/messages.json`);
        try {
            const response = await fetch(messagesURL);
            if (response.ok) currentMessages = await response.json();
            else currentMessages = null;
        } catch (error) { currentMessages = null; }
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            let translatedString = (currentMessages && currentMessages[key]) ? currentMessages[key].message : chrome.i18n.getMessage(key);
            if (translatedString) {
                if (el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit'))) el.textContent = el.value = translatedString;
                else if (el.tagName === 'OPTION') el.textContent = translatedString;
                else el.textContent = translatedString;
            }
        });
        const pageTitleKey = "meetingCostTrackerPopupTitle";
        document.title = (currentMessages && currentMessages[pageTitleKey]) ? currentMessages[pageTitleKey].message : chrome.i18n.getMessage(pageTitleKey) || "Meeting Cost Tracker";
    }

    async function loadLanguagePreferenceAndLocalize() {
        const data = await chrome.storage.sync.get('appSettings');
        const lang = (data.appSettings && data.appSettings.language) ? data.appSettings.language : 'en';
        if (popupLanguageSelector) popupLanguageSelector.value = lang;
        await fetchAndApplyLocalizedStrings(lang);
    }

    if (popupStartMeetingButton) {
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
                alert((currentMessages && currentMessages[errorKey]) ? currentMessages[errorKey].message : chrome.i18n.getMessage(errorKey) || "Invalid input.");
                return;
            }
            chrome.runtime.sendMessage({ type: "startMeetingTimer", data: { attendees, avgHourlySalary, expectedDurationMinutes, currency } },
                response => { if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message); else console.log(response); });
        });
    }

    if (popupStopMeetingButton) {
        popupStopMeetingButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: "stopMeetingTimer" },
                response => { if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message); else console.log(response); });
        });
    }

    if (popupLanguageSelector) {
        popupLanguageSelector.addEventListener('change', async (event) => {
            const newLanguage = event.target.value;
            await chrome.storage.sync.set({ appSettings: { language: newLanguage } });
            chrome.runtime.sendMessage({ type: "languageChanged", language: newLanguage });
            await fetchAndApplyLocalizedStrings(newLanguage);
        });
    }

    async function initializePopup() {
        if(loadingMessageEl) loadingMessageEl.style.display = 'block';
        await loadLanguagePreferenceAndLocalize();
        chrome.runtime.sendMessage({ type: "getMeetingTrackerUIData" }, (response) => {
            if (loadingMessageEl) loadingMessageEl.style.display = 'none';
            if (chrome.runtime.lastError) { updateMeetingTrackerUI(null); return; }
            if (response) updateMeetingTrackerUI(response.meetingState);
            else updateMeetingTrackerUI(null);
        });
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "meetingStatusUpdate") updateMeetingTrackerUI(message.data);
        return true;
    });

    initializePopup();
});
