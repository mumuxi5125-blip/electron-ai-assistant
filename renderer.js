// Vue 3 应用
const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

createApp({
  setup() {
    // 状态
    const apiConfigs = ref({
      openai: { enabled: true, apiKey: '', baseURL: 'https://api.openai.com/v1' },
      deepseek: { enabled: false, apiKey: '', baseURL: 'https://api.deepseek.com/v1' },
      doubao: { enabled: false, apiKey: '', baseURL: 'https://ark.cn-beijing.volces.com/api/v3' }
    });
    
    const sessions = ref([]);
    const currentSessionId = ref(null);
    const currentSession = computed(() => 
      sessions.value.find(s => s.id === currentSessionId.value)
    );
    
    const currentMessages = computed(() => 
      currentSession.value ? currentSession.value.messages : []
    );
    
    const systemPrompt = ref('You are a helpful AI assistant.');
    const showSystemPrompt = ref(false);
    
    // 文件浏览器状态
    const currentPath = ref('');
    const fileList = ref([]);
    const canGoUp = ref(false);
    const selectedFile = ref(null);
    const fileContent = ref('');
    const showFilePreview = ref(false);
    
    // 聊天状态
    const userInput = ref('');
    const isLoading = ref(false);
    const selectedProvider = ref('openai');
    const messagesContainer = ref(null);
    
    // Agent 模式状态
    const mode = ref('chat');
    const agentCommand = ref('');
    const agentResult = ref('');
    const agentHistory = ref([]);
    const isAgentRunning = ref(false);
    
    // 系统信息
    const systemInfo = ref({
      platform: '',
      arch: '',
      homedir: '',
      cwd: '',
      version: ''
    });
    
    // 初始化
    onMounted(async () => {
      await loadData();
      await loadSystemInfo();
      await initializeFileBrowser();
      
      // 如果没有会话，创建一个默认会话
      if (sessions.value.length === 0) {
        await createSession();
      }
      
      // 滚动到底部
      scrollToBottom();
    });
    
    // 数据加载
    async function loadData() {
      try {
        const [configs, sess, currentId] = await Promise.all([
          window.electronAPI.storeGet('apiConfigs'),
          window.electronAPI.storeGet('sessions'),
          window.electronAPI.storeGet('currentSessionId')
        ]);
        
        if (configs) {
          apiConfigs.value = { ...apiConfigs.value, ...configs };
        }
        
        if (sess) {
          sessions.value = sess;
        }
        
        if (currentId) {
          currentSessionId.value = currentId;
        }
        
        if (currentSession.value && currentSession.value.systemPrompt) {
          systemPrompt.value = currentSession.value.systemPrompt;
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }
    
    // 保存 API 配置
    async function saveApiConfigs() {
      try {
        await window.electronAPI.storeSet('apiConfigs', apiConfigs.value);
      } catch (error) {
        console.error('Failed to save API configs:', error);
      }
    }
    
    // 系统信息
    async function loadSystemInfo() {
      try {
        const info = await window.electronAPI.getSystemInfo();
        systemInfo.value = info;
        if (!currentPath.value) {
          currentPath.value = info.cwd || info.homedir || 'C:\\';
        }
      } catch (error) {
        console.error('Failed to load system info:', error);
      }
    }
    
    // 文件浏览器
    async function initializeFileBrowser() {
      try {
        const defaultPath = systemInfo.value.homedir || systemInfo.value.cwd || 'C:\\';
        await changeDirectory(defaultPath);
      } catch (error) {
        console.error('Failed to initialize file browser:', error);
      }
    }
    
    async function changeDirectory(path = currentPath.value) {
      try {
        const result = await window.electronAPI.fsList(path);
        if (result.success) {
          fileList.value = result.files;
          currentPath.value = path;
          
          // 检查是否可以向上导航
          const parentPath = path.split('\\').slice(0, -1).join('\\') || path.split('/').slice(0, -1).join('/');
          canGoUp.value = parentPath && parentPath !== path;
        } else {
          alert(`Failed to list directory: ${result.error}`);
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
    
    async function goUpDirectory() {
      if (!canGoUp.value) return;
      
      const path = currentPath.value;
      const separator = path.includes('\\') ? '\\' : '/';
      const parts = path.split(separator).filter(part => part);
      
      if (parts.length > 1) {
        parts.pop();
        const newPath = parts.join(separator) + (separator === '\\' ? '\\' : '/');
        await changeDirectory(newPath);
      } else {
        // 根目录
        const root = parts[0] ? parts[0] + separator : separator;
        await changeDirectory(root);
      }
    }
    
    async function enterDirectory(dirPath) {
      await changeDirectory(dirPath);
    }
    
    async function refreshDirectory() {
      await changeDirectory(currentPath.value);
    }
    
    async function selectFile(file) {
      selectedFile.value = file;
    }
    
    async function readFile(filePath) {
      try {
        const result = await window.electronAPI.fsRead(filePath);
        if (result.success) {
          fileContent.value = result.data;
          showFilePreview.value = true;
        } else {
          alert(`Failed to read file: ${result.error}`);
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
    
    // 会话管理
    async function createSession(name) {
      try {
        const session = await window.electronAPI.sessionsCreate(name);
        sessions.value.push(session);
        currentSessionId.value = session.id;
        
        // 保存到存储
        await window.electronAPI.storeSet('sessions', sessions.value);
        await window.electronAPI.storeSet('currentSessionId', session.id);
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    }
    
    async function switchSession(sessionId) {
      try {
        currentSessionId.value = sessionId;
        await window.electronAPI.storeSet('currentSessionId', sessionId);
        
        // 加载会话的系统提示词
        const session = sessions.value.find(s => s.id === sessionId);
        if (session && session.systemPrompt) {
          systemPrompt.value = session.systemPrompt;
        }
      } catch (error) {
        console.error('Failed to switch session:', error);
      }
    }
    
    async function renameSession(session) {
      const newName = prompt('Enter new session name:', session.name);
      if (newName && newName !== session.name) {
        try {
          const result = await window.electronAPI.sessionsUpdate(session.id, { name: newName });
          if (result.success) {
            const index = sessions.value.findIndex(s => s.id === session.id);
            if (index !== -1) {
              sessions.value[index] = result.session;
              
              // 保存到存储
              await window.electronAPI.storeSet('sessions', sessions.value);
            }
          }
        } catch (error) {
          console.error('Failed to rename session:', error);
        }
      }
    }
    
    async function deleteSession(sessionId) {
      if (!confirm('Are you sure you want to delete this session?')) return;
      
      try {
        await window.electronAPI.sessionsDelete(sessionId);
        
        // 更新本地状态
        sessions.value = sessions.value.filter(s => s.id !== sessionId);
        
        if (sessions.value.length === 0) {
          await createSession();
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
    
    // 聊天功能
    async function sendMessage() {
      const message = userInput.value.trim();
      if (!message || isLoading.value) return;
      
      // 添加用户消息
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      try {
        // 更新会话消息
        const messages = [...currentMessages.value, userMessage];
        await updateSessionMessages(messages);
        
        // 清空输入
        userInput.value = '';
        isLoading.value = true;
        
        // 滚动到底部
        scrollToBottom();
        
        // 准备 AI 消息
        const aiMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isThinking: true
        };
        
        // 添加思考中的 AI 消息
        const messagesWithThinking = [...messages, aiMessage];
        await updateSessionMessages(messagesWithThinking);
        
        // 构建 API 消息
        const apiMessages = [
          { role: 'system', content: systemPrompt.value },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ];
        
        // 调用 AI API
        const result = await window.electronAPI.aiChat(
          selectedProvider.value,
          apiMessages,
          {}
        );
        
        if (result.success) {
          // 更新 AI 消息
          const finalMessages = messagesWithThinking.slice(0, -1); // 移除思考中的消息
          const finalAiMessage = {
            role: 'assistant',
            content: result.data.choices[0].message.content,
            timestamp: new Date().toISOString()
          };
          
          await updateSessionMessages([...finalMessages, finalAiMessage]);
        } else {
          // 添加错误消息
          const errorMessage = {
            role: 'assistant',
            content: `Error: ${result.error}`,
            timestamp: new Date().toISOString(),
            isError: true
          };
          
          const finalMessages = messagesWithThinking.slice(0, -1);
          await updateSessionMessages([...finalMessages, errorMessage]);
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        
        // 添加错误消息
        const errorMessage = {
          role: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: new Date().toISOString(),
          isError: true
        };
        
        const messages = currentMessages.value.filter(m => !m.isThinking);
        await updateSessionMessages([...messages, errorMessage]);
      } finally {
        isLoading.value = false;
        scrollToBottom();
      }
    }
    
    async function updateSessionMessages(messages) {
      if (!currentSession.value) return;
      
      try {
        const result = await window.electronAPI.sessionsUpdate(currentSession.value.id, {
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          }))
        });
        
        if (result.success) {
          const index = sessions.value.findIndex(s => s.id === currentSession.value.id);
          if (index !== -1) {
            sessions.value[index] = result.session;
            await window.electronAPI.storeSet('sessions', sessions.value);
          }
        }
      } catch (error) {
        console.error('Failed to update session messages:', error);
      }
    }
    
    async function clearChat() {
      if (!currentSession.value) return;
      
      if (confirm('Are you sure you want to clear all messages in this session?')) {
        try {
          const result = await window.electronAPI.sessionsUpdate(currentSession.value.id, {
            messages: []
          });
          
          if (result.success) {
            const index = sessions.value.findIndex(s => s.id === currentSession.value.id);
            if (index !== -1) {
              sessions.value[index] = result.session;
              await window.electronAPI.storeSet('sessions', sessions.value);
            }
          }
        } catch (error) {
          console.error('Failed to clear chat:', error);
        }
      }
    }
    
    // 系统提示词
    function toggleSystemPrompt() {
      showSystemPrompt.value = !showSystemPrompt.value;
    }
    
    async function saveSystemPrompt() {
      if (!currentSession.value) return;
      
      try {
        const result = await window.electronAPI.sessionsUpdate(currentSession.value.id, {
          systemPrompt: systemPrompt.value
        });
        
        if (result.success) {
          const index = sessions.value.findIndex(s => s.id === currentSession.value.id);
          if (index !== -1) {
            sessions.value[index] = result.session;
            await window.electronAPI.storeSet('sessions', sessions.value);
          }
          
          showSystemPrompt.value = false;
        }
      } catch (error) {
        console.error('Failed to save system prompt:', error);
      }
    }
    
    // Agent 模式
    async function executeAgent() {
      const command = agentCommand.value.trim();
      if (!command || isAgentRunning.value) return;
      
      isAgentRunning.value = true;
      agentResult.value = '';
      
      try {
        // 第一步：让 AI 分析命令并生成执行计划
        const planPrompt = `You are an AI assistant with access to file system operations. The user wants to execute this command: "${command}"

Available tools:
1. fs:list(directory) - List files and directories
2. fs:read(filePath) - Read file contents
3. fs:write(filePath, content) - Write content to file
4. fs:mkdir(directory) - Create directory
5. fs:delete(path) - Delete file or directory
6. exec:command(command, cwd) - Execute shell command

Please analyze the command and generate a step-by-step execution plan. For each step, specify:
- Tool to use
- Parameters
- Expected output

Only generate the plan, do not execute it yet.`;

        const planResult = await window.electronAPI.aiChat(
          selectedProvider.value,
          [
            { role: 'system', content: systemPrompt.value },
            { role: 'user', content: planPrompt }
          ],
          {}
        );
        
        if (!planResult.success) {
          throw new Error(`Failed to generate plan: ${planResult.error}`);
        }
        
        const plan = planResult.data.choices[0].message.content;
        agentResult.value = `Execution Plan:\n${plan}\n\n`;
        
        // 第二步：执行计划（简化版本 - 在实际应用中需要更复杂的解析）
        // 这里我们简化处理，只执行一些常见的操作模式
        
        let executionLog = '';
        
        if (command.toLowerCase().includes('list') || command.toLowerCase().includes('ls')) {
          // 列出文件
          const pathMatch = command.match(/([A-Z]:\\[^\\]*(?:\\[^\\]*)*)/i) || 
                           command.match(/(\/[^\/]*(?:\/[^\/]*)*)/i);
          const targetPath = pathMatch ? pathMatch[1] : currentPath.value;
          
          executionLog += `Listing directory: ${targetPath}\n`;
          const result = await window.electronAPI.fsList(targetPath);
          
          if (result.success) {
            executionLog += `Found ${result.files.length} items:\n`;
            result.files.forEach(file => {
              executionLog += `  ${file.isDirectory ? '[DIR]' : '[FILE]'} ${file.name}\n`;
            });
          } else {
            executionLog += `Error: ${result.error}\n`;
          }
        } else if (command.toLowerCase().includes('read') && command.toLowerCase().includes('file')) {
          // 读取文件
          const fileMatch = command.match(/([A-Z]:\\[^\\]*(?:\\[^\\]*)*\.[a-zA-Z0-9]+)/i) ||
                           command.match(/(\/[^\/]*(?:\/[^\/]*)*\.[a-zA-Z0-9]+)/i);
          
          if (fileMatch) {
            const filePath = fileMatch[1];
            executionLog += `Reading file: ${filePath}\n`;
            
            // 安全确认
            const confirmResult = await window.electronAPI.confirmAction({
              title: 'Confirm File Read',
              message: `Are you sure you want to read ${filePath}?`,
              detail: 'This action will access the file system.'
            });
            
            if (confirmResult.confirmed) {
              const result = await window.electronAPI.fsRead(filePath);
              if (result.success) {
                executionLog += `File content (first 1000 chars):\n${result.data.substring(0, 1000)}\n`;
                if (result.data.length > 1000) {
                  executionLog += `\n... and ${result.data.length - 1000} more characters\n`;
                }
              } else {
                executionLog += `Error: ${result.error}\n`;
              }
            } else {
              executionLog += 'Operation cancelled by user.\n';
            }
          } else {
            executionLog += 'Could not extract file path from command.\n';
          }
        } else if (command.toLowerCase().includes('create') || command.toLowerCase().includes('make')) {
          // 创建文件或目录
          executionLog += 'Creating file/directory based on command...\n';
          
          // 安全确认
          const confirmResult = await window.electronAPI.confirmAction({
            title: 'Confirm Creation',
            message: 'Are you sure you want to create new files or directories?',
            detail: 'This action will modify the file system.'
          });
          
          if (confirmResult.confirmed) {
            // 简单示例：在当前目录创建测试文件
            const testFilePath = `${currentPath.value}/test_${Date.now()}.txt`;
            const result = await window.electronAPI.fsWrite(
              testFilePath,
              `This is a test file created by AI Assistant on ${new Date().toISOString()}\nUser command: ${command}`
            );
            
            if (result.success) {
              executionLog += `Created file: ${testFilePath}\n`;
            } else {
              executionLog += `Error: ${result.error}\n`;
            }
          } else {
            executionLog += 'Operation cancelled by user.\n';
          }
        } else {
          // 通用命令执行
          executionLog += `Executing command: ${command}\n`;
          
          const confirmResult = await window.electronAPI.confirmAction({
            title: 'Confirm Command Execution',
            message: 'Are you sure you want to execute this command?',
            detail: 'This may execute shell commands which could be dangerous.'
          });
          
          if (confirmResult.confirmed) {
            const result = await window.electronAPI.execCommand(command, currentPath.value);
            if (result.success) {
              executionLog += `Output:\n${result.stdout}\n`;
              if (result.stderr) {
                executionLog += `Errors:\n${result.stderr}\n`;
              }
            } else {
              executionLog += `Error: ${result.error}\n`;
              if (result.stdout) executionLog += `Output: ${result.stdout}\n`;
              if (result.stderr) executionLog += `Errors: ${result.stderr}\n`;
            }
          } else {
            executionLog += 'Operation cancelled by user.\n';
          }
        }
        
        agentResult.value += `\nExecution Log:\n${executionLog}`;
        
        // 保存到历史记录
        agentHistory.value.unshift({
          command,
          result: agentResult.value.substring(0, 500),
          timestamp: new Date().toISOString()
        });
        
        // 限制历史记录数量
        if (agentHistory.value.length > 10) {
          agentHistory.value = agentHistory.value.slice(0, 10);
        }
        
      } catch (error) {
        agentResult.value = `Error executing agent: ${error.message}`;
      } finally {
        isAgentRunning.value = false;
      }
    }
    
    function executeAgentCommand(command) {
      agentCommand.value = command;
      mode.value = 'agent';
      executeAgent();
    }
    
    // 工具函数
    function formatTime(isoString) {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    async function copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy to clipboard');
      }
    }
    
    function scrollToBottom() {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    }
    
    function insertFileReference() {
      if (selectedFile.value) {
        userInput.value += ` [File: ${selectedFile.value.name}]`;
      } else {
        alert('Please select a file first from the file browser.');
      }
    }
    
    // 监听消息变化，自动滚动
    watch(currentMessages, () => {
      scrollToBottom();
    }, { deep: true });
    
    return {
      // 状态
      apiConfigs,
      sessions,
      currentSessionId,
      currentSession,
      currentMessages,
      systemPrompt,
      showSystemPrompt,
      currentPath,
      fileList,
      canGoUp,
      selectedFile,
      fileContent,
      showFilePreview,
      userInput,
      isLoading,
      selectedProvider,
      messagesContainer,
      mode,
      agentCommand,
      agentResult,
      agentHistory,
      isAgentRunning,
      systemInfo,
      
      // 方法
      saveApiConfigs,
      createSession,
      switchSession,
      renameSession,
      deleteSession,
      sendMessage,
      clearChat,
      toggleSystemPrompt,
      saveSystemPrompt,
      goUpDirectory,
      changeDirectory,
      enterDirectory,
      refreshDirectory,
      selectFile,
      readFile,
      executeAgent,
      executeAgentCommand,
      formatTime,
      copyToClipboard,
      insertFileReference
    };
  }
}).mount('#app');