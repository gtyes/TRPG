class BlogViewer {
    constructor() {
        this.rooms = [];
        this.currentRoom = null;
        this.initialize();
    }

    async initialize() {
        await this.loadRoomsList();
        this.displayRooms();
        this.updateLastModified();
        this.setupRouting();
    }

    // 加载房间列表
    async loadRoomsList() {
        try {
            const response = await fetch('data/rooms.json');
            if (!response.ok) throw new Error('无法加载房间列表');
            this.rooms = await response.json();
        } catch (error) {
            console.error('加载房间列表失败:', error);
            this.rooms = [];
        }
    }

    // 显示房间网格
    displayRooms() {
        const container = document.getElementById('roomsContainer');
        if (!container) return;

        if (this.rooms.length === 0) {
            container.innerHTML = '<div class="loading">暂无跑团记录</div>';
            return;
        }

        container.innerHTML = this.rooms.map(room => `
            <a href="room.html?id=${room.id}" class="room-card">
                <h3 class="room-title">${room.title}</h3>
                <p class="room-description">${room.description}</p>
                <div class="room-meta">
                    <span class="room-date">${this.formatDate(room.lastUpdated)}</span>
                    <span>${room.messageCount} 条消息</span>
                </div>
            </a>
        `).join('');
    }

    // 加载单个房间日志
    async loadRoomLog(roomId) {
        try {
            const response = await fetch(`data/${roomId}-edited.json`);
            if (!response.ok) throw new Error('房间数据不存在');
            return await response.json();
        } catch (error) {
            console.error('加载房间日志失败:', error);
            return null;
        }
    }

    // 显示房间日志
    async displayRoomLog(roomId) {
        const roomData = await this.loadRoomLog(roomId);
        if (!roomData) {
            document.body.innerHTML = '<div class="log-container"><h2>房间数据不存在</h2></div>';
            return;
        }

        this.renderLogPage(roomData);
    }

    // 渲染日志页面
    renderLogPage(roomData) {
        document.body.innerHTML = `
            <header class="blog-header">
                <div class="container">
                    <h1>🍊 柑的带团记录</h1>
                    <nav>
                        <a href="index.html">← 返回首页</a>
                        <a href="editor.html?room=${roomData.roomId}">📝 在编辑器中打开</a>
                    </nav>
                </div>
            </header>

            <main class="container">
                <div class="log-container">
                    <div class="log-header">
                        <h1 class="log-title">${roomData.title}</h1>
                        <div class="log-meta">
                            最后更新: ${this.formatDate(roomData.lastUpdated)} | 
                            ${roomData.messageCount} 条消息 |
                            ${roomData.originalMessageCount} 条原始消息
                        </div>
                    </div>
                    <div id="messagesContainer"></div>
                </div>
            </main>

            <footer class="blog-footer">
                <div class="container">
                    <p>Powered by ccfolia & GitHub Pages</p>
                </div>
            </footer>
        `;

        this.renderMessages(roomData.messages);
    }

    // 渲染消息列表
    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = messages.map(message => this.createMessageHTML(message)).join('');
    }

    // 创建消息HTML
    createMessageHTML(message) {
        const time = new Date(message.createTime).toLocaleString('zh-CN');
        
        return `
            <div class="message">
                <div class="message-header">
                    <span class="character-name" style="color: ${message.character.color || '#666'}">
                        ${message.character.name}
                    </span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${this.escapeHTML(message.content)}</div>
                ${message.dice ? `<div class="dice-result">${message.dice.result}</div>` : ''}
            </div>
        `;
    }

    // 简单路由
    setupRouting() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('id');
        
        if (roomId && document.getElementById('messagesContainer')) {
            this.displayRoomLog(roomId);
        }
    }

    // 工具函数
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('zh-CN');
    }

    updateLastModified() {
        const element = document.getElementById('lastUpdate');
        if (element) {
            element.textContent = new Date().toLocaleDateString('zh-CN');
        }
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化博客
document.addEventListener('DOMContentLoaded', () => {
    new BlogViewer();
});