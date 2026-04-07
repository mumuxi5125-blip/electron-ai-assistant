const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露 IPC 方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件系统操作
  fsRead: (filePath) => ipcRenderer.invoke('fs:read', filePath),
  fsWrite: (filePath, content) => ipcRenderer.invoke('fs:write', filePath, content),
  fsList: (dirPath) => ipcRenderer.invoke('fs:list', dirPath),
  fsMkdir: (dirPath) => ipcRenderer.invoke('fs:mkdir', dirPath),
  fsDelete: (filePath) => ipcRenderer.invoke('fs:delete', filePath),
  
  // 执行命令
  execCommand: (command, cwd) => ipcRenderer.invoke('exec:command', command, cwd),
  
  // 存储操作
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store:set', key, value),
  
  // 会话管理
  sessionsCreate: (name) => ipcRenderer.invoke('sessions:create', name),
  sessionsUpdate: (sessionId, updates) => ipcRenderer.invoke('sessions:update', sessionId, updates),
  sessionsDelete: (sessionId) => ipcRenderer.invoke('sessions:delete', sessionId),
  
  // AI API 调用
  aiChat: (provider, messages, options) => ipcRenderer.invoke('ai:chat', { provider, messages, options }),
  
  // 安全确认
  confirmAction: (options) => ipcRenderer.invoke('dialog:confirm', options),
  
  // 系统操作
  openDirectory: (path) => ipcRenderer.invoke('shell:open', path),
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  
  // 事件监听
  onStoreUpdate: (callback) => {
    const channel = 'store:update';
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
    return () => ipcRenderer.removeAllListeners(channel);
  }
});

// 为 Vue 开发工具暴露一个全局变量（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('__VUE_DEVTOOLS_GLOBAL_HOOK__', {});
}