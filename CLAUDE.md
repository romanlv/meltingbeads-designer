# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is a Melting Beads Pattern Generator web application built with React, TypeScript, and Vite. It allows users to upload images and convert them into bead patterns for melting bead crafts. The application offers various customization options such as different bead palettes, pattern sizes, and display settings.

## Development Commands

use `pnpm` as package manager.

- **Development Server**: `pnpm dev` - Starts the Vite development server with hot module replacement
- **Build**: `pnpm build` - Typechecks and builds the application for production
- **Lint**: `pnpm lint`  - Runs ESLint on the codebase
- **Preview**: `pnpm preview`  - Previews the built application locally

## Architecture

### Core Components

1. **App.tsx** - Main component containing the UI and state management for the bead pattern generator

2. **Image Processing** - Located in `src/lib/image-processor.ts`, handles:
   - Resizing images to fit within the specified constraints
   - Converting image pixels to bead colors using the closest match algorithm
   - Applying dithering for better color representation
   - Background removal functionality
   - Generating the final pattern with grid lines

3. **Bead Palettes** - Located in `src/lib/bead-palettes.ts`, contains:
   - Predefined color palettes (standard, mini, pastel)
   - Utility function to find the closest matching color

### UI Components

The application uses Shadcn/UI components, which are based on Radix UI primitives with Tailwind CSS styling. Key UI components are located in `src/components/ui/` and include:

- Button
- Card
- Label
- Select
- Slider
- Switch
- Tooltip

### Key Features

1. **Image Upload and Processing**: Users can upload images which are then processed in the browser (no server uploads)
2. **Pattern Customization**:
   - Pattern size (maximum beads in width/height)
   - Bead display size
   - Choice of color palettes (standard, mini, pastel)
3. **Background Options**:
   - Background removal with adjustable sensitivity
4. **Display Options**:
   - Grid line toggling
   - Dithering for better color representation
5. **Pattern Export**: Download the generated pattern as a PNG file
6. **Bead Count**: Shows the count of beads by color needed for the pattern

## File Structure

- `/src`
  - `/components` - UI components from shadcn/ui
  - `/lib` - Core business logic:
    - `bead-palettes.ts` - Color palettes and color matching
    - `image-processor.ts` - Image processing and pattern generation
    - `utils.ts` - Utility functions for styling
  - `App.tsx` - Main application component
  - `main.tsx` - Application entry point