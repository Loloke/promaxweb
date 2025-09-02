# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JavaScript web application for processing and analyzing Promax Spectrum Analyzer measurement data from XML files. The application consists of two HTML files with embedded JavaScript - no build process or package manager required.

## Architecture

### Files
- **index.html**: Main application file containing all JavaScript logic inline. Processes XML measurement files, displays charts and tables, generates PDF reports.
- **help.html**: Static help documentation page in Hungarian explaining usage and features.

### Key Technologies
- Frontend: Pure JavaScript with no framework
- Styling: Tailwind CSS (CDN)
- Charts: Chart.js with datalabels plugin (CDN)
- PDF Generation: jsPDF with autotable plugin (CDN)
- Canvas Rendering: html2canvas (CDN)

## Development Commands

This is a static web application with no build process. To develop:
- Open index.html directly in a browser or serve with any static file server
- No npm/yarn commands needed
- No compilation or bundling required

## Core Functionality

The application:
1. Accepts multiple XML files from Promax spectrum analyzers
2. Parses channel data including signal levels, frequencies, MER values
3. Calculates statistics with intelligent outlier filtering based on file count
4. Displays interactive bar charts with error bars and optional tilt visualization
5. Shows detailed data tables with channel mapping to standard names
6. Generates professional PDF reports with user-provided location/notes

## Key Implementation Details

- **Channel frequency mapping**: Maps frequencies to standard channel names (E2-E69, S2-S41) using predefined ranges
- **Outlier filtering**: Automatically filters extreme values based on number of measurements (4-6 files: removes min/max, 7+ files: removes 2 lowest/highest)
- **Chart scaling**: Supports standard fixed scale and narrow 3dBuV scale options
- **Hungarian character handling**: Replaces special Hungarian characters for PDF compatibility
- **Responsive design**: Uses Tailwind CSS for mobile-friendly layout