const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // Разрешаем запросы с локального фронта (Live Server, http-server и т.д.)
        origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3002;

// --- Rate limiting for HTTP API ---
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 60, // не более 60 запросов в минуту с одного IP
    message: 'Слишком много запросов, попробуйте позже.'
});
app.use(limiter);

// Serve the frontend files
// This assumes your backend is in a 'backend' folder and the frontend is in the parent folder
app.use(express.static(path.join(__dirname, '..'))); 

// --- In-memory storage and limits ---
const MAX_GROUPS = 1000;
const MAX_USERS_PER_GROUP = 50;
const MAX_NAME_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 500;
const groups = {};
/*
Structure of `groups` object:
{
    'GROUP_CODE': {
        messages: [ { user, text, timestamp, type: 'message' | 'notification' } ],
        members: {
            'socketId': 'userName',
            ...
        }
    }
}
*/

const createNotification = (text) => ({ user: 'System', text, timestamp: Date.now(), type: 'notification' });

io.on('connection', (socket) => {
    // --- Socket rate limiting (basic) ---
    let lastMessageTime = 0;
    let messageCount = 0;
    const MESSAGE_LIMIT = 20; // 20 сообщений в минуту
    const MESSAGE_WINDOW = 60 * 1000;

    setInterval(() => { messageCount = 0; }, MESSAGE_WINDOW);

    const broadcastMembers = (groupCode) => {
        if (groups[groupCode]) {
            io.to(groupCode).emit('members-update', Object.values(groups[groupCode].members));
        }
    };
    
    const broadcastTyping = (groupCode, user, isTyping) => {
        socket.to(groupCode).emit('user-typing', { user, isTyping });
    };

    // --- GROUP MANAGEMENT ---

    socket.on('create-group', (userName, callback) => {
        console.log('[create-group]', userName);
        if (!userName || typeof userName !== 'string' || !userName.trim()) {
            console.log('[create-group] fail: empty name');
            return callback({ success: false, message: 'Имя пользователя обязательно.' });
        }
        if (userName.length > MAX_NAME_LENGTH) {
            console.log('[create-group] fail: name too long');
            return callback({ success: false, message: 'Имя слишком длинное.' });
        }
        if (Object.keys(groups).length >= MAX_GROUPS) {
            console.log('[create-group] fail: too many groups');
            return callback({ success: false, message: 'Слишком много групп. Попробуйте позже.' });
        }
        let groupCode;
        // Ensure unique group code
        do {
            groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (groups[groupCode]);

        socket.join(groupCode);
        groups[groupCode] = {
            messages: [createNotification(`${userName} создал(а) группу.`)],
            members: { [socket.id]: userName }
        };

        console.log('[create-group] success:', groupCode);
        callback({ success: true, groupCode, messages: groups[groupCode].messages });
        broadcastMembers(groupCode);
    });

    socket.on('join-group', ({ userName, groupCode }, callback) => {
        console.log('[join-group]', userName, groupCode);
        if (!userName || typeof userName !== 'string' || !userName.trim()) {
            console.log('[join-group] fail: empty name');
            return callback({ success: false, message: 'Имя пользователя обязательно.' });
        }
        if (userName.length > MAX_NAME_LENGTH) {
            console.log('[join-group] fail: name too long');
            return callback({ success: false, message: 'Имя слишком длинное.' });
        }
        if (!groups[groupCode]) {
            console.log('[join-group] fail: group not found');
            return callback({ success: false, message: 'Группа не найдена.' });
        }
        if (Object.keys(groups[groupCode].members).length >= MAX_USERS_PER_GROUP) {
            console.log('[join-group] fail: group full');
            return callback({ success: false, message: 'В группе слишком много участников.' });
        }

        const notification = createNotification(`${userName} присоединился(ась).`);
        groups[groupCode].messages.push(notification);
        io.to(groupCode).emit('new-message', notification);
        
        socket.join(groupCode);
        groups[groupCode].members[socket.id] = userName;

        console.log('[join-group] success:', groupCode);
        callback({
            success: true,
            groupCode,
            members: Object.values(groups[groupCode].members),
            messages: groups[groupCode].messages
        });

        broadcastMembers(groupCode);
    });

    socket.on('change-name', ({ groupCode, newName }, callback) => {
        console.log('[change-name]', groupCode, newName);
        if (!newName || typeof newName !== 'string' || !newName.trim()) {
            return callback({ success: false, message: 'Имя обязательно.' });
        }
        if (newName.length > MAX_NAME_LENGTH) {
            return callback({ success: false, message: 'Имя слишком длинное.' });
        }
        if (groups[groupCode] && groups[groupCode].members[socket.id]) {
            const oldName = groups[groupCode].members[socket.id];
            groups[groupCode].members[socket.id] = newName;
            
            const notification = createNotification(`${oldName} сменил(а) имя на ${newName}.`);
            groups[groupCode].messages.push(notification);
            io.to(groupCode).emit('new-message', notification);

            broadcastMembers(groupCode);
            callback({ success: true });
        } else {
            callback({ success: false, message: 'Не удалось сменить имя.' });
        }
    });

    socket.on('leave-group', (groupCode) => {
        console.log('[leave-group]', groupCode);
        leaveGroup(socket, groupCode);
    });
    
    // --- MESSAGING ---
    
    socket.on('send-message', ({ groupCode, text }) => {
        console.log('[send-message]', groupCode, text);
        if (!text || typeof text !== 'string' || !text.trim()) return;
        if (text.length > MAX_MESSAGE_LENGTH) return;
        if (groups[groupCode] && groups[groupCode].members[socket.id]) {
            // Rate limit per socket
            const now = Date.now();
            if (now - lastMessageTime < 500) return; // не чаще 2 сообщений в секунду
            if (messageCount >= MESSAGE_LIMIT) return;
            lastMessageTime = now;
            messageCount++;
            const message = {
                user: groups[groupCode].members[socket.id],
                text,
                timestamp: Date.now(),
                type: 'message'
            };
            groups[groupCode].messages.push(message);
            io.to(groupCode).emit('new-message', message);
            broadcastTyping(groupCode, message.user, false);
            console.log(`Message from ${message.user} in group ${groupCode}`);
        }
    });
    
    socket.on('typing', ({ groupCode, isTyping }) => {
        if (groups[groupCode] && groups[groupCode].members[socket.id]) {
            const user = groups[groupCode].members[socket.id];
            broadcastTyping(groupCode, user, isTyping);
        }
    });

    // --- DISCONNECTION ---

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Find which group the user was in and remove them
        for (const groupCode in groups) {
            if (groups[groupCode].members[socket.id]) {
                leaveGroup(socket, groupCode);
                break;
            }
        }
    });

    // --- HELPERS ---

    const leaveGroup = (socket, groupCode) => {
        if (groups[groupCode] && groups[groupCode].members[socket.id]) {
            const userName = groups[groupCode].members[socket.id];
            console.log(`User ${userName} (${socket.id}) left group ${groupCode}`);
            
            delete groups[groupCode].members[socket.id];
            socket.leave(groupCode);

            const notification = createNotification(`${userName} покинул(а) группу.`);
            groups[groupCode].messages.push(notification);
            io.to(groupCode).emit('new-message', notification);

            // If the group is now empty, delete it
            if (Object.keys(groups[groupCode].members).length === 0) {
                delete groups[groupCode];
                console.log(`Group ${groupCode} is empty and has been deleted.`);
            } else {
                // Otherwise, notify remaining members
                broadcastMembers(groupCode);
            }
        }
    };
});

server.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
}); 