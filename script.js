class TrpgLogViewer {
    constructor() {
        this.allMessages = [];
        this.filteredMessages = [];
        this.isLoading = false;
        this.edits = {}; // 存储编辑后的消息
        this.deletedMessages = new Set(); // 存储删除的消息ID
        this.messageOrder = []; // 存储消息顺序
        this.github = {
            username: 'gtyes',  // GitHub 用户名
            repo: 'TRPG',  // 仓库名
            branch: 'main' // 分支名
        };
        
        this.initializeEventListeners();
        this.loadSettings();
        this.loadFixedRoom();
        this.loadFromURL(); // 新增：从URL参数加载
    }
    // 新增：从URL参数加载房间和编辑数据
    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        const editSource = urlParams.get('source'); // 'github' 或 'local'
        
        if (roomId) {
            document.getElementById('roomId').value = roomId;
            if (editSource === 'github') {
                this.loadEditsFromGitHub(roomId);
            } else {
                this.loadLogs(); // 自动加载
            }
        }
    }

    // 新增：生成分享链接
    generateShareLink(useGitHub = false) {
        const roomId = document.getElementById('roomId').value;
        if (!roomId) {
            alert('请先加载一个房间');
            return;
        }

        let shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        
        if (useGitHub) {
            shareUrl += '&source=github';
            // 先保存到GitHub
            this.saveEditsToGitHub().then(() => {
                this.copyToClipboard(shareUrl);
                alert('分享链接已生成并复制到剪贴板！其他用户可以看到你的编辑。');
            }).catch(error => {
                console.error('保存到GitHub失败:', error);
                alert('保存到GitHub失败，请检查控制台信息');
            });
        } else {
            shareUrl += '&source=local';
            this.copyToClipboard(shareUrl);
            alert('分享链接已复制到剪贴板！注意：其他用户只能看到原始日志，看不到你的编辑。');
        }
    }

    // 新增：保存编辑数据到GitHub
    async saveEditsToGitHub() {
        const roomId = document.getElementById('roomId').value;
        const editsData = {
            edits: this.edits,
            deletedMessages: Array.from(this.deletedMessages),
            messageOrder: this.messageOrder,
            saveTime: new Date().toISOString(),
            version: '1.0'
        };

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(editsData, null, 2))));
        const filename = `edits/${roomId}.json`;
        
        // 这里需要GitHub Personal Access Token，但为了安全，我们不硬编码
        // 实际使用时，你可以：
        // 1. 手动创建 edits/roomId.json 文件
        // 2. 或者使用 GitHub API（需要token）
        
        console.log('请手动创建以下文件到你的GitHub仓库:');
        console.log(`路径: edits/${roomId}.json`);
        console.log('内容:', editsData);
        
        // 提示用户手动操作
        const blob = new Blob([JSON.stringify(editsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${roomId}-edits.json`;
        a.click();
        
        alert(`编辑数据已导出为文件，请手动上传到你的GitHub仓库的edits文件夹中。\n文件名: ${roomId}.json`);
    }

    // 新增：从GitHub加载编辑数据
    async loadEditsFromGitHub(roomId) {
        try {
            const response = await fetch(`https://raw.githubusercontent.com/${this.github.username}/${this.github.repo}/${this.github.branch}/edits/${roomId}.json`);
            if (response.ok) {
                const editsData = await response.json();
                this.edits = editsData.edits || {};
                this.deletedMessages = new Set(editsData.deletedMessages || []);
                this.messageOrder = editsData.messageOrder || [];
                
                // 重新加载日志并应用编辑
                await this.loadLogs();
                alert('已加载云端编辑数据！');
            }
        } catch (error) {
            console.log('没有找到云端的编辑数据，使用本地版本');
        }
    }

    // 新增：复制到剪贴板
    copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}
    initializeEventListeners() {
        // 基本功能
        document.getElementById('loadBtn').addEventListener('click', () => this.loadLogs());
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterMessages(e.target.value));
        document.getElementById('exportBtn').addEventListener('click', () => this.exportLogs());
        document.getElementById('toggleDiceBtn').addEventListener('click', () => this.toggleDiceOnly());
        
        // 设置面板
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.toggleSettings());
        
        // 样式设置
        document.getElementById('fontFamily').addEventListener('change', (e) => this.changeFontFamily(e.target.value));
        document.getElementById('fontSize').addEventListener('change', (e) => this.changeFontSize(e.target.value));
        document.getElementById('bgColor').addEventListener('change', (e) => this.changeBackground(e.target.value, document.getElementById('bgColor2').value));
        document.getElementById('bgColor2').addEventListener('change', (e) => this.changeBackground(document.getElementById('bgColor').value, e.target.value));
        document.getElementById('gradientBtn').addEventListener('click', () => this.applyGradientBackground());
        document.getElementById('solidBgBtn').addEventListener('click', () => this.applySolidBackground());
        document.getElementById('characterNameSize').addEventListener('change', (e) => this.changeCharacterNameSize(e.target.value));
        
        // 房间设置
        document.getElementById('saveRoomBtn').addEventListener('click', () => this.saveFixedRoom());
        document.getElementById('resetStylesBtn').addEventListener('click', () => this.resetStyles());
        // 分享按钮
        document.getElementById('shareLocalBtn').addEventListener('click', () => this.generateShareLink(false));
        document.getElementById('shareCloudBtn').addEventListener('click', () => this.generateShareLink(true));
        
        // 回车键加载
        document.getElementById('roomId').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadLogs();
        });
    }

    // 设置相关方法
    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
