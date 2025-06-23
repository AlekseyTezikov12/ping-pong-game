document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const themeToggle = document.getElementById('theme-toggle');
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');

    const deviceQuestion = document.getElementById('device-question');
    const welcomeMainBtns = document.getElementById('welcome-main-btns');
    const lastGroupBtn = document.getElementById('last-group-btn');

    // Screens
    const mainMenu = document.getElementById('main-menu');
    const createGroupScreen = document.getElementById('create-group');
    const joinGroupScreen = document.getElementById('join-group');
    const groupPage = document.getElementById('group-page');

    // Inputs
    const creatorNameInput = document.getElementById('creator-name');
    const joinerNameInput = document.getElementById('joiner-name');
    const groupCodeInput = document.getElementById('group-code-input');
    const groupMessageTextarea = document.getElementById('group-message');

    // --- App State ---
    let state = {
        currentScreen: 'welcome',
        theme: 'light',
        device: null,
        userName: '',
        groupCode: null,
        members: [],
        message: ''
    };

    // --- THEME ---
    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        state.theme = theme;
        themeToggle.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        themeToggle.title = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    }

    themeToggle.addEventListener('click', () => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // --- UI Navigation ---
    function show(screenId) {
        mainApp.style.display = 'block';
        welcomeScreen.style.display = 'none';

        const screens = [mainMenu, createGroupScreen, joinGroupScreen, groupPage];
        screens.forEach(s => s.classList.add('hidden'));

        const screenToShow = document.getElementById(screenId);
        if (screenToShow) {
            screenToShow.classList.remove('hidden');
            state.currentScreen = screenId;
        }
    }

    // --- Welcome Screen Logic ---
    function setDevice(device) {
        localStorage.setItem('device', device);
        state.device = device;
        deviceQuestion.style.display = 'none';
        welcomeMainBtns.style.display = 'block';
    }

    function hideWelcome() {
        welcomeScreen.style.opacity = '0';
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
            mainApp.style.display = 'block';
            show('main-menu');
        }, 500);
    }

    function goToLastGroup() {
        const lastGroup = localStorage.getItem('lastGroup');
        if (lastGroup) {
            // Here we would implement joining the group
            showToast(`Вход в группу ${lastGroup}...`);
            // For now, just hide welcome
            hideWelcome();
        }
    }

    // --- Group Logic ---
    function createGroup() {
        const creatorName = creatorNameInput.value.trim();
        if (!creatorName) {
            showToast('Пожалуйста, введите ваше имя', 'error');
            return;
        }
        state.userName = creatorName;
        localStorage.setItem('userName', creatorName);
        showToast('Создание группы...');
        // Backend logic will go here
        // For now, let's simulate it
        setTimeout(() => {
            state.groupCode = 'DEMO123';
            state.members = [creatorName];
            document.getElementById('code-text').textContent = state.groupCode;
            updateMembersList();
            show('group-page');
        }, 1000);
    }

    function joinGroup() {
        const joinerName = joinerNameInput.value.trim();
        const groupCode = groupCodeInput.value.trim().toUpperCase();

        if (!joinerName || !groupCode) {
            showToast('Пожалуйста, заполните все поля', 'error');
            return;
        }
        state.userName = joinerName;
        localStorage.setItem('userName', joinerName);
        showToast(`Вход в группу ${groupCode}...`);
        // Backend logic will go here
    }
    
    function confirmLeaveGroup() {
        if (confirm('Вы уверены, что хотите выйти из группы?')) {
            leaveGroup();
        }
    }
    
    function leaveGroup() {
        showToast('Вы вышли из группы');
        state.groupCode = null;
        state.members = [];
        state.message = '';
        localStorage.removeItem('lastGroup');
        show('main-menu');
    }

    function changeName() {
        const newName = prompt('Введите ваше новое имя:', state.userName);
        if (newName && newName.trim() !== '') {
            state.userName = newName.trim();
            localStorage.setItem('userName', state.userName);
            showToast('Имя изменено на ' + state.userName);
            // Update name on server and for other members
        }
    }
    
    function updateMembersList() {
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = '';
        state.members.forEach(member => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fa-solid fa-user"></i> ${member}`;
            if(member === state.userName) {
                li.innerHTML += ' (Вы)';
            }
            membersList.appendChild(li);
        });
    }

    // --- Clipboard & Sharing ---
    function copyToClipboard(text, successMessage) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMessage);
        }, () => {
            showToast('Не удалось скопировать', 'error');
        });
    }

    function copyGroupCode() {
        copyToClipboard(state.groupCode, 'Код группы скопирован!');
    }
    function copyGroupLink() {
        const link = `${window.location.origin}${window.location.pathname}?group=${state.groupCode}`;
        copyToClipboard(link, 'Ссылка на группу скопирована!');
    }
    function copyMembers() {
        const memberNames = state.members.join('\n');
        copyToClipboard(memberNames, 'Список участников скопирован!');
    }

    // --- Messaging ---
    function saveMessage() {
        const message = groupMessageTextarea.value;
        if (message.trim() !== '') {
            showToast('Сообщение сохранено (симуляция)');
            // Backend logic to send message
        }
    }
    
    // --- Toast Notifications ---
    const toast = document.getElementById('toast');
    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
    
    // --- Event Listeners ---
    function setupEventListeners() {
        // Welcome Screen
        document.querySelector('.welcome-btn[onclick*="mobile"]').onclick = () => setDevice('mobile');
        document.querySelector('.welcome-btn[onclick*="desktop"]').onclick = () => setDevice('desktop');
        document.querySelector('.welcome-btn[onclick*="hideWelcome"]').onclick = hideWelcome;
        lastGroupBtn.onclick = goToLastGroup;

        // Main Menu
        document.querySelector('button[onclick*="create-group"]').onclick = () => show('create-group');
        document.querySelector('button[onclick*="join-group"]').onclick = () => show('join-group');
        
        // Create Group
        document.querySelector('#create-group button[onclick*="createGroup"]').onclick = createGroup;
        document.querySelector('#create-group button[onclick*="main-menu"]').onclick = () => show('main-menu');

        // Join Group
        document.querySelector('#join-group button[onclick*="joinGroup"]').onclick = joinGroup;
        document.querySelector('#join-group button[onclick*="main-menu"]').onclick = () => show('main-menu');
        
        // Group Page
        document.getElementById('current-group-code').onclick = copyGroupCode;
        document.querySelector('button[onclick*="changeName"]').onclick = changeName;
        document.querySelector('button[onclick*="copyGroupCode"]').onclick = copyGroupCode;
        document.querySelector('button[onclick*="copyGroupLink"]').onclick = copyGroupLink;
        document.querySelector('button[onclick*="copyMembers"]').onclick = copyMembers;
        document.querySelector('button[onclick*="saveMessage"]').onclick = saveMessage;
        document.querySelector('button[onclick*="confirmLeaveGroup"]').onclick = confirmLeaveGroup;

    }

    // --- Initialization ---
    function init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);

        const savedName = localStorage.getItem('userName');
        if(savedName) {
            state.userName = savedName;
            creatorNameInput.value = savedName;
            joinerNameInput.value = savedName;
        }

        const lastGroup = localStorage.getItem('lastGroup');
        if (lastGroup) {
            lastGroupBtn.style.display = 'inline-flex';
        }

        mainApp.style.display = 'none';

        setupEventListeners();

        // Handle joining via URL
        const urlParams = new URLSearchParams(window.location.search);
        const groupCodeFromUrl = urlParams.get('group');
        if (groupCodeFromUrl) {
            hideWelcome();
            show('join-group');
            groupCodeInput.value = groupCodeFromUrl;
        }
    }

    init();
}); 