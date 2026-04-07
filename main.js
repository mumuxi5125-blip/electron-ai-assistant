const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const Store = require('electron-store');
const { spawn, exec } = require('child_process');
const os = require('os');

// 初始化存储
const store = new Store({
  defaults: {
    apiConfigs: {
      openai: { enabled: true, apiKey: '', baseURL: 'https://api.openai.com/v1' },
      deepseek: { enabled: false, apiKey: '', baseURL: 'https://api.deepseek.com/v1' },
      doubao: { enabled: false, apiKey: '', baseURL: 'https://ark.cn-beijing.volces.com/api/v3' }
    },
    sessions: [],
    currentSessionId: null,
    settings: {
      confirmHighRisk: true,
      maxTokens: 2000,
      temperature: 0.7
    }
  }
});

// 确保 deepseek 默认启用（如果用户已输入 API 密钥）
const apiConfigs = store.get('apiConfigs');
if (apiConfigs && apiConfigs.deepseek) {
  if (!apiConfigs.deepseek.enabled && apiConfigs.deepseek.apiKey) {
    apiConfigs.deepseek.enabled = true;
    store.set('apiConfigs', apiConfigs);
  }
} else {
  // 初始化 deepseek 配置
  store.set('apiConfigs.deepseek', { enabled: true, apiKey: '', baseURL: 'https://api.deepseek.com/v1' });
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.ico')
  });

  mainWindow.loadFile('index.html');

  // 开发工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 处理程序

// 文件系统操作
ipcMain.handle('fs:read', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:write', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:list', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const result = files.map(dirent => ({
      name: dirent.name,
      isDirectory: dirent.isDirectory(),
      path: path.join(dirPath, dirent.name)
    }));
    return { success: true, files: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:mkdir', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:delete', async (event, filePath) => {
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 执行命令
ipcMain.handle('exec:command', async (event, command, cwd) => {
  return new Promise((resolve) => {
    exec(command, { cwd: cwd || process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stdout, stderr });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
});

// 存储操作
ipcMain.handle('store:get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store:set', (event, key, value) => {
  store.set(key, value);
  return { success: true };
});

// 会话管理
ipcMain.handle('sessions:create', (event, name) => {
  const sessions = store.get('sessions') || [];
  const newSession = {
    id: Date.now().toString(),
    name: name || `Session ${sessions.length + 1}`,
    messages: [],
    systemPrompt: 'You are a helpful AI assistant.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  sessions.push(newSession);
  store.set('sessions', sessions);
  
  if (!store.get('currentSessionId')) {
    store.set('currentSessionId', newSession.id);
  }
  
  return newSession;
});

ipcMain.handle('sessions:update', (event, sessionId, updates) => {
  const sessions = store.get('sessions') || [];
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates, updatedAt: new Date().toISOString() };
    store.set('sessions', sessions);
    return { success: true, session: sessions[index] };
  }
  return { success: false, error: 'Session not found' };
});

ipcMain.handle('sessions:delete', (event, sessionId) => {
  const sessions = store.get('sessions') || [];
  const filtered = sessions.filter(s => s.id !== sessionId);
  store.set('sessions', filtered);
  
  const currentSessionId = store.get('currentSessionId');
  if (currentSessionId === sessionId) {
    store.set('currentSessionId', filtered.length > 0 ? filtered[0].id : null);
  }
  
  return { success: true };
});

// AI API 调用
ipcMain.handle('ai:chat', async (event, { provider, messages, options }) => {
  const apiConfigs = store.get('apiConfigs');
  const config = apiConfigs[provider];
  
  if (!config || !config.enabled || !config.apiKey) {
    return { success: false, error: `Provider ${provider} is not configured or enabled` };
  }
  
  try {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: options?.maxTokens || store.get('settings.maxTokens') || 2000,
        temperature: options?.temperature || store.get('settings.temperature') || 0.7,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 安全确认对话框
ipcMain.handle('dialog:confirm', async (event, options) => {
  if (!mainWindow) return { confirmed: false };
  
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['取消', '确认'],
    defaultId: 1,
    cancelId: 0,
    title: options.title || '确认操作',
    message: options.message || '确定要执行此操作吗？',
    detail: options.detail || '此操作可能会修改或删除文件。'
  });
  
  return { confirmed: result.response === 1 };
});

// 打开目录
ipcMain.handle('shell:open', async (event, path) => {
  try {
    await shell.openPath(path);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取系统信息
ipcMain.handle('system:info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    homedir: os.homedir(),
    cwd: process.cwd(),
    version: process.version
  };
});