// 新增：改变角色名字字号
changeCharacterNameSize(size) {
    document.documentElement.style.setProperty('--character-name-size', size);
    localStorage.setItem('trpgCharacterNameSize', size);
}
loadSettings() {
    // 加载保存的样式设置
    const fontFamily = localStorage.getItem('trpgFontFamily') || "'Segoe UI', Tahoma, sans-serif";
    const fontSize = localStorage.getItem('trpgFontSize') || '16px';
    const characterNameSize = localStorage.getItem('trpgCharacterNameSize') || '16px';
    const bgColor = localStorage.getItem('trpgBgColor') || '#667eea';
    const bgColor2 = localStorage.getItem('trpgBgColor2') || '#764ba2';
    const bgType = localStorage.getItem('trpgBgType') || 'gradient';

    // 应用样式
    this.changeFontFamily(fontFamily);
    this.changeFontSize(fontSize);
    this.changeCharacterNameSize(characterNameSize);
    
    if (bgType === 'gradient') {
        this.changeBackground(bgColor, bgColor2);
    } else {
        this.applySolidBackground(bgColor);
    }

    // 更新设置面板
    document.getElementById('fontFamily').value = fontFamily;
    document.getElementById('fontSize').value = fontSize;
    document.getElementById('characterNameSize').value = characterNameSize;
    document.getElementById('bgColor').value = bgColor;
    document.getElementById('bgColor2').value = bgColor2;
}
    changeFontFamily(font) {
        document.body.style.fontFamily = font;
        localStorage.setItem('trpgFontFamily', font);
    }

    changeFontSize(size) {
        document.body.style.fontSize = size;
        localStorage.setItem('trpgFontSize', size);
    }

    changeBackground(color1, color2) {
        document.body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
        localStorage.setItem('trpgBgColor', color1);
        localStorage.setItem('trpgBgColor2', color2);
        localStorage.setItem('trpgBgType', 'gradient');
    }

    applyGradientBackground() {
        const color1 = document.getElementById('bgColor').value;
        const color2 = document.getElementById('bgColor2').value;
        this.changeBackground(color1, color2);
    }

    applySolidBackground(color = null) {
        const bgColor = color || document.getElementById('bgColor').value;
        document.body.style.background = bgColor;
        localStorage.setItem('trpgBgColor', bgColor);
        localStorage.setItem('trpgBgType', 'solid');
    }

resetStyles() {
    localStorage.removeItem('trpgFontFamily');
    localStorage.removeItem('trpgFontSize');
    localStorage.removeItem('trpgCharacterNameSize');
    localStorage.removeItem('trpgBgColor');
    localStorage.removeItem('trpgBgColor2');
    localStorage.removeItem('trpgBgType');
    
    location.reload();
}

    // 固定房间功能
