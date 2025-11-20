class LogEditor {
    constructor() {
        this.currentRoom = null;
        this.editedMessages = [];
        this.isEditing = false;
        this.currentPage = 1;
        this.pageSize = 50;
        this.styleSettings = {
            background: {
                page: { type: 'gradient', color1: '#667eea', color2: '#764ba2', image: null },
                container: { type: 'color', color: '#ffffff', image: null, opacity: 100 }
            },
            channels: {
                'main': { backgroundColor: 'transparent', opacity: 100 },
                'other': { backgroundColor: '#f0f0f0', opacity: 90 }
            },
            characters: {}
        };
        
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        await this.loadSavedRooms();
        this.checkUrlParameters();
        this.setupTabs();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // 房间加载
        document.getElementById('loadRoomBtn').addEventListener('click', () => this.loadOriginalRoom());
        document.getElementById('roomIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadOriginalRoom();
        });

        // 编辑工具
        document.getElementById('addMessageBtn').addEventListener('click', () => this.showAddMessageModal());
        document.getElementById('addChapterBtn').addEventListener('click', () => this.showAddChapterModal());
        document.getElementById('importJsonBtn').addEventListener('click', () => this.importJson());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJson());
        document.getElementById('saveToBlogBtn').addEventListener('click', () => this.saveToBlog());
        document.getElementById('styleSettingsBtn').addEventListener('click', () => this.showStyleSettings());

        // 分页控件
        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.displayMessages();
        });

        // 发布和预览
        document.getElementById('publishBtn').addEventListener('click', () => this.publishRoom());
        document.getElementById('previewBtn').addEventListener('click', () => this.previewRoom());

        // 模态框
        document.getElementById('addMessageForm').addEventListener('submit', (e) => this.handleAddMessage(e));
        document.getElementById('addChapterForm').addEventListener('submit', (e) => this.handleAddChapter(e));

        // 样式设置
        document.getElementById('containerOpacity').addEventListener('input', (e) => {
            document.getElementById('containerOpacityValue').textContent = e.target.value + '%';
        });
    }

    setupTabs() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // 更新按钮状态
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    // 分页功能
    get paginatedMessages() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        return this.editedMessages.slice(startIndex, endIndex);
    }

    get totalPages() {
        return Math.ceil(this.editedMessages.length / this.pageSize);
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayMessages();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.displayMessages();
        }
    }

    updatePaginationInfo() {
        document.getElementById('pageInfo').textContent = `第 ${this.currentPage} 页 / 共 ${this.totalPages} 页`;
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
    }

    // 样式设置功能
    showStyleSettings() {
        this.loadStyleSettings();
        this.populateStyleSettings();
        document.getElementById('styleSettingsModal').style.display = 'block';
    }

    loadStyleSettings() {
        if (this.currentRoom && this.currentRoom.styleSettings) {
            this.styleSettings = this.currentRoom.styleSettings;
        }
    }

    populateStyleSettings() {
        const bg = this.styleSettings.background.page;
        const container = this.styleSettings.background.container;

        // 设置背景类型
        document.querySelector(`input[name="bgType"][value="${bg.type}"]`).checked = true;
        document.getElementById('pageBgColor').value = bg.color1 || '#667eea';
        document.getElementById('pageBgColor1').value = bg.color1 || '#667eea';
        document.getElementById('pageBgColor2').value = bg.color2 || '#764ba2';

        // 设置容器背景
        document.querySelector(`input[name="containerBgType"][value="${container.type}"]`).checked = true;
        document.getElementById('containerBgColor').value = container.color || '#ffffff';
        document.getElementById('containerOpacity').value = container.opacity || 100;
        document.getElementById('containerOpacityValue').textContent = (container.opacity || 100) + '%';

        // 填充频道设置
        this.populateChannelSettings();
        
        // 填充角色设置
        this.populateCharacterSettings();
    }

    populateChannelSettings() {
        const container = document.getElementById('channelSettings');
        container.innerHTML = '';

        Object.entries(this.styleSettings.channels).forEach(([channelName, settings]) => {
            const channelElement = this.createChannelSettingElement(channelName, settings);
            container.appendChild(channelElement);
        });
    }

    createChannelSettingElement(channelName, settings) {
        const div = document.createElement('div');
        div.className = 'channel-setting-item';
        div.innerHTML = `
            <span class="channel-setting-name">${channelName}</span>
            <input type="color" class="channel-setting-color" value="${settings.backgroundColor}" 
                   onchange="logEditor.updateChannelSetting('${channelName}', 'backgroundColor', this.value)">
            <label>透明度:
                <input type="range" min="0" max="100" value="${settings.opacity}" 
                       onchange="logEditor.updateChannelSetting('${channelName}', 'opacity', this.value)">
            </label>
            <button onclick="logEditor.removeChannelSetting('${channelName}')">删除</button>
        `;
        return div;
    }

    populateCharacterSettings() {
        const container = document.getElementById('characterSettings');
        container.innerHTML = '';

        // 收集所有角色
        const characters = new Map();
        this.editedMessages.forEach(msg => {
            const charName = msg.character.name;
            if (!characters.has(charName)) {
                characters.set(charName, {
                    color: msg.character.color,
                    avatar: msg.character.avatar
                });
            }
        });

        characters.forEach((settings, charName) => {
            const charElement = this.createCharacterSettingElement(charName, settings);
            container.appendChild(charElement);
        });
    }

    createCharacterSettingElement(charName, settings) {
        const div = document.createElement('div');
        div.className = 'character-setting-item';
        div.innerHTML = `
            ${settings.avatar ? `<img src="${settings.avatar}" class="character-setting-avatar" alt="${charName}">` : ''}
            <span class="character-setting-name">${charName}</span>
            <input type="color" class="character-setting-color" value="${settings.color}" 
                   onchange="logEditor.updateCharacterSetting('${charName}', 'color', this.value)">
            <div class="avatar-upload">
                <input type="file" accept="image/*" onchange="logEditor.updateCharacterAvatar('${charName}', this.files[0])">
                <button class="avatar-upload-btn">上传头像</button>
            </div>
        `;
        return div;
    }

    updateChannelSetting(channelName, property, value) {
        if (!this.styleSettings.channels[channelName]) {
            this.styleSettings.channels[channelName] = { backgroundColor: 'transparent', opacity: 100 };
        }
        this.styleSettings.channels[channelName][property] = property === 'opacity' ? parseInt(value) : value;
    }

    addChannelSetting() {
        const channelName = prompt('请输入频道名称:');
        if (channelName && !this.styleSettings.channels[channelName]) {
            this.styleSettings.channels[channelName] = { backgroundColor: '#f0f0f0', opacity: 90 };
            this.populateChannelSettings();
        }
    }

    removeChannelSetting(channelName) {
        if (confirm(`确定要删除频道 "${channelName}" 的设置吗？`)) {
            delete this.styleSettings.channels[channelName];
            this.populateChannelSettings();
        }
    }

    updateCharacterSetting(charName, property, value) {
        if (!this.styleSettings.characters[charName]) {
            this.styleSettings.characters[charName] = {};
        }
        this.styleSettings.characters[charName][property] = value;

        // 更新所有该角色的消息
        this.editedMessages.forEach(msg => {
            if (msg.character.name === charName) {
                msg.character[property] = value;
            }
        });

        this.displayMessages();
    }

    updateCharacterAvatar(charName, file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.updateCharacterSetting(charName, 'avatar', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    applyStyleSettings() {
        const bgType = document.querySelector('input[name="bgType"]:checked').value;
        const containerBgType = document.querySelector('input[name="containerBgType"]:checked').value;

        this.styleSettings.background.page = {
            type: bgType,
            color1: document.getElementById('pageBgColor1').value,
            color2: document.getElementById('pageBgColor2').value,
            image: this.styleSettings.background.page.image // 保持原有图片
        };

        this.styleSettings.background.container = {
            type: containerBgType,
            color: document.getElementById('containerBgColor').value,
            image: this.styleSettings.background.container.image, // 保持原有图片
            opacity: parseInt(document.getElementById('containerOpacity').value)
        };

        // 处理背景图片上传
        const pageBgImage = document.getElementById('pageBgImage').files[0];
        const containerBgImage = document.getElementById('containerBgImage').files[0];

        if (pageBgImage) {
            this.convertImageToDataURL(pageBgImage).then(dataURL => {
                this.styleSettings.background.page.image = dataURL;
            });
        }

        if (containerBgImage) {
            this.convertImageToDataURL(containerBgImage).then(dataURL => {
                this.styleSettings.background.container.image = dataURL;
            });
        }

        this.closeModal('styleSettingsModal');
        this.applyStylesToPreview();
    }

    convertImageToDataURL(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    applyStylesToPreview() {
        // 在实际展示页面中会应用这些样式
        console.log('样式设置已保存:', this.styleSettings);
    }

    // 章节功能
    showAddChapterModal() {
        document.getElementById('addChapterModal').style.display = 'block';
    }

    handleAddChapter(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const chapterMessage = {
            id: 'chapter-' + Date.now(),
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            character: {
                name: '章节',
                color: '#e67e22',
                from: 'system'
            },
            content: '',
            type: 'chapter',
            chapter: {
                title: formData.get('chapterTitle'),
                description: formData.get('chapterDescription') || ''
            },
            isEdited: false,
            isPrivate: false,
            dice: null
        };

        // 在当前选中位置插入章节
        const currentMessages = this.paginatedMessages;
        if (currentMessages.length > 0) {
            const firstMessageId = currentMessages[0].id;
            const index = this.editedMessages.findIndex(msg => msg.id === firstMessageId);
            if (index !== -1) {
                this.editedMessages.splice(index, 0, chapterMessage);
            }
        } else {
            this.editedMessages.push(chapterMessage);
        }

        this.displayMessages();
        this.closeModal('addChapterModal');
        e.target.reset();
    }

    // 拖拽功能优化
    setupDragAndDrop() {
        this.dragSource = null;
        this.dragOverElement = null;
    }

    makeMessageDraggable(element, messageId) {
        element.setAttribute('draggable', 'true');
        element.dataset.messageId = messageId;

        element.addEventListener('dragstart', (e) => {
            this.dragSource = messageId;
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            this.clearDragPlaceholders();
            this.dragSource = null;
        });

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(element, e.clientY);
        });

        element.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(element);
        });
    }

    handleDragOver(element, clientY) {
        this.clearDragPlaceholders();

        const rect = element.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const isBefore = clientY < midpoint;

        const placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder visible';

        if (isBefore) {
            element.parentNode.insertBefore(placeholder, element);
        } else {
            element.parentNode.insertBefore(placeholder, element.nextSibling);
        }

        this.dragOverElement = { element, isBefore };
    }

    handleDrop(targetElement) {
        if (!this.dragSource || !this.dragOverElement) return;

        const sourceIndex = this.editedMessages.findIndex(msg => msg.id === this.dragSource);
        const targetIndex = this.editedMessages.findIndex(msg => msg.id === targetElement.dataset.messageId);

        if (sourceIndex !== -1 && targetIndex !== -1) {
            const [removed] = this.editedMessages.splice(sourceIndex, 1);
            
            let newIndex = this.dragOverElement.isBefore ? targetIndex : targetIndex + 1;
            if (sourceIndex < targetIndex && !this.dragOverElement.isBefore) {
                newIndex--;
            }

            this.editedMessages.splice(newIndex, 0, removed);
            this.displayMessages();
        }

        this.clearDragPlaceholders();
    }

    clearDragPlaceholders() {
        document.querySelectorAll('.drag-placeholder').forEach(el => el.remove());
        this.dragOverElement = null;
    }

    // 显示消息列表（更新版本）
    displayMessages() {
        const container = document.getElementById('messagesList');
        const messagesToShow = this.paginatedMessages;

        if (messagesToShow.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无消息</div>';
            this.updatePaginationInfo();
            return;
        }

        container.innerHTML = messagesToShow.map((msg, index) => {
            const globalIndex = (this.currentPage - 1) * this.pageSize + index;
            return this.createMessageEditorHTML(msg, globalIndex);
        }).join('');

        this.updatePaginationInfo();

        // 为每个消息元素设置拖拽
        container.querySelectorAll('.message-editor-item').forEach((element, index) => {
            const globalIndex = (this.currentPage - 1) * this.pageSize + index;
            const message = this.editedMessages[globalIndex];
            this.makeMessageDraggable(element, message.id);
        });
    }

    // 创建消息编辑器HTML（更新版本）
    createMessageEditorHTML(message, index) {
        const isChapter = message.type === 'chapter';
        const messageClass = isChapter ? 'message-editor-item chapter-message' : 'message-editor-item';
        
        let content = '';

        if (isChapter) {
            content = `
                <div class="chapter-title">${this.escapeHTML(message.chapter.title)}</div>
                ${message.chapter.description ? `<div class="chapter-description">${this.escapeHTML(message.chapter.description)}</div>` : ''}
            `;
        } else {
            const avatarHTML = message.character.avatar ? 
                `<img src="${message.character.avatar}" class="character-avatar" alt="${message.character.name}">` : '';

            content = `
                <div class="message-header-editor">
                    ${avatarHTML}
                    <input type="text" class="character-name" value="${message.character.name}" 
                           onchange="logEditor.updateCharacterName(${index}, this.value)">
                    <input type="color" class="character-color" value="${message.character.color}"
                           onchange="logEditor.updateCharacterColor(${index}, this.value)">
                    <span class="message-time">${new Date(message.createTime).toLocaleString('zh-CN')}</span>
                </div>
                <textarea class="message-content-editor" onchange="logEditor.updateMessageContent(${index}, this.value)">${message.content}</textarea>
                ${message.dice ? `<div class="dice-result">🎲 ${message.dice.result}</div>` : ''}
            `;
        }

        return `
            <div class="${messageClass}" data-message-id="${message.id}">
                ${content}
                <div class="message-actions">
                    <button class="btn-delete" onclick="logEditor.deleteMessage(${index})">删除</button>
                    ${!isChapter ? `<button class="avatar-upload-btn" onclick="logEditor.uploadMessageAvatar(${index})">上传头像</button>` : ''}
                </div>
            </div>
        `;
    }

    uploadMessageAvatar(index) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.editedMessages[index].character.avatar = event.target.result;
                    this.displayMessages();
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    // 原有的消息编辑方法保持不变，但需要更新以支持头像
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

    // 原有的加载、保存等方法保持不变，但需要更新以包含样式设置
    prepareRoomData() {
        return {
            id: this.currentRoom.id,
            originalId: this.currentRoom.originalId,
            title: document.getElementById('roomTitle').value || this.currentRoom.title,
            description: document.getElementById('roomDescription').value || this.currentRoom.description,
            lastUpdated: new Date().toISOString(),
            messageCount: this.editedMessages.length,
            originalMessageCount: this.currentRoom.messages.length,
            styleSettings: this.styleSettings, // 包含样式设置
            messages: this.editedMessages
        };
    }

    // 预览功能更新以包含样式
    previewRoom() {
        const roomData = this.prepareRoomData();
        const previewWindow = window.open('', '_blank');
        
        const stylesHTML = this.generateStyleCSS();
        
        previewWindow.document.write(`
            <html>
                <head>
                    <title>预览: ${roomData.title}</title>
                    <style>${stylesHTML}</style>
                </head>
                <body>
                    <div class="log-container">
                        <div class="log-header">
                            <h1 class="log-title">${roomData.title}</h1>
                            <div class="log-meta">预览模式 | 最后更新: ${new Date(roomData.lastUpdated).toLocaleDateString('zh-CN')}</div>
                        </div>
                        <div id="previewMessages"></div>
                    </div>
                    <script>
                        const messages = ${JSON.stringify(roomData.messages)};
                        const styleSettings = ${JSON.stringify(roomData.styleSettings)};
                        const container = document.getElementById('previewMessages');
                        
                        // 应用样式
                        if (styleSettings) {
                            const bg = styleSettings.background;
                            if (bg.page.type === 'gradient') {
                                document.body.style.background = 'linear-gradient(135deg, ' + bg.page.color1 + ' 0%, ' + bg.page.color2 + ' 100%)';
                            } else if (bg.page.type === 'color') {
                                document.body.style.background = bg.page.color1;
                            } else if (bg.page.type === 'image' && bg.page.image) {
                                document.body.style.backgroundImage = 'url(' + bg.page.image + ')';
                                document.body.style.backgroundSize = 'cover';
                            }
                            
                            if (bg.container.type === 'color') {
                                document.querySelector('.log-container').style.background = bg.container.color;
                            } else if (bg.container.type === 'image' && bg.container.image) {
                                document.querySelector('.log-container').style.backgroundImage = 'url(' + bg.container.image + ')';
                                document.querySelector('.log-container').style.backgroundSize = 'cover';
                            }
                            document.querySelector('.log-container').style.opacity = (bg.container.opacity || 100) / 100;
                        }
                        
                        // 显示消息
                        container.innerHTML = messages.map(msg => {
                            if (msg.type === 'chapter') {
                                return \`
                                    <div class="message chapter-message">
                                        <div class="chapter-title">\${msg.chapter.title}</div>
                                        \${msg.chapter.description ? \`<div class="chapter-description">\${msg.chapter.description}</div>\` : ''}
                                    </div>
                                \`;
                            }
                            
                            const time = new Date(msg.createTime).toLocaleString('zh-CN');
                            const avatarHTML = msg.character.avatar ? 
                                \`<img src="\${msg.character.avatar}" class="character-avatar" alt="\${msg.character.name}">\` : '';
                                
                            return \`
                                <div class="message">
                                    <div class="message-header">
                                        \${avatarHTML}
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

    generateStyleCSS() {
        return `
            body {
                font-family: 'Microsoft YaHei', sans-serif;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
            }
            .log-container {
                max-width: 1000px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                padding: 2rem;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .log-header {
                text-align: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #eee;
            }
            .log-title {
                color: #333;
                margin-bottom: 0.5rem;
            }
            .log-meta {
                color: #666;
                font-size: 0.9rem;
            }
            .message {
                padding: 1rem;
                border-bottom: 1px solid #f0f0f0;
                transition: background 0.3s;
            }
            .message:hover {
                background: #f8f9fa;
            }
            .message-header {
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
                gap: 1rem;
            }
            .character-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
                object-position: top center;
                border: 2px solid #ddd;
            }
            .character-name {
                font-weight: bold;
                font-size: 1.1rem;
            }
            .message-time {
                color: #999;
                font-size: 0.8rem;
            }
            .message-content {
                line-height: 1.6;
            }
            .dice-result {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 0.5rem;
                border-radius: 0 5px 5px 0;
                margin-top: 0.5rem;
                font-family: 'Courier New', monospace;
            }
            .chapter-message {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border-left: 5px solid #e67e22;
                text-align: center;
                font-weight: bold;
                padding: 1.5rem;
                margin: 1rem 0;
                border-radius: 10px;
            }
            .chapter-title {
                font-size: 1.3rem;
                margin-bottom: 0.5rem;
            }
            .chapter-description {
                font-size: 0.9rem;
                opacity: 0.9;
                font-weight: normal;
            }
        `;
    }

    // 工具方法
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // 原有的 loadOriginalRoom, fetchAllMessages, processMessages, 
    // loadSavedRooms, loadSavedRoom, exportJson, importJson 等方法保持不变
    // 只需要确保它们能正确处理新的数据结构

    async loadOriginalRoom() {
        const roomId = document.getElementById('roomIdInput').value.trim();
        if (!roomId) {
            alert('请输入房间ID');
            return;
        }

        try {
            const messages = await this.fetchAllMessages(roomId);
            this.currentRoom = {
                id: this.generateRoomId(),
                originalId: roomId,
                title: `房间: ${roomId}`,
                description: '从ccfolia导入的跑团记录',
                messages: messages,
                lastUpdated: new Date().toISOString()
            };
            
            this.editedMessages = this.processMessages(messages);
            this.currentPage = 1;
            this.displayMessages();
            this.updateStats();
            
            document.getElementById('roomTitle').value = this.currentRoom.title;
            document.getElementById('roomDescription').value = this.currentRoom.description;
            
        } catch (error) {
            alert('加载失败: ' + error.message);
        }
    }

    generateRoomId() {
        return 'room-' + Date.now();
    }

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
                    from: fields.from?.stringValue,
                    avatar: fields.iconUrl?.stringValue || null
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

    updateStats() {
        const statsElement = document.getElementById('statsInfo');
        if (statsElement) {
            const characterCount = new Set(this.editedMessages.map(m => m.character.name)).size;
            const diceCount = this.editedMessages.filter(m => m.dice).length;
            const chapterCount = this.editedMessages.filter(m => m.type === 'chapter').length;
            
            statsElement.innerHTML = `
                <div>消息数量: ${this.editedMessages.length}</div>
                <div>角色数量: ${characterCount}</div>
                <div>骰子次数: ${diceCount}</div>
                <div>章节数量: ${chapterCount}</div>
                <div>当前页: ${this.currentPage}/${this.totalPages}</div>
            `;
        }
    }

    // 原有的 saveToBlog, downloadJSON 等方法保持不变
    saveToBlog() {
        if (!this.currentRoom) {
            alert('请先加载或创建房间');
            return;
        }

        const roomData = this.prepareRoomData();
        this.downloadJSON(roomData, `${roomData.id}-edited.json`);
        
        alert('房间数据已准备就绪！请将下载的JSON文件上传到网站的data/目录，并更新rooms.json');
    }

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

    // 检查URL参数
    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            document.getElementById('roomIdInput').value = roomId;
            this.loadSavedRoom(roomId);
        }
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
            this.styleSettings = roomData.styleSettings || this.styleSettings;
            this.currentPage = 1;
            this.displayMessages();
            this.updateStats();
            
            document.getElementById('roomTitle').value = roomData.title;
            document.getElementById('roomDescription').value = roomData.description;
            document.getElementById('roomIdInput').value = roomData.originalId || '';
            
        } catch (error) {
            alert('加载已保存房间失败: ' + error.message);
        }
    }

    // 原有的 importJson, handleAddMessage 等方法保持不变
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
            id: data.id || 'imported',
            title: data.title || '导入的房间',
            description: data.description || '从JSON文件导入',
            messages: data.messages || [],
            styleSettings: data.styleSettings || this.styleSettings,
            lastUpdated: new Date().toISOString()
        };
        
        this.editedMessages = data.messages || [];
        this.styleSettings = data.styleSettings || this.styleSettings;
        this.currentPage = 1;
        this.displayMessages();
        this.updateStats();
        
        document.getElementById('roomTitle').value = this.currentRoom.title;
        document.getElementById('roomDescription').value = this.currentRoom.description;
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
                from: 'editor',
                avatar: null
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
        this.closeModal('addMessageModal');
        e.target.reset();
    }

    publishRoom() {
        this.saveToBlog();
    }
}

// 全局函数
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 初始化编辑器
let logEditor;
document.addEventListener('DOMContentLoaded', () => {
    logEditor = new LogEditor();
});