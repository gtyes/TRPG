class LogEditor {
    constructor() {
        this.currentRoom = null;
        this.editedMessages = [];
        this.isEditing = false;
    this.currentPage = 1;
    this.messagesPerPage = 50;
    this.appSettings = {
        pageBackground: {
            type: 'gradient',
            color1: '#667eea',
            color2: '#764ba2',
            image: null
        },
        logContainer: {
            backgroundColor: '#ffffff',
            backgroundImage: null,
            opacity: 1
        },
        channels: {
            'main': { name: '主频道', color: '#e3f2fd', backgroundColor: 'rgba(227,242,253,0.3)' }
        },
        characters: {},
        chapters: []
    };
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        await this.loadSavedRooms();
        this.checkUrlParameters();
    this.initializePagination();
    this.loadAppSettings();
    this.initializeSettingsPanels();
    }

    setupEventListeners() {
        // 房间加载
        document.getElementById('loadRoomBtn').addEventListener('click', () => this.loadOriginalRoom());
        document.getElementById('roomIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadOriginalRoom();
        });

        // 编辑工具
        document.getElementById('addMessageBtn').addEventListener('click', () => this.showAddMessageModal());
        document.getElementById('importJsonBtn').addEventListener('click', () => this.importJson());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJson());
        document.getElementById('saveToBlogBtn').addEventListener('click', () => this.saveToBlog());

        // 发布
        document.getElementById('publishBtn').addEventListener('click', () => this.publishRoom());
        document.getElementById('previewBtn').addEventListener('click', () => this.previewRoom());

    // ↓↓↓ 新增分页事件绑定 ↓↓↓
    document.getElementById('prevPage').addEventListener('click', () => this.previousPage());
    document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
    document.getElementById('addPageBtn').addEventListener('click', () => this.addNewPage());
    document.getElementById('pageSelect').addEventListener('change', (e) => this.goToPage(parseInt(e.target.value)));

        // 模态框
        document.getElementById('addMessageForm').addEventListener('submit', (e) => this.handleAddMessage(e));
    // ↓↓↓ 新增章节表单事件 ↓↓↓
    document.getElementById('addChapterForm').addEventListener('submit', (e) => this.handleAddChapter(e));
    // ↓↓↓ 新增背景设置事件绑定 ↓↓↓
    document.getElementById('pageBgColor').addEventListener('change', (e) => this.updatePageBackgroundColor(e.target.value, document.getElementById('pageBgColor2').value));
    document.getElementById('pageBgColor2').addEventListener('change', (e) => this.updatePageBackgroundColor(document.getElementById('pageBgColor').value, e.target.value));
    document.getElementById('pageBgImage').addEventListener('change', (e) => this.handleBackgroundImageUpload(e, 'page'));
    document.getElementById('logBgImage').addEventListener('change', (e) => this.handleBackgroundImageUpload(e, 'log'));
    document.getElementById('logBgColor').addEventListener('change', (e) => this.updateLogBackground(e.target.value));
    document.getElementById('logBgOpacity').addEventListener('input', (e) => this.updateLogOpacity(e.target.value));
}

    // 加载原始房间数据
    async loadOriginalRoom() {
        const roomId = document.getElementById('roomIdInput').value.trim();
        if (!roomId) {
            alert('请输入房间ID');
            return;
        }

        try {
            const messages = await this.fetchAllMessages(roomId);
            this.currentRoom = {
                id: roomId,
                originalId: roomId,
                title: `房间: ${roomId}`,
                description: '从ccfolia导入的跑团记录',
                messages: messages,
                lastUpdated: new Date().toISOString()
            };
            
            this.editedMessages = this.processMessages(messages);
            this.displayMessages();
            this.updateStats();
            
            document.getElementById('roomTitle').value = this.currentRoom.title;
            document.getElementById('roomDescription').value = this.currentRoom.description;
            
        } catch (error) {
            alert('加载失败: ' + error.message);
        }
    }

    // 获取所有消息（分页）
    async fetchAllMessages(roomId) {
        let allMessages = [];
        let nextPageToken = "";
        const pageSize = 300;

        do {
            const url = `https://firestore.googleapis.com/v1/projects/ccfolia-160aa/databases/(default)/documents/rooms/${roomId}/messages?pageSize=${pageSize}&pageToken=${nextPageToken}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`请求失败: ${response.status}`);
            
            const data = await response.json();
            if (data.documents) allMessages.push(...data.documents);
            nextPageToken = data.nextPageToken || "";
            
        } while (nextPageToken);

        return allMessages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
    }

    // 处理消息数据
    processMessages(messages) {
        return messages.map(msg => {
            const fields = msg.fields;
            return {
                id: msg.name.split('/').pop(),
                createTime: msg.createTime,
                updateTime: msg.updateTime,
                character: {
                    name: fields.name?.stringValue || '未知',
                    color: fields.color?.stringValue || '#666666',
                    from: fields.from?.stringValue
                },
                content: fields.text?.stringValue || '',
                type: fields.type?.stringValue,
                channel: fields.channelName?.stringValue,
                isEdited: fields.edited?.booleanValue,
                isPrivate: !!fields.to?.stringValue,
                dice: fields.extend?.mapValue?.fields?.roll ? {
                    result: fields.extend.mapValue.fields.roll.mapValue.fields.result?.stringValue,
                    success: fields.extend.mapValue.fields.roll.mapValue.fields.success?.booleanValue,
                    critical: fields.extend.mapValue.fields.roll.mapValue.fields.critical?.booleanValue,
                    fumble: fields.extend.mapValue.fields.roll.mapValue.fields.fumble?.booleanValue
                } : null
            };
        });
    }

    // 显示消息列表
    displayMessages() {
        const container = document.getElementById('messagesList');
        container.innerHTML = this.editedMessages.map((msg, index) => this.createMessageEditorHTML(msg, index)).join('');
        
        this.setupDragAndDrop();
    }

    // 创建消息编辑器HTML
    createMessageEditorHTML(message, index) {
        return `
            <div class="message-editor-item" data-index="${index}" draggable="true">
                <div class="message-header-editor">
                    <input type="text" class="character-name" value="${message.character.name}" 
                           onchange="logEditor.updateCharacterName(${index}, this.value)">
                    <input type="color" class="character-color" value="${message.character.color}"
                           onchange="logEditor.updateCharacterColor(${index}, this.value)">
                    <span class="message-time">${new Date(message.createTime).toLocaleString('zh-CN')}</span>
                </div>
                <textarea class="message-content-editor" onchange="logEditor.updateMessageContent(${index}, this.value)">${message.content}</textarea>
                ${message.dice ? `<div class="dice-result">🎲 ${message.dice.result}</div>` : ''}
                <div class="message-actions">
                    <button class="btn-delete" onclick="logEditor.deleteMessage(${index})">删除</button>
                </div>
            </div>
        `;
    }

    // 消息编辑方法
    updateCharacterName(index, name) {
        this.editedMessages[index].character.name = name;
    }

    updateCharacterColor(index, color) {
        this.editedMessages[index].character.color = color;
    }

    updateMessageContent(index, content) {
        this.editedMessages[index].content = content;
    }

    deleteMessage(index) {
        if (confirm('确定要删除这条消息吗？')) {
            this.editedMessages.splice(index, 1);
            this.displayMessages();
            this.updateStats();
        }
    }

    // 添加新消息
    showAddMessageModal() {
        document.getElementById('addMessageModal').style.display = 'block';
    }

    handleAddMessage(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newMessage = {
            id: 'new-' + Date.now(),
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            character: {
                name: formData.get('characterName'),
                color: formData.get('characterColor'),
                from: 'editor'
            },
            content: formData.get('content'),
            type: 'text',
            channel: 'main',
            isEdited: false,
            isPrivate: false,
            dice: null
        };

        this.editedMessages.push(newMessage);
        this.displayMessages();
        this.updateStats();
        this.closeModal();
        e.target.reset();
    }

    // 导入/导出
    exportJson() {
        const data = this.prepareExportData();
        this.downloadJSON(data, `trpg-log-${this.currentRoom?.id || 'new'}.json`);
    }

    importJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.loadImportedData(data);
                } catch (error) {
                    alert('文件格式错误');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    loadImportedData(data) {
        this.currentRoom = {
            id: data.roomId || 'imported',
            title: data.title || '导入的房间',
            description: data.description || '从JSON文件导入',
            messages: data.messages || [],
            lastUpdated: new Date().toISOString()
        };
        
        this.editedMessages = data.messages || [];
        this.displayMessages();
        this.updateStats();
        
        document.getElementById('roomTitle').value = this.currentRoom.title;
        document.getElementById('roomDescription').value = this.currentRoom.description;
    }

    // 保存到博客
    async saveToBlog() {
        if (!this.currentRoom) {
            alert('请先加载或创建房间');
            return;
        }

        const roomData = this.prepareRoomData();
        
        // 这里应该是保存到GitHub的逻辑
        // 由于GitHub Pages是静态的，我们需要通过Git提交
        // 这里先提供下载功能
        this.downloadJSON(roomData, `${roomData.id}-edited.json`);
        
        alert('房间数据已准备就绪！请将下载的JSON文件上传到网站的data/目录，并更新rooms.json');
    }

prepareRoomData() {
    const roomData = {
        id: this.currentRoom.id,
        originalId: this.currentRoom.originalId,
        title: document.getElementById('roomTitle').value || this.currentRoom.title,
        description: document.getElementById('roomDescription').value || this.currentRoom.description,
        lastUpdated: new Date().toISOString(),
        messageCount: this.editedMessages.length,
        originalMessageCount: this.currentRoom.messages.length,
        messages: this.editedMessages,
        // ↓↓↓ 新增这一行，包含应用设置 ↓↓↓
        appSettings: this.appSettings
    };
    
    return roomData;
}


    prepareExportData() {
        return {
            roomId: this.currentRoom?.id,
            title: document.getElementById('roomTitle').value,
            description: document.getElementById('roomDescription').value,
            exportTime: new Date().toISOString(),
            messages: this.editedMessages
        };
    }

    // 工具方法
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updateStats() {
        const statsElement = document.getElementById('statsInfo');
        if (statsElement) {
            statsElement.innerHTML = `
                <div>消息数量: ${this.editedMessages.length}</div>
                <div>角色数量: ${new Set(this.editedMessages.map(m => m.character.name)).size}</div>
                <div>骰子次数: ${this.editedMessages.filter(m => m.dice).length}</div>
            `;
        }
    }

    setupDragAndDrop() {
        // 拖拽排序实现
        const container = document.getElementById('messagesList');
        let draggedItem = null;

        container.querySelectorAll('.message-editor-item').forEach(item => {
            item.addEventListener('dragstart', function() {
                draggedItem = this;
                setTimeout(() => this.classList.add('dragging'), 0);
            });

            item.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                draggedItem = null;
            });
        });

        container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(container, e.clientY);
            if (afterElement) {
                container.insertBefore(draggedItem, afterElement);
            } else {
                container.appendChild(draggedItem);
            }
        });

        container.addEventListener('drop', e => {
            e.preventDefault();
            this.updateMessageOrder();
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.message-editor-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updateMessageOrder() {
        const container = document.getElementById('messagesList');
        const newOrder = Array.from(container.querySelectorAll('.message-editor-item')).map(item => {
            return parseInt(item.dataset.index);
        });
        
        this.editedMessages = newOrder.map(index => this.editedMessages[index]);
        this.displayMessages();
    }

    async loadSavedRooms() {
        try {
            const response = await fetch('data/rooms.json');
            const rooms = await response.json();
            this.displaySavedRooms(rooms);
        } catch (error) {
            console.error('加载已保存房间失败:', error);
        }
    }

    displaySavedRooms(rooms) {
        const container = document.getElementById('savedRoomsList');
        if (container && rooms.length > 0) {
            container.innerHTML = rooms.map(room => `
                <div class="saved-room-item" onclick="logEditor.loadSavedRoom('${room.id}')">
                    <strong>${room.title}</strong>
                    <div style="font-size: 0.8rem; color: #bdc3c7;">${room.messageCount} 条消息</div>
                </div>
            `).join('');
        }
    }

    async loadSavedRoom(roomId) {
        try {
            const response = await fetch(`data/${roomId}-edited.json`);
            const roomData = await response.json();
            
            this.currentRoom = roomData;
            this.editedMessages = roomData.messages;
            this.displayMessages();
            this.updateStats();
            
            document.getElementById('roomTitle').value = roomData.title;
            document.getElementById('roomDescription').value = roomData.description;
            document.getElementById('roomIdInput').value = roomData.originalId || '';
            
        } catch (error) {
            alert('加载已保存房间失败: ' + error.message);
        }
    }

    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            document.getElementById('roomIdInput').value = roomId;
            this.loadSavedRoom(roomId);
        }
    }

    previewRoom() {
        const roomData = this.prepareRoomData();
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(`
            <html>
                <head>
                    <title>预览: ${roomData.title}</title>
                    <link rel="stylesheet" href="../styles/blog.css">
                </head>
                <body>
                    <div class="log-container">
                        <div class="log-header">
                            <h1 class="log-title">${roomData.title}</h1>
                            <div class="log-meta">预览模式</div>
                        </div>
                        <div id="previewMessages"></div>
                    </div>
                    <script>
                        const messages = ${JSON.stringify(roomData.messages)};
                        const container = document.getElementById('previewMessages');
                        container.innerHTML = messages.map(msg => {
                            const time = new Date(msg.createTime).toLocaleString('zh-CN');
                            return \`
                                <div class="message">
                                    <div class="message-header">
                                        <span class="character-name" style="color: \${msg.character.color}">
                                            \${msg.character.name}
                                        </span>
                                        <span class="message-time">\${time}</span>
                                    </div>
                                    <div class="message-content">\${msg.content}</div>
                                    \${msg.dice ? \`<div class="dice-result">\${msg.dice.result}</div>\` : ''}
                                </div>
                            \`;
                        }).join('');
                    </script>
                </body>
            </html>
        `);
    }

    publishRoom() {
        this.saveToBlog();
    }
// ========== 新增的外观设置方法 ==========

// 初始化设置面板
initializeSettingsPanels() {
    // 默认打开外观设置面板
    this.togglePanel('appearance');
    this.updateChannelSettings();
    this.updateCharacterSettings();
    this.updateChapterList();
}

togglePanel(panelName) {
    const panels = ['appearance', 'channels', 'characters', 'chapters'];
    panels.forEach(panel => {
        const element = document.getElementById(panel + 'Panel');
        if (element) {
            element.classList.toggle('active', panel === panelName);
        }
    });
}

// 页面背景设置
updatePageBackgroundColor(color1, color2) {
    this.appSettings.pageBackground.color1 = color1;
    this.appSettings.pageBackground.color2 = color2;
    this.applyPageBackground('gradient');
}

applyPageBackground(type) {
    this.appSettings.pageBackground.type = type;
    
    if (type === 'gradient') {
        document.body.style.background = `linear-gradient(135deg, ${this.appSettings.pageBackground.color1} 0%, ${this.appSettings.pageBackground.color2} 100%)`;
    } else if (type === 'solid') {
        document.body.style.background = this.appSettings.pageBackground.color1;
    }
    
    if (this.appSettings.pageBackground.image) {
        document.body.style.backgroundImage = `url(${this.appSettings.pageBackground.image})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
    }
    
    this.saveAppSettings();
}

handleBackgroundImageUpload(event, type) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (type === 'page') {
                this.appSettings.pageBackground.image = e.target.result;
                this.applyPageBackground(this.appSettings.pageBackground.type);
            } else if (type === 'log') {
                this.appSettings.logContainer.backgroundImage = e.target.result;
                this.updateLogBackground(this.appSettings.logContainer.backgroundColor);
            }
        };
        reader.readAsDataURL(file);
    }
}

// 日志容器背景设置
updateLogBackground(color) {
    this.appSettings.logContainer.backgroundColor = color;
    const logContainer = document.querySelector('.log-container');
    if (logContainer) {
        let background = color;
        if (this.appSettings.logContainer.backgroundImage) {
            background = `linear-gradient(rgba(255,255,255,${this.appSettings.logContainer.opacity}), rgba(255,255,255,${this.appSettings.logContainer.opacity})), url(${this.appSettings.logContainer.backgroundImage})`;
        }
        logContainer.style.background = background;
        logContainer.style.backgroundSize = 'cover';
    }
    this.saveAppSettings();
}

updateLogOpacity(value) {
    this.appSettings.logContainer.opacity = value / 100;
    document.getElementById('logOpacityValue').textContent = value + '%';
    this.updateLogBackground(this.appSettings.logContainer.backgroundColor);
}

// ========== 新增的频道设置方法 ==========

updateChannelSettings() {
    const container = document.getElementById('channelSettings');
    container.innerHTML = '';
    
    Object.entries(this.appSettings.channels).forEach(([channelId, channel]) => {
        const channelElement = document.createElement('div');
        channelElement.className = 'channel-item';
        channelElement.innerHTML = `
            <h4>${channel.name}</h4>
            <input type="text" value="${channel.name}" placeholder="频道名称" 
                   onchange="logEditor.updateChannelName('${channelId}', this.value)">
            <input type="color" value="${channel.color}" 
                   onchange="logEditor.updateChannelColor('${channelId}', this.value)">
            <input type="color" value="${channel.backgroundColor}" 
                   onchange="logEditor.updateChannelBackground('${channelId}', this.value)">
            <button onclick="logEditor.removeChannel('${channelId}')">删除</button>
        `;
        container.appendChild(channelElement);
    });
}

addChannel() {
    const channelId = 'channel-' + Date.now();
    this.appSettings.channels[channelId] = {
        name: '新频道',
        color: '#e3f2fd',
        backgroundColor: 'rgba(227,242,253,0.3)'
    };
    this.updateChannelSettings();
    this.updateChannelSelect();
    this.saveAppSettings();
}

updateChannelName(channelId, name) {
    this.appSettings.channels[channelId].name = name;
    this.updateChannelSelect();
    this.saveAppSettings();
}

updateChannelColor(channelId, color) {
    this.appSettings.channels[channelId].color = color;
    this.saveAppSettings();
}

updateChannelBackground(channelId, backgroundColor) {
    this.appSettings.channels[channelId].backgroundColor = backgroundColor;
    this.saveAppSettings();
}

removeChannel(channelId) {
    if (Object.keys(this.appSettings.channels).length > 1) {
        delete this.appSettings.channels[channelId];
        this.updateChannelSettings();
        this.updateChannelSelect();
        this.saveAppSettings();
    } else {
        alert('至少需要保留一个频道');
    }
}

updateChannelSelect() {
    const select = document.querySelector('#addMessageForm select[name="channel"]');
    if (select) {
        select.innerHTML = Object.entries(this.appSettings.channels)
            .map(([id, channel]) => `<option value="${id}">${channel.name}</option>`)
            .join('');
    }
}

// ========== 新增的角色设置方法 ==========

updateCharacterSettings() {
    const container = document.getElementById('characterSettings');
    container.innerHTML = '';
    
    const characters = this.getAllCharacters();
    characters.forEach(character => {
        const characterElement = document.createElement('div');
        characterElement.className = 'character-item';
        characterElement.innerHTML = `
            <img src="${character.iconUrl || ''}" class="avatar-preview ${!character.iconUrl ? 'empty' : ''}" 
                 onerror="this.src=''; this.classList.add('empty')"
                 alt="${character.name}">
            <span>${character.name}</span>
            <input type="color" value="${character.color}" 
                   onchange="logEditor.updateAllCharacterMessages('${character.name}', 'color', this.value)"
                   style="margin-left: auto;">
            <input type="text" value="${character.iconUrl || ''}" placeholder="头像URL"
                   onchange="logEditor.updateAllCharacterMessages('${character.name}', 'iconUrl', this.value)"
                   style="flex: 1;">
        `;
        container.appendChild(characterElement);
    });
}

getAllCharacters() {
    const characterMap = new Map();
    this.editedMessages.forEach(message => {
        const charName = message.character.name;
        if (!characterMap.has(charName)) {
            characterMap.set(charName, {
                name: charName,
                color: message.character.color,
                iconUrl: message.character.iconUrl
            });
        }
    });
    return Array.from(characterMap.values());
}

updateAllCharacterMessages(characterName, property, value) {
    this.editedMessages.forEach(message => {
        if (message.character.name === characterName) {
            if (property === 'color') {
                message.character.color = value;
            } else if (property === 'iconUrl') {
                message.character.iconUrl = value || null;
            }
        }
    });
    this.displayMessages();
    this.saveAppSettings();
}

// ========== 新增的章节功能方法 ==========

addChapter() {
    document.getElementById('addChapterModal').style.display = 'block';
}

handleAddChapter(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const chapter = {
        id: 'chapter-' + Date.now(),
        title: formData.get('chapterTitle'),
        description: formData.get('chapterDescription'),
        position: this.getCurrentMessageCount()
    };
    
    this.appSettings.chapters.push(chapter);
    this.insertChapterMarker(chapter);
    this.updateChapterList();
    this.closeModal('addChapterModal');
    e.target.reset();
}

insertChapterMarker(chapter) {
    const chapterMessage = {
        id: chapter.id,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        character: {
            name: '系统',
            color: '#667eea',
            iconUrl: null
        },
        content: '',
        type: 'chapter',
        isChapter: true,
        chapterData: chapter
    };
    
    this.editedMessages.splice(chapter.position, 0, chapterMessage);
    this.displayMessages();
}

updateChapterList() {
    const container = document.getElementById('chapterList');
    container.innerHTML = this.appSettings.chapters.map(chapter => `
        <div class="chapter-item">
            <strong>${chapter.title}</strong>
            <span>位置: ${chapter.position + 1}</span>
            <button onclick="logEditor.removeChapter('${chapter.id}')">删除</button>
        </div>
    `).join('');
}

removeChapter(chapterId) {
    this.appSettings.chapters = this.appSettings.chapters.filter(ch => ch.id !== chapterId);
    this.editedMessages = this.editedMessages.filter(msg => msg.id !== chapterId);
    this.updateChapterList();
    this.displayMessages();
    this.saveAppSettings();
}

// ========== 新增的分页功能方法 ==========

initializePagination() {
    this.currentPage = 1;
    this.messagesPerPage = 50;
    this.updatePaginationControls();
}

updatePaginationControls() {
    const totalPages = Math.ceil(this.editedMessages.length / this.messagesPerPage);
    
    document.getElementById('prevPage').disabled = this.currentPage === 1;
    document.getElementById('nextPage').disabled = this.currentPage === totalPages;
    document.getElementById('pageInfo').textContent = `第 ${this.currentPage} 页 / 共 ${totalPages} 页`;
    
    // 更新页码选择器
    const pageSelect = document.getElementById('pageSelect');
    pageSelect.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `第 ${i} 页`;
        option.selected = i === this.currentPage;
        pageSelect.appendChild(option);
    }
}

getCurrentPageMessages() {
    const startIndex = (this.currentPage - 1) * this.messagesPerPage;
    const endIndex = startIndex + this.messagesPerPage;
    return this.editedMessages.slice(startIndex, endIndex);
}

previousPage() {
    if (this.currentPage > 1) {
        this.currentPage--;
        this.displayMessages();
    }
}

nextPage() {
    const totalPages = Math.ceil(this.editedMessages.length / this.messagesPerPage);
    if (this.currentPage < totalPages) {
        this.currentPage++;
        this.displayMessages();
    }
}

goToPage(page) {
    this.currentPage = page;
    this.displayMessages();
}

addNewPage() {
    // 在分页模式下，添加新页面其实就是增加消息数量
    // 这里我们保持简单，只是更新分页控件
    this.updatePaginationControls();
}

getCurrentMessageCount() {
    return (this.currentPage - 1) * this.messagesPerPage + this.getCurrentPageMessages().length;
}

// ========== 新增的拖拽改进方法 ==========

setupEnhancedDragAndDrop() {
    const container = document.getElementById('messagesList');
    let draggedItem = null;
    let dragStartIndex = null;

    container.querySelectorAll('.message-editor-item, .chapter-marker').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            dragStartIndex = parseInt(item.dataset.index);
            setTimeout(() => item.classList.add('dragging'), 0);
            
            // 设置拖拽图像
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragStartIndex);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedItem = null;
            dragStartIndex = null;
            
            // 移除所有占位符
            document.querySelectorAll('.drag-ghost').forEach(ghost => ghost.remove());
        });
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        const afterElement = this.getDragAfterElement(container, e.clientY);
        const ghosts = document.querySelectorAll('.drag-ghost');
        ghosts.forEach(ghost => ghost.remove());

        if (afterElement) {
            const ghost = document.createElement('div');
            ghost.className = 'drag-ghost';
            container.insertBefore(ghost, afterElement);
        } else {
            const ghost = document.createElement('div');
            ghost.className = 'drag-ghost';
            container.appendChild(ghost);
        }
    });

    container.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedItem) return;

        const afterElement = this.getDragAfterElement(container, e.clientY);
        const dragEndIndex = afterElement ? parseInt(afterElement.dataset.index) : this.editedMessages.length - 1;

        if (dragStartIndex !== null && dragStartIndex !== dragEndIndex) {
            this.moveMessage(dragStartIndex, dragEndIndex);
        }

        document.querySelectorAll('.drag-ghost').forEach(ghost => ghost.remove());
    });
}

moveMessage(fromIndex, toIndex) {
    const [movedItem] = this.editedMessages.splice(fromIndex, 1);
    this.editedMessages.splice(toIndex, 0, movedItem);
    
    // 更新章节位置
    this.appSettings.chapters.forEach(chapter => {
        if (chapter.position === fromIndex) {
            chapter.position = toIndex;
        } else if (chapter.position > fromIndex && chapter.position <= toIndex) {
            chapter.position--;
        } else if (chapter.position < fromIndex && chapter.position >= toIndex) {
            chapter.position++;
        }
    });
    
    this.displayMessages();
    this.saveAppSettings();
}

// ========== 新增的设置保存方法 ==========

saveAppSettings() {
    if (this.currentRoom) {
        const roomId = this.currentRoom.id;
        localStorage.setItem(`trpgAppSettings_${roomId}`, JSON.stringify(this.appSettings));
    }
}

loadAppSettings() {
    if (this.currentRoom) {
        const roomId = this.currentRoom.id;
        const saved = localStorage.getItem(`trpgAppSettings_${roomId}`);
        if (saved) {
            this.appSettings = { ...this.appSettings, ...JSON.parse(saved) };
            this.applySavedSettings();
        }
    }
}

applySavedSettings() {
    // 应用页面背景
    if (this.appSettings.pageBackground.type === 'gradient') {
        this.applyPageBackground('gradient');
    } else {
        this.applyPageBackground('solid');
    }

    // 更新UI控件
    document.getElementById('pageBgColor').value = this.appSettings.pageBackground.color1;
    document.getElementById('pageBgColor2').value = this.appSettings.pageBackground.color2;
    document.getElementById('logBgColor').value = this.appSettings.logContainer.backgroundColor;
    document.getElementById('logBgOpacity').value = this.appSettings.logContainer.opacity * 100;
    document.getElementById('logOpacityValue').textContent = Math.round(this.appSettings.logContainer.opacity * 100) + '%';

    this.updateChannelSettings();
    this.updateCharacterSettings();
    this.updateChapterList();
}
}

// 全局函数
function closeModal() {
    document.getElementById('addMessageModal').style.display = 'none';
}

// 初始化编辑器
let logEditor;
document.addEventListener('DOMContentLoaded', () => {
    logEditor = new LogEditor();
});