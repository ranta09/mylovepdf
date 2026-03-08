

# Regenerate Logo — Clean, No Artifacts

## Problem
The current logo (`src/assets/logo.png`) has residual shadow/glow artifacts from background removal.

## Plan
1. Use the AI image generation model (`google/gemini-3-pro-image-preview`) to generate a completely new, clean logo matching the current design — an orange/yellow gradient heart icon — on a fully transparent background with no shadows, glow, or artifacts.
2. Replace `src/assets/logo.png` with the new clean image.
3. Sync to `public/favicon.png`.

## Technical Details
- Will use the higher-quality `gemini-3-pro-image-preview` model for crisp output
- Prompt will specify: flat design, no drop shadow, no glow, no background, transparent PNG, clean vector-style edges
- Single heart-shaped icon matching the existing orange-to-yellow gradient style

