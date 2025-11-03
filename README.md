<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1YkCBkQl10UJdGrg5PTlrr0HW8Z0nJ1ha

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set environment variables in `.env.local`:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `GCS_BUCKET_NAME`: Your Google Cloud Storage bucket name (default: `maker-suite-images`)
   - `GCS_INVENTORY_PATH`: (Optional) Path to inventory JSON metadata file in bucket. If not set, the app will automatically list all image files from the bucket root.
3. **Option A - Automatic Discovery**: Ensure your GCS bucket is public and upload image files directly to the bucket root. The app will automatically discover and list all image files (jpg, png, webp, gif, svg).
   
   **Option B - Metadata File**: Create an `inventory.json` file in your GCS bucket at the specified path. See `inventory.example.json` for the format. Set `GCS_INVENTORY_PATH` to use this approach.
4. Run the app:
   `npm run dev`
