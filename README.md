# RuntimeTerrors
RSquareSoft JOB-A-THON

RuntimeTerrors is a repository containing a browser extension frontend and a Python backend. The project structure is organized into two main folders:

- `extension/` - browser extension source files (`background.js`, `content.js`, `popup.html`, `popup.js`, `styles.css`, `manifest.json`)
- `backend/` - Python backend logic and supporting files (`main.py`, `requirements.txt`, `output.txt`, `vendor_security.db`)

## Notes
- `backend/output.txt` contains generated runtime output data.
- `backend/vendor_security.db` is a binary database file used by the backend.
- Temporary artifact folders such as `backend/temp` and `extension/temp` should not be committed in the future.

## Next steps
1. Install Python dependencies: `pip install -r backend/requirements.txt`
2. Run the backend application from `backend/main.py`.
3. Load the extension from the `extension/` folder in your browser for testing.

<img width="1536" height="1024" alt="ChatGPT Image May 18, 2026, 12_52_26 PM" src="https://github.com/user-attachments/assets/0d05b787-d1d9-4402-96de-bd5e9e0ad36c" />
