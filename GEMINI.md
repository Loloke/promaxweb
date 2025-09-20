# Project Overview

This project is a web-based data processor and visualizer for the Promax Ranger series Spectrum Analyzer. It allows users to load data exported from the spectrum analyzer, process it, and visualize it using interactive plots.

**Main Technologies:**

*   **Frontend:** HTML, JavaScript, Tailwind CSS, Chart.js, jsPDF

**Architecture:**

The application is presented as a single-page application with a tabbed navigation, but it is composed of separate HTML files for each main feature. The main logic is split into the following JavaScript files:

*   `js/main.js`: Contains common functions used across the application.
*   `js/index.js`: Contains the logic specific to the main page (`index.html`), for detailed analysis of measurements.
*   `js/compare.js`: Contains the logic specific to the comparison page (`compare.html`), for comparing two sets of measurements.
*   `js/setup.js`: Contains the logic specific to the setup page (`setup.html`), for calculating the required compensation to reach a target signal level.

The user interface is built with Tailwind CSS, and the plotting is handled by Chart.js.

# Building and Running

This is a client-side web application. To run it, you just need to open the `index.html` file in a web browser.

**Dependencies:**

The project uses the following external libraries, which are included in the HTML files:

*   Tailwind CSS
*   Chart.js
*   jsPDF

**Development Conventions:**

*   The application uses a tabbed navigation structure. Each tab corresponds to a separate HTML file.
*   `index.html`: The main page for detailed analysis.
*   `compare.html`: The page for comparing two sets of measurements.
*   `setup.html`: The page for headend setup and compensation calculation.
*   `help.html`: The page containing the user manual.
*   Shared JavaScript functions are in `js/main.js`.
*   Page-specific JavaScript is in `js/index.js`, `js/compare.js`, and `js/setup.js`.
