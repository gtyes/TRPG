class RoomViewer {
    constructor() {
        this.roomData = null;
        this.initialize();
    }

    async initialize() {
        const roomId = this.getRoomIdFromURL();
        if (roomId) {
            await this.loadRoom(roomId);
            this.displayRoom();
        } else {
            this.showError('未指定房间ID');
        }
    }

    getRoomIdFromURL() {
        // 支持两种URL格式：
        // room.html?id=room1
        // room.html?room=room1
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || urlParams.get('room');
    }

    async loadRoom(roomId) {
        try {
            console.log('正在加载房间:', roomId);
            const response = await fetch(`data/${roomId}-edited.json`);
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            this.roomData = await response.json();
            console.log('房间数据加载成功:', this.roomData);
            
        } catch (error) {
            console.error('加载房间失败:', error);
            this.showError(`加载失败: ${error.message}`);
        }
    }

    displayRoom() {
        if (!this.roomData) return;

        // 更新页面标题
        document.title = `${this.roomData.title} - 柑的带团记录`;
        
        // 更新页面内容
        document.getElementById('roomTitle').textContent = this.roomData.title;
        
        // 更新元数据
        const lastUpdated = new Date(this.roomData.lastUpdated).toLocaleDateString('zh-CN');
        document.getElementById('roomMeta').innerHTML = `
            最后更新: ${lastUpdated} | 
            ${this.roomData.messageCount} 条消息
            ${this.roomData.originalMessageCount ? ` | ${this.roomData.originalMessageCount} 条原始消息` : ''}
        `;

        // 显示编辑器链接
        const editorLink = document.getElementById('editorLink');
        editorLink.href = `editor.html?room=${this.roomData.id}`;
        editorLink.style.display = 'inline';

        // 显示消息
        this.displayMessages();
    }

    displayMessages() {
        const container = document.getElementById('messagesContainer');
        
        if (!this.roomData.messages || this.roomData.messages.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无消息记录</div>';
            return;
        }

        container.innerHTML = this.roomData.messages
            .map(message => this.createMessageHTML(message))
            .join('');
    }

    createMessageHTML(message) {
        const time = new Date(message.createTime).toLocaleString('zh-CN');
        const characterName = message.character?.name || '未知';
        const characterColor = message.character?.color || '#666';
        const content = message.content || '';

        let messageHTML = `
            <div class="message">
                <div class="message-header">
                    <span class="character-name" style="color: ${characterColor}">
                        ${this.escapeHTML(characterName)}
                    </span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${this.formatContent(content)}</div>
        `;

        // 添加骰子结果
        if (message.dice && message.dice.result) {
            messageHTML += `<div class="dice-result">${this.escapeHTML(message.dice.result)}</div>`;
        }

        // 添加私聊标识
        if (message.isPrivate) {
            messageHTML += `<div class="private-info">🔒 私聊消息</div>`;
        }

        messageHTML += `</div>`;
        return messageHTML;
    }

    formatContent(content) {
        // 简单的文本格式化
        return this.escapeHTML(content)
            .replace(/\n/g, '<br>') // 换行符转<br>
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>'); // URL转链接
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = `
            <div class="error-message">
                <h3>加载失败</h3>
                <p>${message}</p>
                <p><a href="index.html">返回首页</a></p>
            </div>
        `;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new RoomViewer();
});