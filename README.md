# JEV Notes

A local-first document library that turns your PDFs, images, and text files into a searchable, connected knowledge base. Upload a document to extract its text, get an AI-generated summary, and discover related documents. A built-in quick note gives you a place to capture thoughts alongside your library.

## Demo

<video src="https://raw.githubusercontent.com/virajlokhande0912/smart_search_using_jev/main/docs/demo.mp4" poster="https://raw.githubusercontent.com/virajlokhande0912/smart_search_using_jev/main/docs/demo-poster.jpg" controls width="100%"></video>

[Open or download the demo video](https://github.com/virajlokhande0912/smart_search_using_jev/raw/refs/heads/main/docs/demo.mp4)

## Features

- Upload PDF, PNG, JPEG, WebP, TXT, and Markdown files (up to 10 MB; PDFs are limited to 20 pages).
- Extract text from PDFs and images with OCR.
- Summarize documents and identify entities with a local Ollama model.
- Search document text and automatically find likely relationships between documents.
- Browse document details and keep quick notes in your browser.
- Store documents and relationships locally in SQLite.

## Requirements

- Node.js and npm
- Ollama for local summaries, embeddings, and relationship classification. The app can start the Ollama server automatically; install the models below before using AI features. If Ollama or a model is unavailable, the app uses simpler local fallbacks.

## Run locally

```bash
git clone https://github.com/virajlokhande0912/smart_search_using_jev.git
cd smart_search_using_jev
npm install
```

Install and prepare the local AI models:

```bash
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

Create your local environment file and initialize the database:

```bash
cp .env.example .env.local
npx prisma generate
npx prisma db push
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default database is a local SQLite file (`dev.db`). Environment files and database files are excluded from Git.

## Configuration

`.env.example` contains the available settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite database location |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server address |
| `OLLAMA_AUTOSTART` | `true` | Start `ollama serve` when needed |

Set `OLLAMA_AUTOSTART=false` if you manage the Ollama server yourself. Start it separately with `ollama serve`.

## Tech stack

Next.js, React, TypeScript, Prisma, SQLite, and Ollama. PDF text extraction uses `pdf-parse`; image text extraction uses Tesseract.js.

## Data and privacy

Documents and extracted text stay in the local SQLite database. Ollama runs on your machine, so document content is not sent to a hosted AI service by this app. Keep `.env.local` and your database files private; they are excluded from Git.
