# Quick Start Guide

## Prerequisites
- Node.js 18.x or later
- npm (comes with Node.js)

## Installation

1. **Clone or download** the project
2. **Open terminal/command prompt** in the project directory
3. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode
```bash
npm start
```
or double-click `start.bat` on Windows

### Using the Application

1. **Configure API Keys**:
   - In the sidebar, expand "API Configuration"
   - Enable desired APIs (OpenAI, DeepSeek, Doubao)
   - Enter your API keys
   - Base URLs are pre-filled with defaults

2. **Create a Session**:
   - Click "New Session" in the Sessions section
   - Sessions appear in the sidebar list
   - Click any session to switch to it

3. **Chat with AI**:
   - Type your message in the bottom text area
   - Select API provider from the dropdown
   - Press Enter or click Send

4. **Browse Files**:
   - Use the file browser in the sidebar
   - Click folders to navigate
   - Click file eye icon to preview contents

5. **Use Agent Mode**:
   - Switch to "Agent" mode using top-right toggle
   - Describe a task in natural language
   - Click "Execute Agent"
   - Confirm any risky operations when prompted

## Building the Installer

### Development Build
```bash
npm run build:win
```

### Production Installer (NSIS)
```bash
npm run build:win-nsis
```

### All Build Targets
```bash
npm run build
```

The installer will be created in the `dist/` folder.

## Troubleshooting

### Common Issues

**"npm start" doesn't work**
- Ensure Node.js is installed (`node --version`)
- Try deleting `node_modules` and running `npm install` again

**API errors**
- Verify your API keys are correct
- Check network connectivity
- Ensure the API service is available

**File permission errors**
- Run as administrator if needed
- Check file/directory permissions

**Build errors**
- Ensure you have all build tools installed
- Check electron-builder documentation

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Review [IMPLEMENTATION.md](IMPLEMENTATION.md) for architecture details
- Customize the application for your needs
- Deploy using the GitHub Actions workflow