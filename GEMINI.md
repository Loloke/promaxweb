# Project Overview

This project is a web-based data processor and visualizer for the Promax Ranger series Spectrum Analyzer. It allows users to load data exported from the spectrum analyzer, process it, and visualize it using interactive plots.

**Main Technologies:**

*   **Frontend:** HTML, JavaScript, jQuery, Bootstrap, Plotly.js

**Architecture:**

The application is a single-page web application. The main logic is split into three JavaScript files:
*   `js/main.js`: Contains common functions used across the application.
*   `js/index.js`: Contains the logic specific to the main page (`index.html`).
*   `js/compare.js`: Contains the logic specific to the comparison page (`compare.html`).

The user interface is built with Bootstrap, and the plotting is handled by Plotly.js.

# Building and Running

This is a client-side web application. To run it, you just need to open the `index.html` file in a web browser.

**Dependencies:**

The project uses the following external libraries, which are included in the `index.html` and `compare.html` files:

*   jQuery
*   Bootstrap
*   Plotly.js

**Development Conventions:**

*   The main application logic is separated into JavaScript files in the `js` directory.
*   `index.html` is the main entry point of the application.
*   `compare.html` is the entry point for the comparison view.
*   `help.html` contains the documentation.
*   Shared JavaScript functions are in `js/main.js`.
*   Page-specific JavaScript is in `js/index.js` and `js/compare.js`.