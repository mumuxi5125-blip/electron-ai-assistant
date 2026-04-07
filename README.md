# 项目名称

[English](./README.md) | [简体中文](./README_ZH.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)# Electron AI Assistant

A desktop AI assistant application built with Electron, featuring multi-API support, session management, file system access, and agent mode for automated task execution.

## Features

### 1. Multi-API Aggregation
- Support for OpenAI, DeepSeek, Doubao, and other OpenAI-compatible APIs
- Individual enable/disable toggle for each API
- Configurable API keys and base URLs

### 2. Session Management
- Left-side session list with create/delete/switch functionality
- Each session maintains independent chat history and system prompts
- Session data persisted locally using `electron-store`

### 3. File System Access
- Full control over local files through the main process `fs` module
- File browser with directory navigation
- Read, write, list, create, and delete operations
- Security confirmation for high-risk operations

### 4. Agent Mode
- Natural language task description (e.g., "Read files in F:\ and summarize")
- AI-powered tool call planning and execution
- Step-by-step execution with user confirmation for risky operations

### 5. Security Features
- Confirmation dialogs for write, delete, and command execution operations
- Sandboxed renderer process with controlled IPC exposure
- No automatic execution of dangerous commands

## Project Structure

```
electron-ai-assistant/
├── main.js              # Main process
├── preload.js           # Preload script (IPC bridge)
├── renderer.js          # Renderer process (Vue 3)
├── index.html           # Main window HTML
├── style.css            # Application styles
├── package.json         # Dependencies and build config
├── assets/              # Icons and resources
├── .github/workflows/   # GitHub Actions CI/CD
│   └── build.yml        # Build workflow
└── README.md            # This file
```

## Installation

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd electron-ai-assistant

# Install dependencies
npm install

# Start in development mode
npm start

# Build for Windows (NSIS installer)
npm run build:win-nsis
```

### Building from Source
```bash
# Production build
npm run build

# Development build
npm run build:win

# Generate installer
npm run dist
```

## Configuration

### API Configuration
1. Open the application
2. Click on the API Configuration section in the sidebar
3. Enable desired APIs and enter your API keys
4. Configure base URLs if needed (defaults are provided)

### Session Management
- Click "New Session" to create a conversation
- Click on session names to switch between conversations
- Use the edit/delete buttons to manage sessions

### File Browser
- Navigate directories using the path input or folder clicks
- Click the up arrow to go to parent directory
- Click file eye icon to preview file contents

## Agent Mode Usage

1. Switch to "Agent" mode using the top-right toggle
2. Enter a natural language command, such as:
   - "List all files in the Documents folder"
   - "Read config.json and show its contents"
   - "Create a new directory called 'backup'"
3. Click "Execute Agent"
4. Review the execution plan and confirm operations when prompted

## Build Configuration

The application uses `electron-builder` with the following NSIS settings:
- `oneClick: false` - Shows installation wizard
- `allowToChangeInstallationDirectory: true` - User can choose install location
- Creates desktop and start menu shortcuts

### CI/CD Pipeline

GitHub Actions workflow (`build.yml`):
- Manual trigger or on version tags
- Windows runner with Node.js 18
- Solves `GH_TOKEN not set` error with dummy token
- Uses `--publish never` to avoid publishing errors
- Uploads Setup.exe as artifact

## Security Considerations

1. **Renderer Process Isolation**: Renderer runs with `nodeIntegration: false` and `contextIsolation: true`
2. **Preload Script**: Exposes only necessary IPC methods to the renderer
3. **User Confirmation**: High-risk operations require explicit user approval
4. **File System Sandboxing**: All file operations go through the main process
5. **Command Execution**: Shell commands are executed with user confirmation and in specified directories

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Verify API keys are correct
   - Check network connectivity
   - Ensure API service is available

2. **Build Errors**
   - Ensure Node.js version is compatible
   - Check `electron-builder` configuration
   - Verify all dependencies are installed

3. **File Permission Errors**
   - Run as administrator if needed
   - Check file/directory permissions
   - Confirm paths are valid

4. **CI/CD Build Failures**
   - The workflow includes fixes for common electron-builder CI issues
   - Uses dummy GH_TOKEN to avoid authentication errors
   - Sets `--publish never` to prevent publishing

### Development Tips
- Use `npm run dev` to start with dev tools open
- Check console logs in dev tools for debugging
- Monitor main process logs in terminal

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and feature requests, please use the GitHub Issues page.
