class LogEditor {
    constructor() {
        this.currentRoom = null;
        this.editedMessages = [];
        this.isEditing = false;
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        await this.loadSavedRooms();
        this.checkUrlParameters();
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

        // 模态框
        document.getElementById('addMessageForm').addEventListener('submit', (e) => this.handleAddMessage(e));
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
        return {
            id: this.currentRoom.id,
            originalId: this.currentRoom.originalId,
            title: document.getElementById('roomTitle').value || this.currentRoom.title,
            description: document.getElementById('roomDescription').value || this.currentRoom.description,
            lastUpdated: new Date().toISOString(),
            messageCount: this.editedMessages.length,
            originalMessageCount: this.currentRoom.messages.length,
            messages: this.editedMessages
        };
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