# Live Meeting Cost Tracker - Chrome Extension

## Overview

The **Live Meeting Cost Tracker** is a simple Chrome extension designed to help you visualize the accumulating cost of meetings in real-time. By inputting the number of attendees, their average hourly salary, and the expected duration of a meeting, you can start a timer and see the cost increase as the meeting progresses. This tool aims to bring awareness to the financial investment of meetings and encourage efficiency.

## Features

* **Real-time Cost Accumulation:** See the meeting cost update every second.
* **Attendee & Salary Input:** Specify the number of attendees and their average hourly salary.
* **Expected Duration & Projected Cost:** Input the expected meeting duration to see a projected total cost.
* **Progress Visualization:** A progress bar shows the current cost relative to the projected cost.
    * The bar turns red when the current cost reaches 85% of the projected cost.
    * The percentage display can exceed 100% if the meeting goes over budget.
    * An "Exceeded by" amount is shown if the current cost surpasses the projected cost.
* **Currency Selection:** Choose the currency for salary and cost display (CHF, USD, EUR, GBP, CNY, JPY).
* **Persistent Timer:** The meeting timer continues to run in the background even if the popup is closed. If a meeting was active, its state is restored when the popup is reopened.
* **Multilingual Interface:** Supports English, German, and Chinese. Language can be selected directly in the popup.
* **Focused UI:** All functionality is contained within the browser action popup for quick access.

## How to Use

1.  **Click the Extension Icon:** Find the "Live Meeting Cost Tracker" icon in your Chrome toolbar and click it to open the popup.
2.  **Enter Meeting Details:**
    * **Attendees:** Input the number of people in the meeting.
    * **Avg. Hourly Salary:** Enter the average hourly salary for an attendee.
    * **Expected Duration (min):** Set the planned length of the meeting in minutes. This is used to calculate the projected cost and the progress bar.
    * **Currency:** Select the currency for the salary and cost display.
3.  **Start Meeting:** Click the "Start Meeting" button.
    * The "Elapsed Time" will begin counting up.
    * The "Current Cost" will start accumulating.
    * The "Projected Cost" (if expected duration was set) will be displayed.
    * The progress bar will show the current cost against the projected cost.
    * Input fields will be disabled while the timer is running.
4.  **Stop Meeting:** Click the "Stop Meeting" button to halt the timer and see the final accumulated cost.
    * Input fields will become enabled again, ready for a new meeting.
5.  **Change Language:** Use the dropdown menu at the top right of the popup to switch between English, German, and Chinese.

## Installation

Since this is a custom-developed extension, you'll need to load it as an unpacked extension in Chrome:

1.  **Download/Save Files:** Ensure you have all the extension files (`manifest.json`, `popup.html`, `popup.js`, `background.js`, `style.css`, the `_locales` folder, and the `images` folder with icons) in a single directory on your computer (e.g., `live-meeting-cost-tracker-extension`).
2.  **Open Chrome Extensions Page:** Open Google Chrome, type `chrome://extensions` in the address bar, and press Enter.
3.  **Enable Developer Mode:** In the top right corner of the Extensions page, toggle on "Developer mode."
4.  **Load Unpacked:**
    * Click the "Load unpacked" button that appears.
    * Navigate to and select the directory where you saved the extension files (e.g., `live-meeting-cost-tracker-extension`).
    * Click "Select Folder."
5.  The "Live Meeting Cost Tracker" extension should now appear in your list of extensions and be active in your toolbar.

## Files in the Extension

* `manifest.json`: Defines the extension's properties, permissions, and core files.
* `popup.html`: The HTML structure for the extension's user interface.
* `popup.js`: Handles the logic and user interactions within the popup, including managing the meeting timer display and communication with the background script.
* `background.js`: The service worker that manages the persistent state of the meeting timer (runs even if the popup is closed), performs calculations, and handles communication.
* `style.css`: Contains all the CSS rules for styling the popup.
* `_locales/`: Folder containing subfolders for each supported language (`en`, `de`, `zh`), each with a `messages.json` file for localization strings.
* `images/`: Folder containing icon files (`icon16.png`, `icon48.png`, `icon128.png`, etc.) for the extension.

## Potential Future Enhancements

* Option to save default meeting parameters (e.g., typical number of attendees, default hourly rate).
* History of tracked meetings.
* More sophisticated currency conversion if different currencies are used for input vs. display.
* Sound notifications for meeting start/stop or when projected cost is reached.
