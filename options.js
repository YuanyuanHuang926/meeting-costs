document.addEventListener('DOMContentLoaded', () => {
    const monthlySalaryInput = document.getElementById('monthlySalary');
    const annualBonusInput = document.getElementById('annualBonus');
    const incomeCurrencySelect = document.getElementById('incomeCurrency');
    const displayCurrencySelect = document.getElementById('displayCurrency');
    const workdaysPerWeekSelect = document.getElementById('workdaysPerWeek');
    const workingHoursStartInput = document.getElementById('workingHoursStart');
    const workingHoursEndInput = document.getElementById('workingHoursEnd');
    const lunchBreakHoursInput = document.getElementById('lunchBreakHours');
    const saveButton = document.getElementById('saveSettings');
    const languageSelector = document.getElementById('languageSelector');
    const statusMessageEl = document.getElementById('statusMessage');
    const monthlySalaryCurrencySymbolEl = document.getElementById('monthlySalaryCurrencySymbol');
    const annualBonusCurrencySymbolEl = document.getElementById('annualBonusCurrencySymbol');

    const meetingAttendeesInput = document.getElementById('meetingAttendees');
    const meetingAvgSalaryInput = document.getElementById('meetingAvgSalary');
    const meetingSalaryCurrencySelect = document.getElementById('meetingSalaryCurrency');
    const startMeetingTimerButton = document.getElementById('startMeetingTimerButton');
    const stopMeetingTimerButton = document.getElementById('stopMeetingTimerButton');
    const meetingElapsedTimeEl = document.getElementById('meetingElapsedTime');
    const currentMeetingCostValueEl = document.getElementById('currentMeetingCostValue');

    let openedDueToInstallFlag = false;
    let currentMessages = null;
    let meetingTimerInterval = null;
    let meetingSecondsElapsed = 0;
    let meetingCostPerSecond = 0;
    let currentMeetingTotalCost = 0;
    let meetingCurrencySymbol = 'CHF';


    const optionPageDefaultSettings = {
        monthlySalary: 50000,
        annualBonus: 10000,
        incomeCurrency: 'CHF',
        displayCurrency: 'CHF',
        workdaysPerWeek: 5,
        workingHoursStart: '09:00',
        workingHoursEnd: '17:30',
        lunchBreakHours: 1,
        language: 'en'
    };

    chrome.storage.local.get('openedOptionsDueToInstall', (data) => {
        if (data.openedOptionsDueToInstall === true) {
            openedDueToInstallFlag = true;
        }
    });

    function updateInputCurrencySymbols(currencyCode) {
        const selectedOption = incomeCurrencySelect.querySelector(`option[value="${currencyCode}"]`);
        const symbol = selectedOption ? (selectedOption.dataset.symbol || currencyCode) : currencyCode;
        if (monthlySalaryCurrencySymbolEl) monthlySalaryCurrencySymbolEl.textContent = symbol;
        if (annualBonusCurrencySymbolEl) annualBonusCurrencySymbolEl.textContent = symbol;
    }

    function saveOptions(languageJustChanged = false) {
        const settingsToSave = {
            monthlySalary: parseFloat(monthlySalaryInput.value) || 0,
            annualBonus: parseFloat(annualBonusInput.value) || 0,
            incomeCurrency: incomeCurrencySelect.value,
            displayCurrency: displayCurrencySelect.value,
            workdaysPerWeek: parseInt(workdaysPerWeekSelect.value),
            workingHoursStart: workingHoursStartInput.value,
            workingHoursEnd: workingHoursEndInput.value,
            lunchBreakHours: parseFloat(lunchBreakHoursInput.value) || 0,
            language: languageSelector.value
        };

        chrome.storage.sync.set({ paydaySettings: settingsToSave }, () => {
            let messageKey = "settingsSaved";
            let messageDuration = 3000;

            if (openedDueToInstallFlag && !languageJustChanged) {
                messageKey = "settingsSavedFirstTime";
                messageDuration = 6000;
                chrome.storage.local.remove('openedOptionsDueToInstall', () => {
                });
                openedDueToInstallFlag = false;
            }

            let clearMessageTimeout;
            if (!languageJustChanged) {
                const messageText = (currentMessages && currentMessages[messageKey]) ?
                                    currentMessages[messageKey].message :
                                    chrome.i18n.getMessage(messageKey);
                statusMessageEl.textContent = messageText ||
                                              (messageKey === "settingsSavedFirstTime" ?
                                              'Settings saved! Click the extension icon in your toolbar to start.' :
                                              'Settings saved!');

                clearMessageTimeout = setTimeout(() => {
                    statusMessageEl.textContent = '';
                }, messageDuration);
            }

            chrome.runtime.sendMessage({ type: "settingsUpdated" }, response => {
                if (chrome.runtime.lastError) {
                    console.warn("[Options.js] Could not send settingsUpdated message to background:", chrome.runtime.lastError.message);
                } else {
                    console.log("[Options.js] Background script notified of settings update.");
                }

                if (languageJustChanged) {
                    if (clearMessageTimeout) clearTimeout(clearMessageTimeout);
                    console.log("[Options.js] Language changed, reloading page...");
                    window.location.reload();
                }
            });
        });
    }

    function loadOptions() {
        chrome.storage.sync.get('paydaySettings', (data) => {
            const currentSettings = data.paydaySettings || optionPageDefaultSettings;
            monthlySalaryInput.value = currentSettings.monthlySalary;
            annualBonusInput.value = currentSettings.annualBonus;
            incomeCurrencySelect.value = currentSettings.incomeCurrency;
            displayCurrencySelect.value = currentSettings.displayCurrency;
            workdaysPerWeekSelect.value = currentSettings.workdaysPerWeek;
            workingHoursStartInput.value = currentSettings.workingHoursStart;
            workingHoursEndInput.value = currentSettings.workingHoursEnd;
            lunchBreakHoursInput.value = currentSettings.lunchBreakHours;
            languageSelector.value = currentSettings.language;

            updateInputCurrencySymbols(currentSettings.incomeCurrency);
            fetchAndApplyLocalizedStrings(currentSettings.language);
        });
    }

    async function fetchAndApplyLocalizedStrings(langCode) {
        const messagesURL = chrome.runtime.getURL(`_locales/${langCode}/messages.json`);
        let messagesToUse = null;

        try {
            const response = await fetch(messagesURL);
            if (response.ok) {
                currentMessages = await response.json();
                messagesToUse = currentMessages;
                console.log(`[Options.js] Successfully fetched and parsed messages for ${langCode}:`, messagesToUse);
            } else {
                console.warn(`[Options.js] Failed to fetch messages for ${langCode}. Status: ${response.status}. Falling back to chrome.i18n.getMessage().`);
            }
        } catch (error) {
            console.error(`[Options.js] Error fetching messages for ${langCode}:`, error, ". Falling back to chrome.i18n.getMessage().");
        }

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            let translatedString = "";

            if (messagesToUse && messagesToUse[key] && messagesToUse[key].message) {
                translatedString = messagesToUse[key].message;
            } else {
                translatedString = chrome.i18n.getMessage(key);
                if (!translatedString) {
                     console.warn(`[Options.js] No translation found for key: ${key} (using fallback i18n API or key missing for lang ${langCode})`);
                }
            }

            if (translatedString) {
                if (el.tagName === 'INPUT' && el.type === 'submit' || el.tagName === 'BUTTON' || el.classList.contains('save-button') || el.classList.contains('calculate-button') || el.classList.contains('stop-button')) {
                    el.value = translatedString;
                    el.textContent = translatedString;
                } else {
                    el.textContent = translatedString;
                }
            }
        });

        const pageTitleKey = "incomeSettingsTitle";
        let translatedPageTitle = "";
        if (messagesToUse && messagesToUse[pageTitleKey] && messagesToUse[pageTitleKey].message) {
            translatedPageTitle = messagesToUse[pageTitleKey].message;
        } else {
            translatedPageTitle = chrome.i18n.getMessage(pageTitleKey);
        }
        if (translatedPageTitle) {
            document.title = translatedPageTitle;
        } else {
             console.warn(`[Options.js] No translation found for page title key: ${pageTitleKey}`);
        }

        if (openedDueToInstallFlag) {
            const welcomeMessageQuery = 'p.welcome-message-on-install';
            let welcomeMessageEl = document.querySelector(welcomeMessageQuery);

            const welcomeTextKey = "welcomeSetupMessage";
            let welcomeText = (messagesToUse && messagesToUse[welcomeTextKey]) ?
                                messagesToUse[welcomeTextKey].message :
                                chrome.i18n.getMessage(welcomeTextKey) || "Welcome! Please set up your income details to get started.";

            if (welcomeMessageEl) {
                 welcomeMessageEl.textContent = welcomeText;
            } else {
                const newWelcomeMessage = document.createElement('p');
                newWelcomeMessage.className = 'welcome-message-on-install';
                newWelcomeMessage.textContent = welcomeText;
                newWelcomeMessage.style.textAlign = 'center';
                newWelcomeMessage.style.color = '#4CAF50';
                newWelcomeMessage.style.fontWeight = 'bold';
                newWelcomeMessage.style.marginBottom = '15px';
                document.querySelector('.options-header').insertAdjacentElement('afterend', newWelcomeMessage);
            }
        }
    }

    function formatElapsedTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateMeetingDisplay() {
        meetingElapsedTimeEl.textContent = formatElapsedTime(meetingSecondsElapsed);
        currentMeetingCostValueEl.textContent = `${meetingCurrencySymbol}${currentMeetingTotalCost.toFixed(2)}`;
    }

    function handleStartMeetingTimer() {
        if (meetingTimerInterval) clearInterval(meetingTimerInterval); // Clear any existing timer

        const attendees = parseInt(meetingAttendeesInput.value) || 1;
        const avgAnnualSalary = parseFloat(meetingAvgSalaryInput.value) || 0;
        const currencyOption = meetingSalaryCurrencySelect.options[meetingSalaryCurrencySelect.selectedIndex];
        meetingCurrencySymbol = currencyOption.dataset.symbol || currencyOption.value;


        if (avgAnnualSalary <= 0) {
            alert("Please enter a valid average annual salary."); // Basic validation
            return;
        }

        const workdaysPerYear = 260;
        const workHoursPerDay = 8;
        const workSecondsPerYear = workHoursPerDay * 60 * 60 * workdaysPerYear;

        if (workSecondsPerYear <= 0) {
             alert("Work configuration leads to zero work time per year.");
             return;
        }

        const avgSalaryPerSecondOneAttendee = avgAnnualSalary / workSecondsPerYear;
        meetingCostPerSecond = avgSalaryPerSecondOneAttendee * attendees;

        meetingSecondsElapsed = 0;
        currentMeetingTotalCost = 0;
        updateMeetingDisplay(); // Initial display

        meetingTimerInterval = setInterval(() => {
            meetingSecondsElapsed++;
            currentMeetingTotalCost += meetingCostPerSecond;
            updateMeetingDisplay();
        }, 1000);

        startMeetingTimerButton.style.display = 'none';
        stopMeetingTimerButton.style.display = 'inline-block';
        // Disable inputs while timer is running
        meetingAttendeesInput.disabled = true;
        meetingAvgSalaryInput.disabled = true;
        meetingSalaryCurrencySelect.disabled = true;
    }

    function handleStopMeetingTimer() {
        if (meetingTimerInterval) {
            clearInterval(meetingTimerInterval);
            meetingTimerInterval = null;
        }
        startMeetingTimerButton.style.display = 'inline-block';
        stopMeetingTimerButton.style.display = 'none';
        meetingAttendeesInput.disabled = false;
        meetingAvgSalaryInput.disabled = false;
        meetingSalaryCurrencySelect.disabled = false;
    }

    if (startMeetingTimerButton) {
        startMeetingTimerButton.addEventListener('click', handleStartMeetingTimer);
    }
    if (stopMeetingTimerButton) {
        stopMeetingTimerButton.addEventListener('click', handleStopMeetingTimer);
    }

    saveButton.addEventListener('click', () => {
        saveOptions(false);
    });

    languageSelector.addEventListener('change', () => {
        console.log("[Options.js] Language selector changed to:", languageSelector.value);
        saveOptions(true);
    });

    incomeCurrencySelect.addEventListener('change', (event) => {
        updateInputCurrencySymbols(event.target.value);
    });

    loadOptions();
    meetingElapsedTimeEl.textContent = formatElapsedTime(0);
    currentMeetingCostValueEl.textContent = `${meetingSalaryCurrencySelect.options[meetingSalaryCurrencySelect.selectedIndex].dataset.symbol || meetingSalaryCurrencySelect.value}0.00`;
});
