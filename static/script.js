const socket = io();
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const currentRoomDisplay = document.getElementById('current-room');
const roomList = document.getElementById('room-list');
const newRoomInput = document.getElementById('new-room-input');
const createRoomButton = document.getElementById('create-room-button');
const cursor = document.getElementById('cursor');
const helpButton = document.getElementById('help-button');

let currentRoom = 'default';
let rooms = ['default'];
let myUserId = getOrCreateUserId();

// Create a map to store reaction counts for each message
const reactionCounts = {};

function getOrCreateUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

function updateRoomList() {
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const li = document.createElement('li');
        li.textContent = room;
        li.onclick = () => joinRoom(room);
        if (room === currentRoom) {
            li.classList.add('active');
        }
        roomList.appendChild(li);
    });
}

function joinRoom(roomName) {
    if (currentRoom !== roomName) {
        socket.emit('leave', {room: currentRoom});
        socket.emit('join', {room: roomName});
        currentRoom = roomName;
        chatMessages.innerHTML = '';
        currentRoomDisplay.textContent = `Current Room: ${roomName}`;
        addMessage({message: `You joined room: ${roomName}`, nickname: 'System'});
        updateRoomList();
        socket.emit('get_chat_history', {room: roomName});
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function addMessage(data) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (data.nickname === 'System') {
        messageElement.classList.add('system');
        messageElement.textContent = data.message;
    } else {
        if (data.userId === myUserId) {
            messageElement.classList.add('sent');
        } else {
            messageElement.classList.add('received');
        }
        
        const nicknameElement = document.createElement('div');
        nicknameElement.classList.add('nickname');
        const nicknameToDisplay = (myUserId === 'The Creator') ? 'The Creator' : data.nickname;
        const crownIcon = (myUserId === 'The Creator') ? '<img src="static/crown.svg" alt="Crown Icon" style="width: 1em; height: 1em; vertical-align: middle; filter: brightness(0) saturate(100%) invert(30%) sepia(100%) saturate(1000%) hue-rotate(120deg);" />' : '';
        nicknameElement.innerHTML = nicknameToDisplay + ' ' + crownIcon;
        
        const contentElement = document.createElement('div');
        contentElement.classList.add('content');
        
        // Escape the message before processing
        data.message = escapeHtml(data.message);
        
        // Check for GIF format in the message
        const gifRegex = /gif\((.*?)\)/g;
        const messageWithGifs = data.message.replace(gifRegex, '<img src="$1" alt="GIF" class="gif" onerror="this.style.display=\'none\'" />');
        
        // Check for URLs in the message
        const urlRegex = /link\((https?:\/\/[^\s]+)\)/g; // Only allow valid HTTP/HTTPS URLs
        const messageWithLinks = messageWithGifs.replace(urlRegex, (match, url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        
        // Check for italic format in the message
        const italicRegex = /italic\((.*?)\)/g;
        const messageWithItalics = messageWithLinks.replace(italicRegex, '<span style="font-style: italic;">$1</span>');
        
        // Check for red format in the message
        const redRegex = /red\((.*?)\)/g;
        const messageWithRed = messageWithItalics.replace(redRegex, '<span style="color: red;">$1</span>');
        
        // Check for bold format in the message
        const boldRegex = /bold\((.*?)\)/g;
        const messageWithBold = messageWithRed.replace(boldRegex, '<span style="font-weight: bold;">$1</span>');
        
        // Check for blue format in the message
        const blueRegex = /blue\((.*?)\)/g;
        const messageWithBlue = messageWithBold.replace(blueRegex, '<span style="color: blue;">$1</span>');
        
        // Check for underline format in the message
        const underlineRegex = /underline\((.*?)\)/g;
        const messageWithUnderline = messageWithBlue.replace(underlineRegex, '<span style="text-decoration: underline;">$1</span>');
        
        // Limit message length to 2000 characters
        if (data.message.length > 2000) {
            data.message = data.message.substring(0, 2000) + '...'; // Truncate and indicate overflow
        }
        
        console.log('Processed message:', messageWithUnderline); // Debugging line
        contentElement.innerHTML = messageWithUnderline; // Use innerHTML to allow link rendering
        
        const timestampElement = document.createElement('div');
        timestampElement.classList.add('timestamp');
        const messageTime = new Date(data.timestamp);
        if (isNaN(messageTime.getTime())) {
            timestampElement.textContent = 'Invalid date';
        } else {
            timestampElement.textContent = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        messageElement.appendChild(nicknameElement);
        messageElement.appendChild(contentElement);
        messageElement.appendChild(timestampElement);
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        const messageData = { 
            message: message, 
            userId: myUserId, 
            nickname: document.getElementById('user-nickname').textContent,
            room: currentRoom,
            timestamp: new Date().toISOString()
        };
        socket.emit('message', messageData);
        addMessage(messageData);
        messageInput.value = '';
    }
}

function showTypingIndicator(data) {
    const existingIndicator = document.querySelector('.typing-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    if (data.isTyping && data.userId !== myUserId) {
        const indicator = document.createElement('div');
        indicator.classList.add('typing-indicator', 'message', 'received');
        
        const nicknameElement = document.createElement('div');
        nicknameElement.classList.add('nickname');
        nicknameElement.textContent = data.nickname;
        
        const dotsContainer = document.createElement('div');
        dotsContainer.classList.add('typing-dots');
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            dotsContainer.appendChild(dot);
        }
        
        indicator.appendChild(nicknameElement);
        indicator.appendChild(dotsContainer);
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('get_chat_history', {room: currentRoom});
});

socket.on('update_rooms', (data) => {
    rooms = data.rooms;
    updateRoomList();
});

socket.on('message', (data) => {
    console.log('Received timestamp:', data.timestamp);
    addMessage(data);
});

socket.on('chat_history', (data) => {
    chatMessages.innerHTML = '';
    data.history.forEach(addMessage);
});

socket.on('typing', (data) => {
    if (data.room === currentRoom) {
        showTypingIndicator(data);
    }
});

sendButton.onclick = sendMessage;
messageInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

let typingTimeout = null;
messageInput.oninput = () => {
    clearTimeout(typingTimeout);
    socket.emit('typing', { isTyping: true, room: currentRoom, userId: myUserId });
    typingTimeout = setTimeout(() => {
        socket.emit('typing', { isTyping: false, room: currentRoom, userId: myUserId });
    }, 1000);
};

createRoomButton.onclick = () => {
    const newRoomName = newRoomInput.value.trim();
    if (newRoomName === 'IAMTHEREALCREATOR') {
        const password = prompt('Enter the secret password:');
        if (password === 'GiveMeTheCrown') { 
            if (localStorage.getItem('isCreator') === 'true') {
                alert('There is already a Creator!');
            } else {
                myUserId = 'The Creator';
                localStorage.setItem('isCreator', 'true');
                document.getElementById('user-nickname').innerHTML = 'The Creator <img src="static/crown.svg" alt="Crown Icon" style="width: 20px; height: 20px; vertical-align: middle;" />';
            }
        } else {
            alert('Incorrect password!');
        }
    } else {
        joinRoom(newRoomName);
    }
    newRoomInput.value = '';
};

// On page load, check if the user is the creator
if (localStorage.getItem('isCreator') === 'true') {
    myUserId = 'The Creator';
    document.getElementById('user-nickname').innerHTML = 'The Creator <img src="static/crown.svg" alt="Crown Icon" style="width: 20px; height: 20px; vertical-align: middle;" />';
}

// Custom cursor
document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

// Remove these event listeners if you don't want the cursor to change on click
// document.addEventListener('mousedown', () => {
//     cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
// });

// document.addEventListener('mouseup', () => {
//     cursor.style.transform = 'translate(-50%, -50%) scale(1)';
// });

// Initialize the chat
updateRoomList();
joinRoom(currentRoom);

helpButton.onclick = () => {
    document.getElementById('help-modal').style.display = 'block';
};

document.getElementById('close-help-modal').onclick = () => {
    document.getElementById('help-modal').style.display = 'none';
};