# Excel AI Assistant

A modern Excel assistant powered by Claude AI. Control spreadsheets with natural language commands.

## Features

- Natural language spreadsheet control
- Claude AI integration for intelligent command processing
- Web search capability for data lookup
- Modern, responsive UI
- Real-time spreadsheet editing

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/inumise/Excel-Assistant)

### Manual Deployment

1. Fork or clone this repository
2. Go to [Vercel](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Add the environment variable:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key (get one at https://console.anthropic.com)
6. Click "Deploy"

## Local Development

```bash
# Install dependencies
npm install

# Create .env file with your API key
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude AI | Yes |

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Anthropic Claude AI
- ExcelJS for spreadsheet operations

## Usage

1. Click "Create New Spreadsheet"
2. Type natural language commands like:
   - "Set A1 to Hello World"
   - "Put 100 in B2"
   - "Create a budget with categories"
   - "Make row 1 bold"
   - "Add a SUM formula in C10"

## License

MIT
