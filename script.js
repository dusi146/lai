// CẤU HÌNH
const DAILY_TARGET = 1000000; 
const STREAK_MIN = 100000;
const ALLOWED_UIDS = ["dusi146", "themmoi", "Baongayxua"]; 

// 👇👇👇 LINK GOOGLE SHEET CỦA BẠN (GIỮ NGUYÊN LINK CŨ NẾU CHƯA ĐỔI) 👇👇👇
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxzs7BlYUgQr36lCMS0Sewbgc2QSFtYZ1idWvT-biOgP98eENhrJBpUemCrmb2wI67l/exec"; 

// Elements
const loginScreen = document.getElementById('loginScreen');
const uidInput = document.getElementById('uidInput');
const btn = document.getElementById('elasticBtn');
const moneyInput = document.getElementById('moneyInput');
const clickSound = document.getElementById('clickSound');
const todayDisplay = document.getElementById('todayTotalDisplay');
const progStatus = document.getElementById('progStatus');
const streakEl = document.getElementById('streakNumber');
const miniLog = document.getElementById('miniLog');
const themeBtn = document.getElementById('themeToggleBtn');
const welcomeEl = document.getElementById('welcomeText');
const submitBtn = document.getElementById('submitMoneyBtn'); // Nút tích V

let currentUser = null;
let appData = {};
let userIP = "Đang lấy IP..."; // Biến lưu IP người dùng

// 1. INIT
function init() {
    const savedTheme = localStorage.getItem('money_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcon(true);
    } else { updateThemeIcon(false); }
    
    // Tự động lấy IP ngay khi mở web
    fetchIP();

    const savedUser = localStorage.getItem('money_current_user');
    if (ALLOWED_UIDS.includes(savedUser)) {
        uidInput.value = savedUser;
        currentUser = savedUser;
        welcomeEl.innerText = `HELLO ${savedUser}`;
        syncFromCloud();
    }
}
init();

// HÀM LẤY IP TỰ ĐỘNG
function fetchIP() {
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            userIP = data.ip;
            console.log("IP của bạn: " + userIP);
        })
        .catch(error => {
            console.error('Không lấy được IP:', error);
            userIP = "Không xác định";
        });
}

function login() {
    const uid = uidInput.value.trim();
    if (!ALLOWED_UIDS.includes(uid)) {
        alert("UID không hợp lệ!");
        uidInput.value = "";
        return;
    }
    currentUser = uid;
    localStorage.setItem('money_current_user', uid);
    welcomeEl.innerText = `HELLO ${uid}`;
    loadData();
    loginScreen.style.display = 'none';
    renderUI();
    syncFromCloud();
}

function logout() {
    localStorage.removeItem('money_current_user');
    location.reload();
}

// 2. MENU & THEME
function toggleMenu() {
    const wrapper = document.querySelector('.menu-wrapper');
    const dropdown = document.getElementById('menuDropdown');
    dropdown.classList.toggle('show');
    wrapper.classList.toggle('active');
}

document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.menu-wrapper');
    const dropdown = document.getElementById('menuDropdown');
    if (!e.target.closest('.menu-wrapper')) {
        dropdown.classList.remove('show');
        wrapper.classList.remove('active');
    }
});

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('money_theme', isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
}

function updateThemeIcon(isLight) {
    if (isLight) {
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i> Chế độ Sáng';
    } else {
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i> Chế độ Tối';
    }
}

// 3. MODALS
function showModal(type) {
    const wrapper = document.querySelector('.menu-wrapper');
    const dropdown = document.getElementById('menuDropdown');
    dropdown.classList.remove('show');
    wrapper.classList.remove('active');

    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));

    if (type === 'history') {
        renderHistory();
        document.getElementById('historyModal').classList.add('active');
    } else if (type === 'ranking') {
        renderRanking();
        document.getElementById('rankingModal').classList.add('active');
    }
}

function closeModal(type) {
    if (type === 'history') document.getElementById('historyModal').classList.remove('active');
    else if (type === 'ranking') document.getElementById('rankingModal').classList.remove('active');
}

// 4. SYNC TO GOOGLE SHEET (ĐÃ NÂNG CẤP GỬI IP)
function syncToSheet(amount) {
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("DÁN_LINK")) {
        console.log("Chưa cấu hình link Google Sheet!");
        return;
    }

    miniLog.innerText = "Đang gửi lên mây..."; 
    
    // Lấy thông tin thiết bị (iPhone, Android, PC...)
    const deviceInfo = navigator.userAgent;

    fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            uid: currentUser,
            amount: amount,
            ip: userIP,       // Gửi thêm IP
            device: deviceInfo // Gửi thêm thông tin thiết bị
        })
    }).then(() => {
        const now = new Date();
        const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
        miniLog.innerHTML = `Đã lưu Server lúc ${time}`;
    }).catch(err => {
        miniLog.innerText = "Lỗi mạng! Chỉ lưu trên máy.";
        console.error(err);
    });
}

// 5. CORE LOGIC
btn.addEventListener('click', e => {
    e.stopPropagation();
    if (btn.classList.contains('expand')) return;
    clickSound.currentTime = 0; clickSound.volume = 0.5; clickSound.play();
    btn.classList.add('expand');
    setTimeout(() => moneyInput.focus(), 300);
});

document.addEventListener('click', (e) => {
    if (!btn.contains(e.target)) { btn.classList.remove('expand'); moneyInput.blur(); }
});

moneyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleInputSubmit();
});

// XỬ LÝ NÚT TÍCH V
if(submitBtn) {
    submitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleInputSubmit();
    });
}

function handleInputSubmit() {
    const amount = parseInt(moneyInput.value);
    if (amount > 0) {
        addTransaction(amount);
        btn.classList.remove('expand');
        moneyInput.value = '';
        moneyInput.blur();
    } else {
        moneyInput.focus();
    }
}

