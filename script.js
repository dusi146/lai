// CẤU HÌNH
const DAILY_TARGET = 1000000; 
const STREAK_MIN = 100000;
const ALLOWED_UIDS = ["dusi146", "themmoi", "themmoi1"]; // Thêm thoải mái vào đây;

// 👇👇👇 DÁN CÁI LINK CỦA MÀY VÀO TRONG DẤU NGOẶC KÉP DƯỚI ĐÂY 👇👇👇
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwGauGl0N2JUG-Jwe8_U40PIrRmCCabvC7Pp4z0P6PQUNgLdXvREoh2Kpxo6OY6xMmd/exec"; 
// Ví dụ: const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycb.../exec";

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

let currentUser = null;
let appData = {};

// 1. INIT
function init() {
    const savedTheme = localStorage.getItem('money_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcon(true);
    } else { updateThemeIcon(false); }
    
    const savedUser = localStorage.getItem('money_current_user');
   if (ALLOWED_UIDS.includes(savedUser)) {
        uidInput.value = savedUser;
        currentUser = savedUser;
        welcomeEl.innerText = `HELLO ${savedUser}`;
    }
}
init();

function login() {
    const uid = uidInput.value.trim();
    if (!ALLOWED_UIDS.includes(uid)) {
    alert("UID không hợp lệ!.");
        uidInput.value = "";
        return;
    }
    currentUser = uid;
    localStorage.setItem('money_current_user', uid);
    welcomeEl.innerText = `HELLO ${uid}`;
    loadData();
    loginScreen.style.display = 'none';
    renderUI();
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

// 4. SYNC TO GOOGLE SHEET (HÀM MỚI)
function syncToSheet(amount) {
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("DÁN_LINK")) {
        console.log("Chưa cấu hình link Google Sheet!");
        return;
    }

    miniLog.innerText = "Đang đồng bộ mây..."; // Báo hiệu đang gửi
    
    fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors', // Quan trọng để không bị chặn
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            uid: currentUser,
            amount: amount
        })
    }).then(() => {
        // Cập nhật lại log sau khi gửi xong
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
    if (e.key === 'Enter') {
        const amount = parseInt(moneyInput.value);
        if (amount > 0) {
            addTransaction(amount);
            btn.classList.remove('expand');
            moneyInput.value = '';
            moneyInput.blur();
        }
    }
});

function loadData() {
    const raw = localStorage.getItem(`data_${currentUser}`);
    appData = raw ? JSON.parse(raw) : { transactions: [], streak: 0, lastStreakDate: null };
}

function saveData() { localStorage.setItem(`data_${currentUser}`, JSON.stringify(appData)); }

function addTransaction(amount) {
    const now = new Date();
    appData.transactions.unshift({ amount: amount, date: now.toISOString(), timestamp: now.getTime() });
    
    // Xử lý Streak
    const totalToday = calculateTodayTotal();
    const todayStr = now.toISOString().split('T')[0];
    if (totalToday >= STREAK_MIN && appData.lastStreakDate !== todayStr) {
        appData.streak++;
        appData.lastStreakDate = todayStr;
        triggerFireEffect();
    }
    
    saveData();
    renderUI();
    
    // Gửi lên Google Sheet
    syncToSheet(amount);
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
    
    // Log mặc định nếu chưa gửi sheet
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

// HÀM RENDER RANKING (REALTIME TỪ SERVER)
function renderRanking() {
    const list = document.getElementById('rankingList');
    
    // 1. Hiện trạng thái đang tải
    list.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-sub)">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px"></i><br>
            Đang lấy dữ liệu từ máy chủ...
        </div>
    `;

    // 2. Gọi Google Sheet để lấy data
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("DÁN_LINK")) {
        list.innerHTML = "<p style='text-align:center; color:#ff4757'>Chưa kết nối Google Sheet!</p>";
        return;
    }

    fetch(GOOGLE_SHEET_URL)
        .then(response => response.json())
        .then(data => {
            // 3. Xử lý dữ liệu: Gom nhóm theo UID
            let leaderboard = {};
            
            data.forEach(item => {
                if (!leaderboard[item.uid]) leaderboard[item.uid] = 0;
                leaderboard[item.uid] += item.amount;
            });

            // Chuyển sang mảng để sắp xếp
            let sortedRank = Object.keys(leaderboard).map(uid => {
                return { uid: uid, total: leaderboard[uid] };
            });

            // Sắp xếp từ cao xuống thấp
            sortedRank.sort((a, b) => b.total - a.total);

            // 4. Render ra HTML
            let html = `<div style="margin-bottom:15px; text-align:center; color:var(--text-sub); font-size:0.9rem">BẢNG XẾP HẠNG SERVER (REALTIME)</div>`;
            
            if (sortedRank.length === 0) {
                html += "<p style='text-align:center'>Chưa có ai cày cuốc cả.</p>";
            } else {
                sortedRank.forEach((player, index) => {
                    let rankIcon = index + 1;
                    let rowClass = "rank-item";
                    let style = "";

                    // Trang trí cho Top 1, 2, 3
                    if (index === 0) { rankIcon = "🥇"; style = "color:#ffd700; font-weight:bold; border-color:#ffd700"; }
                    else if (index === 1) { rankIcon = "🥈"; style = "color:#c0c0c0; font-weight:bold"; }
                    else if (index === 2) { rankIcon = "🥉"; style = "color:#cd7f32; font-weight:bold"; }

                    // Highlight chính mình
                    if (player.uid === currentUser) {
                        rowClass += " highlight";
                        if(index > 2) style = "color:var(--accent); font-weight:bold";
                    }

                    html += `
                        <div class="${rowClass}" style="${style}">
                            <div style="display:flex; gap:10px; align-items:center">
                                <span style="width:25px; text-align:center">${rankIcon}</span>
                                <span>${player.uid} ${player.uid === currentUser ? '(YOU)' : ''}</span>
                            </div>
                            <span>${formatMoney(player.total)}</span>
                        </div>
                    `;
                });
            }
            
            list.innerHTML = html;
        })
        .catch(err => {
            console.error(err);
            list.innerHTML = "<p style='text-align:center; color:#ff4757'>Lỗi kết nối Server!</p>";
        });
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