saveFixedRoom() {
    const roomId = document.getElementById('fixedRoomId').value.trim();
    if (roomId) {
        localStorage.setItem('trpgFixedRoom', roomId);
        document.getElementById('roomId').value = roomId;
        
        // 同时保存样式设置
        const settings = {
            fontFamily: document.getElementById('fontFamily').value,
            fontSize: document.getElementById('fontSize').value,
            characterNameSize: document.getElementById('characterNameSize').value,
            bgColor: document.getElementById('bgColor').value,
            bgColor2: document.getElementById('bgColor2').value,
            bgType: localStorage.getItem('trpgBgType') || 'gradient'
        };
        
        localStorage.setItem('trpgRoomSettings', JSON.stringify(settings));
        alert('默认房间和样式设置已保存！');
    }
}

    loadFixedRoom() {
        const fixedRoom = localStorage.getItem('trpgFixedRoom');
        if (fixedRoom) {
            document.getElementById('roomId').value = fixedRoom;
            document.getElementById('fixedRoomId').value = fixedRoom;
        }
    }

    // 消息编辑功能
    enableEditMode() {
        this.isEditMode = true;
        this.displayMessages(this.filteredMessages);
    }

    disableEditMode() {
        this.isEditMode = false;
        this.displayMessages(this.filteredMessages);
    }

    editMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const contentElement = messageElement.querySelector('.message-content');
        const originalText = contentElement.textContent;
        
        // 创建编辑界面
        const editHtml = `
            <textarea class="edit-textarea">${originalText}</textarea>
            <div>
                <button class="save-btn" onclick="trpgViewer.saveEdit('${messageId}')">保存</button>
                <button class="cancel-btn" onclick="trpgViewer.cancelEdit('${messageId}', '${this.escapeHtml(originalText)}')">取消</button>
            </div>
        `;
        
        contentElement.innerHTML = editHtml;
        messageElement.classList.add('editing');
        
        // 自动聚焦到文本框
        const textarea = messageElement.querySelector('.edit-textarea');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }

    saveEdit(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const textarea = messageElement.querySelector('.edit-textarea');
        const newText = textarea.value.trim();
        
        if (newText) {
            // 保存编辑
            this.edits[messageId] = newText;
            this.saveEdits();
            
            // 更新显示
            const contentElement = messageElement.querySelector('.message-content');
            contentElement.textContent = newText;
        }
        
        messageElement.classList.remove('editing');
        this.updateMessageActions(messageId);
    }

    cancelEdit(messageId, originalText) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const contentElement = messageElement.querySelector('.message-content');
        
        contentElement.textContent = originalText;
        messageElement.classList.remove('editing');
        this.updateMessageActions(messageId);
    }

    deleteMessage(messageId) {
        if (confirm('确定要删除这条消息吗？')) {
            this.deletedMessages.add(messageId);
            this.saveEdits();
            
            // 从显示中移除
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.style.opacity = '0';
                setTimeout(() => {
                    messageElement.remove();
                    this.updateMessageCount();
                }, 300);
            }
        }
    }

    updateMessageActions(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        const actionsHtml = `
            <div class="message-actions">
                <button class="edit-btn" onclick="trpgViewer.editMessage('${messageId}')">编辑</button>
                <button class="delete-btn" onclick="trpgViewer.deleteMessage('${messageId}')">删除</button>
            </div>
        `;
        
        let actionsElement = messageElement.querySelector('.message-actions');
        if (actionsElement) {
            actionsElement.innerHTML = actionsHtml;
        }
    }

    // 拖拽功能
    makeMessageDraggable(element, messageId) {
        element.setAttribute('draggable', 'true');
        
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', messageId);
            element.classList.add('dragging');
        });
        
        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
        });
    }

    setupDropZone(container) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const messageId = e.dataTransfer.getData('text/plain');
            const draggedElement = document.querySelector(`[data-message-id="${messageId}"]`);
            
            // 获取放置位置
            const afterElement = this.getDragAfterElement(container, e.clientY);
            
            if (afterElement) {
                container.insertBefore(draggedElement, afterElement);
            } else {
                container.appendChild(draggedElement);
            }
            
            // 保存新的顺序
            this.saveMessageOrder();
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.message:not(.dragging)')];
        
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

    saveMessageOrder() {
        const container = document.getElementById('logsList');
        const messageElements = container.querySelectorAll('.message');
        this.messageOrder = Array.from(messageElements).map(el => el.getAttribute('data-message-id'));
        this.saveEdits();
    }

    applyMessageOrder(messages) {
        if (this.messageOrder.length === 0) return messages;
        
        const orderedMessages = [];
        const messageMap = new Map(messages.map(msg => {
            const messageId = msg.name.split('/').pop();
            return [messageId, msg];
        }));
        
        // 按照保存的顺序重新排列
        for (const messageId of this.messageOrder) {
            if (messageMap.has(messageId)) {
                orderedMessages.push(messageMap.get(messageId));
                messageMap.delete(messageId);
            }
        }
        
        // 添加剩余的消息（新消息）
        orderedMessages.push(...messageMap.values());
        
        return orderedMessages;
    }

    // 数据保存和加载
    saveEdits() {
        const editsData = {
            edits: this.edits,
            deletedMessages: Array.from(this.deletedMessages),
            messageOrder: this.messageOrder
        };
        
        const roomId = document.getElementById('roomId').value;
        if (roomId) {
            localStorage.setItem(`trpgEdits_${roomId}`, JSON.stringify(editsData));
        }
    }

    loadEdits(roomId) {
        const editsData = localStorage.getItem(`trpgEdits_${roomId}`);
        if (editsData) {
            const data = JSON.parse(editsData);
            this.edits = data.edits || {};
            this.deletedMessages = new Set(data.deletedMessages || []);
            this.messageOrder = data.messageOrder || [];
        } else {
            this.edits = {};
            this.deletedMessages = new Set();
            this.messageOrder = [];
        }
    }

    // 修改后的消息显示方法
    displayMessages(messages) {
        const container = document.getElementById('logsList');
        container.innerHTML = '';

        // 应用编辑和排序
        const processedMessages = this.processMessages(messages);
        
        processedMessages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        // 设置拖拽区域
        this.setupDropZone(container);
        
        this.updateMessageCount();
    }

    processMessages(messages) {
        const roomId = document.getElementById('roomId').value;
        this.loadEdits(roomId);
        
        // 过滤已删除的消息
        let processed = messages.filter(message => {
            const messageId = message.name.split('/').pop();
            return !this.deletedMessages.has(messageId);
        });
        
        // 应用文本编辑
        processed = processed.map(message => {
            const messageId = message.name.split('/').pop();
            if (this.edits[messageId]) {
                // 创建消息的深拷贝，避免修改原始数据
                const editedMessage = JSON.parse(JSON.stringify(message));
                editedMessage.fields.text.stringValue = this.edits[messageId];
                return editedMessage;
            }
            return message;
        });
        
        // 应用顺序
        processed = this.applyMessageOrder(processed);
        
        return processed;
    }

