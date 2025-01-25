# Record Apps

A desktop application that allows you to record audio from specific applications on Linux. Built with Deno, Svelte, and WebView.

![image](https://github.com/user-attachments/assets/c7943bd6-d96c-46de-86de-5f062655a258)

## Features

- List running applications with audio output
- Record audio from specific applications
- Monitor recording in real-time
- Save recordings automatically to your Music directory
- Modern, dark-themed user interface

## Prerequisites

- Linux operating system
- PulseAudio/PipeWire audio system
- Deno runtime installed
- `pactl` command-line utility

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd record
```

2. Build the application:
```bash
deno task compile
```

This will create an executable named `record` in the project root directory.

3. Run the application:
```bash
./record
```

## Development

To run the application in development mode:

```bash
deno task start
```

This will start both the backend server and the frontend development server.

- Backend runs on port 3000
- Frontend development server runs on port 5173
- WebView connects to port 8000 (production build)

## Project Structure

```
record/
├── lib.ts              # Core audio functionality
├── gui/                # Frontend Svelte application
│   ├── src/           # Source files
│   ├── public/        # Static assets
│   └── server.ts      # Backend server
├── scripts/           # Application startup scripts
│   ├── front-server.ts
│   ├── server.ts
│   ├── start.ts
│   └── webview.ts
└── deno.json         # Project configuration
```

## How It Works

1. The application creates virtual audio sinks for each application being recorded
2. Audio is redirected from the original application to its dedicated virtual sink
3. The virtual sink's audio is recorded to a FLAC file
4. Recordings are saved in `~/Music/RecordApps/<app-name>/` with timestamp-based filenames

## License

MIT
