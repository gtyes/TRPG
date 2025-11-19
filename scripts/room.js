class RoomViewer {
    constructor() {
        this.roomData = null;
        this.appSettings = null;
        this.initialize();
    }

    async initialize() {
        const roomId = this.getRoomIdFromURL();
        if (roomId) {
            await this.loadRoom(roomId);
            this.applyAppSettings();
            this.displayRoom();
            this.setupChapterNavigation();
        } else {
            this.showError('未指定房间ID');
        }
    }

    async loadRoom(roomId) {
        try {
            const response = await fetch(`data/${roomId}-edited.json`);
            if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
            
            this.roomData = await response.json();
            this.appSettings = this.roomData.appSettings || {};
            
        } catch (error) {
            console.error('加载房间失败:', error);
            this.showError(`加载失败: ${error.message}`);
        }
    }

    applyAppSettings() {
        if (!this.appSettings) return;

        // 应用页面背景
        if (this.appSettings.pageBackground) {
            if (this.appSettings.pageBackground.type === 'gradient') {
                document.body.style.background = `linear-gradient(135deg, ${this.appSettings.pageBackground.color1} 0%, ${this.appSettings.pageBackground.color2} 100%)`;
            } else {
                document.body.style.background = this.appSettings.pageBackground.color1;
            }
            
            if (this.appSettings.pageBackground.image) {
                document.body.style.backgroundImage = `url(${this.appSettings.pageBackground.image})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
            }
        }

        // 应用日志容器样式
        if (this.appSettings.logContainer) {
            const logContainer = document.querySelector('.log-container');
            if (logContainer) {
                let background = this.appSettings.logContainer.backgroundColor;
                if (this.appSettings.logContainer.backgroundImage) {
                    background = `linear-gradient(rgba(255,255,255,${this.appSettings.logContainer.opacity}), rgba(255,255,255,${this.appSettings.logContainer.opacity})), url(${this.appSettings.logContainer.backgroundImage})`;
                }
                logContainer.style.background = background;
                logContainer.style.backgroundSize = 'cover';
            }
        }
    }

    displayRoom() {
        if (!this.roomData) return;

        document.title = `${this.roomData.title} - 柑的带团记录`;
        document.getElementById('roomTitle').textContent = this.roomData.title;
        
        const lastUpdated = new Date(this.roomData.lastUpdated).toLocaleDateString('zh-CN');
        document.getElementById('roomMeta').innerHTML = `
            最后更新: ${lastUpdated} | 
            ${this.roomData.messageCount} 条消息
        `;

        this.displayMessages();
        this.createChapterSidebar();
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
        if (message.isChapter) {
            return this.createChapterHTML(message);
        }

        const channel = this.appSettings.channels?.[message.channel] || { color: '#e3f2fd', backgroundColor: 'rgba(227,242,253,0.3)' };
        const time = new Date(message.createTime).toLocaleString('zh-CN');
        const characterName = message.character?.name || '未知';
        const characterColor = message.character?.color || '#666';
        const content = message.content || '';

        let messageHTML = `
            <div class="message" id="msg-${message.id}" style="background: ${channel.backgroundColor}">
                <div class="message-header">
                    ${this.createAvatarHTML(message.character)}
                    <span class="character-name" style="color: ${characterColor}">
                        ${this.escapeHTML(characterName)}
                    </span>
                    <span class="channel-badge" style="background: ${channel.color}">
                        ${this.appSettings.channels?.[message.channel]?.name || '主频道'}
                    </span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${this.formatContent(content)}</div>
        `;

        if (message.dice && message.dice.result) {
            messageHTML += `<div class="dice-result">${this.escapeHTML(message.dice.result)}</div>`;
        }

        messageHTML += `</div>`;
        return messageHTML;
    }

    createChapterHTML(message) {
        return `
            <div class="chapter-marker" id="chapter-${message.id}">
                <h4>📖 ${message.chapterData.title}</h4>
                ${message.chapterData.description ? `<div class="chapter-description">${message.chapterData.description}</div>` : ''}
            </div>
        `;
    }

    createAvatarHTML(character) {
        if (character.iconUrl) {
            return `<img src="${character.iconUrl}" class="character-avatar" alt="${character.name}" 
                        onerror="this.style.display='none'">`;
        } else {
            return `<div class="character-avatar empty" title="${character.name}">${character.name.charAt(0)}</div>`;
        }
    }

    createChapterSidebar() {
        const chapters = this.roomData.messages?.filter(msg => msg.isChapter) || [];
        if (chapters.length === 0) return;

        const sidebar = document.createElement('div');
        sidebar.className = 'chapter-sidebar';
        sidebar.innerHTML = `
            <h4>📑 章节导航</h4>
            ${chapters.map(chapter => `
                <a href="#chapter-${chapter.id}" class="chapter-link">
                    ${chapter.chapterData.title}
                </a>
            `).join('')}
        `;

        document.querySelector('.log-container').prepend(sidebar);
    }

    setupChapterNavigation() {
        // 平滑滚动到章节
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('chapter-link')) {
                e.preventDefault();
                const targetId = e.target.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }

    // 其他现有方法保持不变...
    formatContent(content) {
        return this.escapeHTML(content)
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getRoomIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || urlParams.get('room');
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