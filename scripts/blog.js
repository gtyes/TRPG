class BlogViewer {
    constructor() {
        this.rooms = [];
        this.currentRoom = null;
        this.currentView = 'home'; // 'home' 或 'room'
        this.initialize();
    }

    async initialize() {
        await this.loadRoomsList();
        this.setupNavigation();
        this.showHomeView();
    }

    setupNavigation() {
        // 监听URL变化
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });

        // 初始路由处理
        this.handleRouteChange();
    }

    handleRouteChange() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        
        if (roomId) {
            this.showRoomView(roomId);
        } else {
            this.showHomeView();
        }
    }

    async showHomeView() {
        this.currentView = 'home';
        document.body.innerHTML = this.getHomeHTML();
        await this.loadRoomsList();
        this.displayRooms();
        this.updateLastModified();
    }

    async showRoomView(roomId) {
        this.currentView = 'room';
        document.body.innerHTML = this.getRoomHTML();
        await this.loadRoom(roomId);
    }

    getHomeHTML() {
        return `
            <header class="blog-header">
                <div class="container">
                    <h1>🍊 柑的带团记录</h1>
                    <p>TRPG跑团日志与回忆</p>
                    <nav>
                        <a href="#" onclick="blogViewer.navigateHome()">首页</a>
                        <a href="#rooms">跑团记录</a>
                        <a href="editor.html" class="editor-link">📝 日志编辑器</a>
                    </nav>
                </div>
            </header>

            <main class="container">
                <section class="hero">
                    <h2>欢迎来到我的TRPG世界</h2>
                    <p>这里记录了我带团的点点滴滴，包括完整的聊天记录、骰子结果和故事发展。</p>
                </section>

                <section id="rooms" class="rooms-grid">
                    <h2>📚 跑团记录</h2>
                    <div id="roomsContainer" class="rooms-container">
                        <div class="loading">加载中...</div>
                    </div>
                </section>
            </main>

            <footer class="blog-footer">
                <div class="container">
                    <p>Powered by ccfolia & GitHub Pages | 最后更新: <span id="lastUpdate"></span></p>
                </div>
            </footer>
        `;
    }

    getRoomHTML() {
        return `
            <header class="blog-header">
                <div class="container">
                    <h1>🍊 柑的带团记录</h1>
                    <nav>
                        <a href="#" onclick="blogViewer.navigateHome()">← 返回首页</a>
                        <a href="#" id="editorLink" style="display: none;">📝 在编辑器中打开</a>
                    </nav>
                </div>
            </header>

            <main class="container">
                <div class="log-container">
                    <div class="log-header">
                        <h1 class="log-title" id="roomTitle">加载中...</h1>
                        <div class="log-meta" id="roomMeta"></div>
                    </div>
                    <div id="messagesContainer" class="messages-container">
                        <div class="loading">加载日志中...</div>
                    </div>
                </div>
            </main>

            <footer class="blog-footer">
                <div class="container">
                    <p>Powered by ccfolia & GitHub Pages</p>
                </div>
            </footer>
        `;
    }

    navigateHome() {
        window.history.pushState({}, '', 'index.html');
        this.showHomeView();
        return false;
    }

    navigateToRoom(roomId) {
        window.history.pushState({}, '', `index.html?room=${roomId}`);
        this.showRoomView(roomId);
        return false;
    }

    // 其他方法保持不变...
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

    displayRooms() {
        const container = document.getElementById('roomsContainer');
        if (!container) return;

        if (this.rooms.length === 0) {
            container.innerHTML = '<div class="loading">暂无跑团记录</div>';
            return;
        }

        container.innerHTML = this.rooms.map(room => `
            <a href="#" onclick="blogViewer.navigateToRoom('${room.id}')" class="room-card">
                <h3 class="room-title">${room.title}</h3>
                <p class="room-description">${room.description}</p>
                <div class="room-meta">
                    <span class="room-date">${this.formatDate(room.lastUpdated)}</span>
                    <span>${room.messageCount} 条消息</span>
                </div>
            </a>
        `).join('');
    }

    async loadRoom(roomId) {
        try {
            const response = await fetch(`data/${roomId}-edited.json`);
            if (!response.ok) throw new Error('房间数据不存在');
            this.currentRoom = await response.json();
            this.displayRoom();
        } catch (error) {
            console.error('加载房间失败:', error);
            this.showError(`加载失败: ${error.message}`);
        }
    }

    displayRoom() {
        if (!this.currentRoom) return;

        document.getElementById('roomTitle').textContent = this.currentRoom.title;
        
        const lastUpdated = new Date(this.currentRoom.lastUpdated).toLocaleDateString('zh-CN');
        document.getElementById('roomMeta').innerHTML = `
            最后更新: ${lastUpdated} | 
            ${this.currentRoom.messageCount} 条消息
        `;

        const editorLink = document.getElementById('editorLink');
        editorLink.href = `editor.html?room=${this.currentRoom.id}`;
        editorLink.style.display = 'inline';

        this.displayMessages();
    }

    displayMessages() {
        const container = document.getElementById('messagesContainer');
        
        if (!this.currentRoom.messages || this.currentRoom.messages.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无消息记录</div>';
            return;
        }

        container.innerHTML = this.currentRoom.messages
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

        if (message.dice && message.dice.result) {
            messageHTML += `<div class="dice-result">${this.escapeHTML(message.dice.result)}</div>`;
        }

        messageHTML += `</div>`;
        return messageHTML;
    }

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

    showError(message) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = `
            <div class="error-message">
                <h3>加载失败</h3>
                <p>${message}</p>
                <p><a href="#" onclick="blogViewer.navigateHome()">返回首页</a></p>
            </div>
        `;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('zh-CN');
    }

    updateLastModified() {
        const element = document.getElementById('lastUpdate');
        if (element) {
            element.textContent = new Date().toLocaleDateString('zh-CN');
        }
    }
}

// 初始化博客
let blogViewer;
document.addEventListener('DOMContentLoaded', () => {
    blogViewer = new BlogViewer();
});