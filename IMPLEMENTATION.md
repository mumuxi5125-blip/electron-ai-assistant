# Implementation Details

## Architecture Overview

The Electron AI Assistant follows a classic Electron architecture with clear separation between main and renderer processes:

```
┌─────────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   Window   │  │    IPC     │  │    File System       │  │
│  │  Management│  │   Handlers │  │     Operations       │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│           │              │                   │              │
│           └──────────────┼───────────────────┘              │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ IPC
┌──────────────────────────┼──────────────────────────────────┐
│                    Renderer Process (Browser)               │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   Vue 3    │  │  Electron  │  │    UI Components     │  │
│  │   App      │  │    API     │  │   (Chat, File Browser)│  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│           │              │                   │              │
│           └──────────────┼───────────────────┘              │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    Preload Script                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Context Bridge (Safe IPC Exposure)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Main Process (`main.js`)

The main process handles:

- **Window Management**: Creates and manages the browser window
- **IPC Handlers**: Processes requests from the renderer process
- **File System Operations**: Safe file access via Node.js `fs` module
- **Store Management**: Persistent storage using `electron-store`
- **API Communication**: HTTP requests to AI services
- **Security Dialogs**: User confirmation for high-risk operations

Key IPC channels:
- `fs:*` - File system operations
- `store:*` - Configuration and session storage
- `sessions:*` - Session management
- `ai:chat` - AI API communication
- `dialog:confirm` - Security confirmations
- `exec:command` - Shell command execution

### 2. Preload Script (`preload.js`)

Acts as a secure bridge between main and renderer processes:

- Uses `contextBridge` to expose limited API methods
- Prevents direct Node.js access from renderer
- Maintains security with `contextIsolation: true`
- Only exposes whitelisted IPC methods

### 3. Renderer Process (`renderer.js` + Vue 3)

The user interface built with Vue 3 Composition API:

- **Reactive State Management**: Vue 3 refs and computed properties
- **Component Architecture**: Modular UI components
- **API Integration**: Calls to exposed Electron API methods
- **Real-time Updates**: Reactive data binding

### 4. Configuration Files

- **`package.json`**: Electron-builder configuration with NSIS settings
- **`build.yml`**: GitHub Actions workflow for CI/CD
- **`style.css`**: Comprehensive styling with responsive design

## Security Implementation

### Process Isolation

```javascript
// main.js
webPreferences: {
  nodeIntegration: false,      // No Node.js in renderer
  contextIsolation: true,      // Isolated context
  preload: path.join(__dirname, 'preload.js')
}
```

### Controlled IPC Exposure

```javascript
// preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  fsRead: (filePath) => ipcRenderer.invoke('fs:read', filePath),
  // Only safe, validated methods are exposed
});
```

### User Confirmation

All high-risk operations require explicit user approval:

```javascript
// main.js
ipcMain.handle('dialog:confirm', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Cancel', 'Confirm'],
    // ... warning details
  });
  return { confirmed: result.response === 1 };
});
```

## File System Access

### Safe Path Handling

All file operations are validated in the main process:

```javascript
ipcMain.handle('fs:read', async (event, filePath) => {
  try {
    // Path validation happens here
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### Directory Navigation

The file browser maintains a current path and validates all navigation:

```javascript
async function changeDirectory(path) {
  const result = await window.electronAPI.fsList(path);
  if (result.success) {
    // Update UI with new directory contents
    fileList.value = result.files;
    currentPath.value = path;
  }
}
```

## Session Management

### Data Structure

```javascript
{
  id: "timestamp",
  name: "Session Name",
  messages: [
    { role: "user|assistant", content: "message", timestamp: "ISO string" }
  ],
  systemPrompt: "Custom instructions",
  createdAt: "ISO string",
  updatedAt: "ISO string"
}
```

### Persistence

Sessions are stored using `electron-store` with automatic serialization:

```javascript
const store = new Store({
  defaults: {
    sessions: [],
    currentSessionId: null,
    apiConfigs: { /* ... */ }
  }
});
```

## AI Integration

### Multi-API Support

The application supports multiple AI providers through a unified interface:

```javascript
async function callAI(provider, messages, options) {
  const config = apiConfigs[provider];
  
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'gpt-3.5-turbo',
      messages,
      // ... other parameters
    })
  });
  
  return response.json();
}
```

### Agent Mode

Agent mode implements a simple planning-execution loop:

1. **Plan Generation**: AI analyzes the natural language command
2. **Tool Selection**: Identifies appropriate file system operations
3. **User Confirmation**: Requests approval for high-risk steps
4. **Execution**: Performs operations sequentially
5. **Result Aggregation**: Combines outputs into final result

## Build System

### Electron Builder Configuration

```json
{
  "build": {
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "win": {
      "target": "nsis"
    }
  }
}
```

### CI/CD Pipeline

The GitHub Actions workflow:

1. **Manual Trigger**: `workflow_dispatch` for on-demand builds
2. **Environment Setup**: Node.js 18.x on Windows runner
3. **Dependency Installation**: Uses `npm ci` for reproducible builds
4. **Build Process**: Runs `electron-builder` with `--publish never`
5. **Artifact Upload**: Packages Setup.exe for download

### Solving Common CI Issues

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN || 'dummy_token' }}
run: |
  npx electron-builder --win --publish never
```

## Performance Considerations

### Memory Management

- **Session Limiting**: Only current session loaded in memory
- **File Chunking**: Large files read in chunks when needed
- **Event Cleanup**: Proper removal of event listeners

### Responsive UI

- **Virtual Scrolling**: Consider for large message history
- **Debounced Input**: File search and filtering
- **Lazy Loading**: Optional for additional features

## Extensibility

### Adding New AI Providers

1. Add configuration to `apiConfigs` defaults
2. Update provider selection UI
3. Implement provider-specific adjustments if needed

### Adding New Tools

1. Define IPC handler in main process
2. Expose method via preload script
3. Add UI controls in renderer
4. Update agent mode planning prompt

### Customizing Build

- Modify `package.json` `build` section for different targets
- Adjust NSIS configuration for installer behavior
- Update GitHub Actions for additional platforms

## Testing Strategy

### Manual Testing Areas

1. **File Operations**: Read, write, delete with confirmation
2. **API Connectivity**: Multiple provider testing
3. **Session Management**: Create, switch, delete sessions
4. **Agent Mode**: Natural language command execution
5. **Installation**: NSIS installer functionality

### Automated Testing (Potential)

- Unit tests for utility functions
- Integration tests for IPC handlers
- E2E tests with Spectron or Playwright

## Deployment

### Distribution Channels

1. **Direct Downloads**: GitHub Releases with Setup.exe
2. **Auto-updates**: Implement `electron-updater` if needed
3. **Package Managers**: Consider Chocolatey or Scoop packages

### Update Strategy

- Manual download and install
- Optional auto-update implementation
- Version checking on startup

## Known Limitations

1. **Large Files**: Memory constraints with very large files
2. **Network Dependencies**: Requires internet for AI features
3. **Platform Support**: Primarily Windows-focused (can be extended)
4. **Security Trade-offs**: Balance between functionality and safety

## Future Enhancements

1. **Plugin System**: Extensible tool architecture
2. **Local AI Models**: Support for Ollama, LocalAI
3. **Advanced Agent**: More sophisticated planning and execution
4. **Collaboration Features**: Shared sessions or file access
5. **Mobile Companion**: Cross-platform sync