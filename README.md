<div align="center">
  <img src="assets/social_preview.png" alt="BayarTengah Banner" width="100%" />

  # BayarTengah

  <img src="assets/thumbnail.png" alt="BayarTengah Icon" width="100" />
</div>

## Smart, AI-Powered Bill Splitting for Groups & Trips

**BayarTengah** (Indonesian for "Split the Bill" or "Pay in the Middle") is an intelligent web application designed to simplify the often tedious process of sharing expenses. By leveraging Google's advanced Gemini AI, it transforms static receipt images into interactive, editable digital bills, making it easier than ever to calculate who owes what.

### Project Description

BayarTengah solves the "napkin math" problem at dinner tables and on vacations. It combines a clean, mobile-first interface with powerful backend AI to handle everything from simple dinner checks to complex multi-day trip expenses.

**How it works:**

1.  **Scan & Parse**: Upload a photo of any receipt. The app uses **Gemini 3 Pro** (Multimodal AI) to extract items, prices, quantities, tax, and tip with high accuracy.
2.  **Assign & Edit**:
    *   **Manual Control**: Tap items to assign them to friends. Use the "Edit Mode" to fix prices or split items unevenly (e.g., 2 people sharing 5 items).
    *   **AI Assistant**: Use the built-in chat to give natural commands like *"Tom had the burger and half the pizza"* or *"Split the appetizers between everyone except Sarah."*
3.  **Group & Summarize**:
    *   **Trips**: Create groups (e.g., "Bali Trip 2024") and organize multiple bills under one folder.
    *   **Aggregated Costs**: View a consolidated summary showing exactly how much each person owes across the entire trip.
4.  **Share**: Generate a clean text summary of the final split—including itemized breakdowns—ready to be copied and pasted into WhatsApp or other messaging apps.

**Technical Highlights:**
*   **Stack**: React 19, Tailwind CSS, Google GenAI SDK.
*   **Features**: Auto-save, Local Storage persistence, Multi-currency support (IDR, USD, etc.), and weighted quantity splitting.
*   **Privacy**: All data is stored locally in the user's browser.

## Screenshots

<div align="center">
  <table border="0">
    <tr>
        <td>
            <p align="center"><b>Landing Page</b></p>
            <img src="assets/landing_page.png" width="400" alt="Landing Page" />
        </td>
        <td>
            <p align="center"><b>Upload Interface</b></p>
            <img src="assets/upload_interface.png" width="400" alt="Upload Interface" />
        </td>
    </tr>
  </table>
</div>

### Detailed Features

<div align="center">
  <table border="0">
    <tr>
        <td>
            <p align="center"><b>1. Receipt Analysis</b><br/>AI parses items automatically</p>
            <img src="assets/receipt_analysis.png" width="250" alt="Receipt Analysis" />
        </td>
        <td>
            <p align="center"><b>2. Assign Items</b><br/>Quickly assign to people</p>
            <img src="assets/assign_item.png" width="250" alt="Assign Items" />
        </td>
        <td>
            <p align="center"><b>3. Edit Mode</b><br/>Fix prices or names easily</p>
            <img src="assets/edit_mode.png" width="250" alt="Edit Mode" />
        </td>
    </tr>
    <tr>
        <td>
            <p align="center"><b>4. Multi-Select</b><br/>Group items for bulk actions</p>
            <img src="assets/multi_select.png" width="250" alt="Multi-Select" />
        </td>
        <td colspan="2">
            <p align="center"><b>5. Summary</b><br/>Live breakdown of debts</p>
            <img src="assets/summary_view.png" width="500" alt="Summary View" />
        </td>
    </tr>
  </table>
</div>