createMessageElement(message) {
    const fields = message.fields;
    const messageId = message.name.split('/').pop();
    
    const div = document.createElement('div');
    div.className = 'message';
    div.setAttribute('data-message-id', messageId);
    
    const characterColor = fields.color?.stringValue || '#666';
    const isPrivate = fields.to?.stringValue;
    const hasDice = fields.extend?.mapValue?.fields?.roll;
    const iconUrl = fields.iconUrl?.stringValue;
    
    if (isPrivate) {
        div.classList.add('private-message');
    }

    // 格式化时间
    const createTime = new Date(message.createTime).toLocaleString('zh-CN');
    
    // 生成头像HTML
    const avatarHtml = this.createAvatarHtml(iconUrl, fields.name?.stringValue);
    
    // 角色信息
    const characterMeta = [];
    if (fields.channelName?.stringValue) {
        characterMeta.push(fields.channelName.stringValue);
    }
    if (isPrivate) {
        characterMeta.push('私聊');
    }

    let content = `
        <div class="message-header">
            <div class="character-info">
                ${avatarHtml}
                <div class="character-main">
                    <span class="character-name" style="color: ${characterColor}">
                        ${fields.name?.stringValue || '未知'}
                    </span>
                    ${characterMeta.length ? `<div class="character-meta">${characterMeta.join(' · ')}</div>` : ''}
                </div>
            </div>
            <span class="message-time">${createTime}</span>
        </div>
        <div class="message-content">${this.escapeHtml(fields.text?.stringValue || '')}</div>
    `;

    // 骰子结果
    if (hasDice) {
        const roll = fields.extend.mapValue.fields.roll.mapValue.fields;
        content += `<div class="dice-result">${roll.result?.stringValue || ''}</div>`;
    }

    // 编辑按钮（仅在自己查看时显示）
    if (!window.location.search.includes('source=github')) {
        content += `
            <div class="message-actions">
                <button class="edit-btn" onclick="trpgViewer.editMessage('${messageId}')">编辑</button>
                <button class="delete-btn" onclick="trpgViewer.deleteMessage('${messageId}')">删除</button>
            </div>
        `;
    }

    div.innerHTML = content;
    
    // 启用拖拽（仅在自己查看时）
    if (!window.location.search.includes('source=github')) {
        this.makeMessageDraggable(div, messageId);
    }
    
    return div;
}
// 新增：创建头像HTML
createAvatarHtml(iconUrl, characterName) {
    if (iconUrl) {
        return `<img src="${iconUrl}" class="character-avatar" alt="${characterName}的头像" onerror="this.style.display='none'">`;
    } else {
        const firstChar = characterName ? characterName.charAt(0) : '?';
        return `<div class="character-avatar avatar-placeholder">${firstChar}</div>`;
    }
}
    // 其余原有方法保持不变（loadLogs, fetchAllMessages, filterMessages等）
    async loadLogs() {
        const roomId = document.getElementById('roomId').value.trim();
        if (!roomId) {
            alert('请输入房间ID');
            return;
        }

        this.showLoading(true);
        this.allMessages = [];
        
        try {
            await this.fetchAllMessages(roomId);
            this.showControls();
            this.displayMessages(this.allMessages);
        } catch (error) {
            console.error('加载日志失败:', error);
            alert('加载失败：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async fetchAllMessages(roomId) {
        let allMessages = [];
        let nextPageToken = "";
        const pageSize = 300;

        do {
            const url = `https://firestore.googleapis.com/v1/projects/ccfolia-160aa/databases/(default)/documents/rooms/${roomId}/messages?pageSize=${pageSize}&pageToken=${nextPageToken}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.documents && data.documents.length > 0) {
                allMessages.push(...data.documents);
                this.updateProgress(allMessages.length);
            }
            
            nextPageToken = data.nextPageToken || "";
            
        } while (nextPageToken);

        // 按时间排序
        allMessages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
        this.allMessages = allMessages;
        this.filteredMessages = allMessages;
    }

    updateProgress(count) {
        const loadingElement = document.getElementById('loading');
        loadingElement.querySelector('p').textContent = `已加载 ${count} 条消息...`;
    }

    showLoading(show) {
        this.isLoading = show;
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showControls() {
        document.querySelector('.controls').style.display = 'block';
        this.updateMessageCount();
    }

    updateMessageCount() {
        const visibleCount = document.querySelectorAll('.message').length;
        document.getElementById('messageCount').textContent = `显示 ${visibleCount} / ${this.allMessages.length} 条消息`;
    }

    filterMessages(searchTerm) {
        if (!searchTerm) {
            this.filteredMessages = this.allMessages;
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredMessages = this.allMessages.filter(message => {
                const text = message.fields.text?.stringValue?.toLowerCase() || '';
                const name = message.fields.name?.stringValue?.toLowerCase() || '';
                return text.includes(term) || name.includes(term);
            });
        }
        this.displayMessages(this.filteredMessages);
    }

    toggleDiceOnly() {
        const button = document.getElementById('toggleDiceBtn');
        const showDiceOnly = button.textContent === '只看骰子';
        
        if (showDiceOnly) {
            this.filteredMessages = this.allMessages.filter(message => 
                message.fields.extend?.mapValue?.fields?.roll
            );
            button.textContent = '显示全部';
        } else {
            this.filteredMessages = this.allMessages;
            button.textContent = '只看骰子';
        }
        
        this.displayMessages(this.filteredMessages);
    }

    exportLogs() {
        if (this.allMessages.length === 0) {
            alert('没有可导出的数据');
            return;
        }

        const processedMessages = this.processMessages(this.allMessages);
        
        const exportData = {
            roomId: document.getElementById('roomId').value,
            exportTime: new Date().toISOString(),
            originalMessageCount: this.allMessages.length,
            displayedMessageCount: processedMessages.length,
            messages: processedMessages.map(msg => this.processMessageForExport(msg))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ccfolia-logs-${document.getElementById('roomId').value}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    processMessageForExport(message) {
        const messageId = message.name.split('/').pop();
        const editedText = this.edits[messageId];
        
        return {
            id: messageId,
            createTime: message.createTime,
            updateTime: message.updateTime,
            character: {
                name: message.fields.name?.stringValue,
                color: message.fields.color?.stringValue,
                from: message.fields.from?.stringValue
            },
            content: editedText || message.fields.text?.stringValue,
            type: message.fields.type?.stringValue,
            channel: message.fields.channelName?.stringValue,
            isEdited: message.fields.edited?.booleanValue,
            isPrivate: !!message.fields.to?.stringValue,
            dice: message.fields.extend?.mapValue?.fields?.roll ? {
                result: message.fields.extend.mapValue.fields.roll.mapValue.fields.result?.stringValue,
                success: message.fields.extend.mapValue.fields.roll.mapValue.fields.success?.booleanValue,
                critical: message.fields.extend.mapValue.fields.roll.mapValue.fields.critical?.booleanValue,
                fumble: message.fields.extend.mapValue.fields.roll.mapValue.fields.fumble?.booleanValue
            } : null,
            isModified: !!editedText
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
let trpgViewer;
document.addEventListener('DOMContentLoaded', () => {
    trpgViewer = new TrpgLogViewer();
});