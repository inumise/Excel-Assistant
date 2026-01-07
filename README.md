# Excel AI Voice Assistant

Control Excel spreadsheets with natural voice commands or text chat. Features server-side audio transcription for reliable voice recognition on any device.

## Features

- Create new spreadsheets or upload existing Excel files
- Voice control via audio file upload (works on any device/browser)
- Live microphone input (Chrome/Edge only)
- Natural language commands like "Set A1 to Hello", "Sum column A", "Make row 1 bold"
- Chat-based interface with command history
- Mobile-responsive design
- Download spreadsheets as .xlsx files

## Tech Stack

- **Backend**: FastAPI, Python, openpyxl, SpeechRecognition
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui

## Voice Commands

### Setting Values
- "Set A1 to Hello"
- "Put 100 in B2"
- "Write Hello World in C3"

### Formulas
- "Sum column A"
- "Average of column B"
- "Count column C"

### Formatting
- "Make row 1 bold"
- "Bold cell A1"

### Sheets
- "Add sheet called Sales"
- "Create new sheet named Budget"

### Editing
- "Delete column C"
- "Remove row 5"
- "Clear A1"
- "Insert row at 3"

## Local Development

### Backend
```bash
cd excel-ai-backend
poetry install
poetry run fastapi dev app/main.py
```

### Frontend
```bash
cd excel-ai-frontend
npm install
npm run dev
```

## Deployment

### Railway (Backend)
1. Connect your GitHub repository to Railway
2. Set the root directory to `excel-ai-backend`
3. Railway will auto-detect the Python app

### Frontend
1. Build: `npm run build`
2. Deploy the `dist` folder to any static hosting (Vercel, Netlify, etc.)
3. Set `VITE_API_URL` environment variable to your backend URL

## License

MIT
