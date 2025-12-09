<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-JnuTQP5VCy_KJw7iNE-0XBc6Oq8Z1oH

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Start the realtime relay server (needed for multi-device syncing):
   `npm run server` (defaults to `ws://localhost:8787`, override with `PORT=9001`)
3. Set `VITE_GEMINI_API_KEY` in `.env.local` to your Gemini API key
4. Run the app:
   `npm run dev`

If the relay server runs on another machine, point the client to it with  
`VITE_WS_URL=ws://<server-host>:8787 npm run dev`.
