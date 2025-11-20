class RoomViewer {
    constructor() {
        this.roomData = null;
        this.initialize();
    }

    async initialize() {
        const roomId = this.getRoomIdFromURL();
        if (roomId) {
            await this.loadRoom(roomId);
            this.applyStyleSettings();
            this.displayRoom();
            this.generateTableOfContents();
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
            const response = await fetch(`data/${roomId}-edited.json`);
            if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
            this.roomData = await response.json();
        } catch (error) {
            this.showError(`加载失败: ${error.message}`);
        }
    }

    applyStyleSettings() {
        if (!this.roomData.styleSettings) return;

        const bg = this.roomData.styleSettings.background;
        
        // 应用页面背景
        if (bg.page.type === 'gradient') {
            document.body.style.background = `linear-gradient(135deg, ${bg.page.color1} 0%, ${bg.page.color2} 100%)`;
        } else if (bg.page.type === 'color') {
            document.body.style.background = bg.page.color1;
        } else if (bg.page.type === 'image' && bg.page.image) {
            document.body.style.backgroundImage = `url(${bg.page.image})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
        }

        // 应用容器背景
        const container = document.querySelector('.log-container');
        if (bg.container.type === 'color') {
            container.style.background = bg.container.color;
        } else if (bg.container.type === 'image' && bg.container.image) {
            container.style.backgroundImage = `url(${bg.container.image})`;
            container.style.backgroundSize = 'cover';
        }
        container.style.opacity = (bg.container.opacity || 100) / 100;

        // 应用频道样式
        this.applyChannelStyles();
    }

    applyChannelStyles() {
        // 在实际实现中，可以根据消息的channel字段应用不同的样式
        // 这里需要根据你的具体需求来实现
    }

    generateTableOfContents() {
        const chapters = this.roomData.messages.filter(msg => msg.type === 'chapter');
        if (chapters.length === 0) return;

        const toc = document.createElement('div');
        toc.className = 'table-of-contents';
        toc.innerHTML = `
            <h3>📑 章节目录</h3>
            <ul>
                ${chapters.map((chapter, index) => `
                    <li>
                        <a href="#chapter-${index}" onclick="roomViewer.scrollToChapter(${index})">
                            ${chapter.chapter.title}
                        </a>
                    </li>
                `).join('')}
            </ul>
        `;

        const container = document.querySelector('.log-container');
        container.insertBefore(toc, container.firstChild);
    }

    scrollToChapter(chapterIndex) {
        const chapters = this.roomData.messages.filter(msg => msg.type === 'chapter');
        if (chapters[chapterIndex]) {
            const chapterElement = document.querySelectorAll('.chapter-message')[chapterIndex];
            if (chapterElement) {
                chapterElement.scrollIntoView({ behavior: 'smooth' });
            }
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
let roomViewer;
document.addEventListener('DOMContentLoaded', () => {
    new RoomViewer();
});