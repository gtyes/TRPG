class TrpgLogViewer {
    constructor() {
        this.allMessages = [];
        this.filteredMessages = [];
        this.isLoading = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('loadBtn').addEventListener('click', () => this.loadLogs());
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterMessages(e.target.value));
        document.getElementById('exportBtn').addEventListener('click', () => this.exportLogs());
        document.getElementById('toggleDiceBtn').addEventListener('click', () => this.toggleDiceOnly());
        
        // 回车键加载
        document.getElementById('roomId').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadLogs();
        });
    }

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
        document.getElementById('messageCount').textContent = `共 ${this.allMessages.length} 条消息`;
    }

    displayMessages(messages) {
        const container = document.getElementById('logsList');
        container.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });
    }

    createMessageElement(message) {
        const fields = message.fields;
        const div = document.createElement('div');
        div.className = 'message';
        
        const characterColor = fields.color?.stringValue || '#666';
        const isPrivate = fields.to?.stringValue;
        const hasDice = fields.extend?.mapValue?.fields?.roll;
        
        if (isPrivate) {
            div.classList.add('private-message');
        }

        // 格式化时间
        const createTime = new Date(message.createTime).toLocaleString('zh-CN');

        let content = `
            <div class="message-header">
                <span class="character-name" style="color: ${characterColor}">
                    ${fields.name?.stringValue || '未知'}
                </span>
                <span class="message-time">${createTime}</span>
            </div>
            <div class="message-content">${this.escapeHtml(fields.text?.stringValue || '')}</div>
        `;

        // 私聊信息
        if (isPrivate) {
            content += `<div class="private-info">私聊给: ${fields.toName?.stringValue || '未知'}</div>`;
        }

        // 骰子结果
        if (hasDice) {
            const roll = fields.extend.mapValue.fields.roll.mapValue.fields;
            content += `<div class="dice-result">${roll.result?.stringValue || ''}</div>`;
        }

        div.innerHTML = content;
        return div;
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
        document.getElementById('messageCount').textContent = `显示 ${this.filteredMessages.length} / ${this.allMessages.length} 条消息`;
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
        document.getElementById('messageCount').textContent = `显示 ${this.filteredMessages.length} / ${this.allMessages.length} 条消息`;
    }

    exportLogs() {
        if (this.allMessages.length === 0) {
            alert('没有可导出的数据');
            return;
        }

        const exportData = {
            roomId: document.getElementById('roomId').value,
            exportTime: new Date().toISOString(),
            messageCount: this.allMessages.length,
            messages: this.allMessages.map(msg => this.processMessageForExport(msg))
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
        return {
            id: message.name.split('/').pop(),
            createTime: message.createTime,
            updateTime: message.updateTime,
            character: {
                name: message.fields.name?.stringValue,
                color: message.fields.color?.stringValue,
                from: message.fields.from?.stringValue
            },
            content: message.fields.text?.stringValue,
            type: message.fields.type?.stringValue,
            channel: message.fields.channelName?.stringValue,
            isEdited: message.fields.edited?.booleanValue,
            isPrivate: !!message.fields.to?.stringValue,
            dice: message.fields.extend?.mapValue?.fields?.roll ? {
                result: message.fields.extend.mapValue.fields.roll.mapValue.fields.result?.stringValue,
                success: message.fields.extend.mapValue.fields.roll.mapValue.fields.success?.booleanValue,
                critical: message.fields.extend.mapValue.fields.roll.mapValue.fields.critical?.booleanValue,
                fumble: message.fields.extend.mapValue.fields.roll.mapValue.fields.fumble?.booleanValue
            } : null
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TrpgLogViewer();
});