function loadData() {
    const raw = localStorage.getItem(`data_${currentUser}`);
    appData = raw ? JSON.parse(raw) : { transactions: [], streak: 0, lastStreakDate: null };
}

function saveData() { localStorage.setItem(`data_${currentUser}`, JSON.stringify(appData)); }

function addTransaction(amount) {
    const now = new Date();
    appData.transactions.unshift({ amount: amount, date: now.toISOString(), timestamp: now.getTime() });
    
    const totalToday = calculateTodayTotal();
    const todayStr = now.toISOString().split('T')[0];
    if (totalToday >= STREAK_MIN && appData.lastStreakDate !== todayStr) {
        appData.streak++;
        appData.lastStreakDate = todayStr;
        triggerFireEffect();
    }
    
    saveData();
    renderUI();
    syncToSheet(amount); // Gửi dữ liệu (kèm IP) lên Server
}

function calculateTodayTotal() {
    const todayStr = new Date().toISOString().split('T')[0];
    return appData.transactions.filter(tx => tx.date.startsWith(todayStr)).reduce((sum, tx) => sum + tx.amount, 0);
}

function formatMoney(num) { return new Intl.NumberFormat('vi-VN').format(num) + ' đ'; }

function renderUI() {
    const total = calculateTodayTotal();
    todayDisplay.innerText = formatMoney(total);
    streakEl.innerText = appData.streak;
    let percent = (total / DAILY_TARGET) * 100;
    if (percent > 100) percent = 100;
    progStatus.style.width = `${percent}%`;
    
    if (appData.transactions.length > 0) {
        const lastTx = appData.transactions[0];
        const d = new Date(lastTx.date);
        miniLog.innerHTML = `Vừa lụm <span style="color:var(--accent); font-weight:bold">+${formatMoney(lastTx.amount)}</span> lúc ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (appData.transactions.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:var(--text-sub)'>Chưa có dữ liệu.</p>";
        return;
    }
    let html = '';
    let currentDate = '';
    appData.transactions.forEach(tx => {
        const d = new Date(tx.date);
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        if (dateStr !== currentDate) {
            html += `<div style="background:var(--border); padding:5px 10px; margin:15px 0 5px 0; border-radius:5px; font-size:0.8rem; color:var(--text-sub)">${dateStr}</div>`;
            currentDate = dateStr;
        }
        const timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
        html += `<div class="history-item"><span>${timeStr}</span><span style="font-weight:bold">+${formatMoney(tx.amount)}</span></div>`;
    });
    list.innerHTML = html;
}

function renderRanking() {
    const list = document.getElementById('rankingList');
    list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub)"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px"></i><br>Đang tải rank...</div>`;

    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("DÁN_LINK")) {
        list.innerHTML = "<p style='text-align:center; color:#ff4757'>Chưa kết nối Google Sheet!</p>"; return;
    }

    fetch(GOOGLE_SHEET_URL)
        .then(response => response.json())
        .then(data => {
            let leaderboard = {};
            data.forEach(item => {
                if (!leaderboard[item.uid]) leaderboard[item.uid] = 0;
                leaderboard[item.uid] += item.amount;
            });
            let sortedRank = Object.keys(leaderboard).map(uid => ({ uid: uid, total: leaderboard[uid] })).sort((a, b) => b.total - a.total);

            let html = `<div style="margin-bottom:15px; text-align:center; color:var(--text-sub); font-size:0.9rem">BẢNG XẾP HẠNG SERVER (REALTIME)</div>`;
            if (sortedRank.length === 0) { html += "<p style='text-align:center'>Trống trơn.</p>"; } 
            else {
                sortedRank.forEach((player, index) => {
                    let rankIcon = index + 1;
                    let rowClass = "rank-item";
                    let style = "";
                    if (index === 0) { rankIcon = "🥇"; style = "color:#ffd700; font-weight:bold; border-color:#ffd700"; }
                    else if (index === 1) { rankIcon = "🥈"; style = "color:#c0c0c0; font-weight:bold"; }
                    else if (index === 2) { rankIcon = "🥉"; style = "color:#cd7f32; font-weight:bold"; }
                    if (player.uid === currentUser) { rowClass += " highlight"; if(index > 2) style = "color:var(--accent); font-weight:bold"; }
                    html += `<div class="${rowClass}" style="${style}"><div style="display:flex; gap:10px; align-items:center"><span style="width:25px; text-align:center">${rankIcon}</span><span>${player.uid} ${player.uid === currentUser ? '(YOU)' : ''}</span></div><span>${formatMoney(player.total)}</span></div>`;
                });
            }
            list.innerHTML = html;
        })
        .catch(err => { console.error(err); list.innerHTML = "<p style='text-align:center; color:#ff4757'>Lỗi kết nối Server!</p>"; });
}

function triggerFireEffect() {
    for(let i=0; i<30; i++) {
        const p = document.createElement('div');
        p.classList.add('fire-particle');
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = '-10px';
        p.style.animationDuration = (Math.random() * 2 + 1) + 's';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 3000);
    }
}

function syncFromCloud() {
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("DÁN_LINK")) return;
    fetch(GOOGLE_SHEET_URL).then(r=>r.json()).then(data => {
        const myTransactions = data.filter(item => item.uid === currentUser);
        if (myTransactions.length > 0) {
            let newTransactions = myTransactions.map(item => ({ amount: item.amount, date: new Date().toISOString(), timestamp: new Date().getTime() }));
            appData.transactions = newTransactions.reverse();
            saveData(); renderUI();
            miniLog.innerText = "Đã đồng bộ dữ liệu!";
        }
    }).catch(e => console.error(e));
}
