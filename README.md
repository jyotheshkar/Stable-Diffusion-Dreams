# Stable-Diffusion-Dreams

This is a web application built with React that creates a continuous, morphing "dream sequence" from a single text prompt. It uses a multi-step AI process to generate an initial image, have a "storyteller" AI create a follow-up scene, and then smoothly animates the transition between them.

## Features

* **AI Storyteller:** Uses Google's Gemini 2.5 Flash model to analyze an image and generate a creative, context-aware prompt for the next scene.
* **Image Generation:** Leverages Google's Imagen 3 model to create high-quality, detailed images.
* **Morphing Animation:** A custom animation engine built with the HTML Canvas API creates a seamless cross-fade and warp effect between images.
* **Glassmorphism UI:** A sleek, modern interface with glass-like effects built with Tailwind CSS.

## Tech Stack

* **Frontend:** React.js
* **Styling:** Tailwind CSS
* **AI Models:**
    * Google Gemini 2.5 Flash (for prompt generation)
    * Google Imagen 3 (for image generation)

## How It Works

1.  The user provides an initial text prompt.
2.  The app calls the Imagen 3 API to generate the first image.
3.  That image is sent to the Gemini 2.5 Flash API, which acts as an "AI Storyteller" to create a prompt for the next logical scene in the sequence.
4.  A new image is generated based on the storyteller's prompt.
5.  The frontend then animates a smooth, morphing transition between the two images.
6.  This process repeats, creating a never-ending dream sequence.

---
*This project was built to explore the creative possibilities of combining multiple AI models within a single, interactive web application.*
