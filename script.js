// CẤU HÌNH
const DAILY_TARGET = 1000000; 
const STREAK_MIN = 100000;
const ALLOWED_UIDS = ["dusi146", "themmoi", "Baongayxua"]; 

// 👇👇👇 LINK GOOGLE SHEET CỦA BẠN 👇👇👇
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwqaiwAqHQS3Q8OLtlY22ITtxNllfMwURC9-6vzQwlhHFIYY_RDhs_PG_xbFqYYikFP/exec"; 

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
const submitBtn = document.getElementById('submitMoneyBtn');

let currentUser = null;
let appData = {};
let userIP = "Đang lấy IP...";

// 1. INIT
function init() {
    const savedTheme = localStorage.getItem('money_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        updateThemeIcon(true);
    } else { updateThemeIcon(false); }
    
    fetchIP();

    const savedUser = localStorage.getItem('money_current_user');
    if (ALLOWED_UIDS.includes(savedUser)) {
        uidInput.value = savedUser;
        currentUser = savedUser;
        welcomeEl.innerText = `HELLO ${savedUser}`;
        
        // Load dữ liệu và hiển thị ngay lập tức
        loadData(); 
        renderUI();
        
        // Sau đó mới đồng bộ ngầm
        syncFromCloud();
    }
}
init();

function fetchIP() {
    fetch('https://api.ipify.org?format=json')
        .then(res => res.json()).then(data => userIP = data.ip)
        .catch(() => userIP = "Không xác định");
}

function login() {
    const uid = uidInput.value.trim();
    if (!ALLOWED_UIDS.includes(uid)) {
        alert("UID không hợp lệ!");
        uidInput.value = ""; return;
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
    document.getElementById('menuDropdown').classList.toggle('show');
    document.querySelector('.menu-wrapper').classList.toggle('active');
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-wrapper')) {
        document.getElementById('menuDropdown').classList.remove('show');
        document.querySelector('.menu-wrapper').classList.remove('active');
    }
});
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('money_theme', isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
}
function updateThemeIcon(isLight) {
    themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i> Chế độ Sáng' : '<i class="fa-solid fa-moon"></i> Chế độ Tối';
}

// 3. MODALS
function showModal(type) {
    document.getElementById('menuDropdown').classList.remove('show');
    document.querySelector('.menu-wrapper').classList.remove('active');
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

// 4. SYNC (ĐÃ FIX LOGIC NGÀY THÁNG)
function syncToSheet(amount) {
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("DÁN_LINK")) return;
    miniLog.innerText = "Đang gửi lên mây..."; 
    const deviceInfo = navigator.userAgent;

    fetch(GOOGLE_SHEET_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser, amount: amount, ip: userIP, device: deviceInfo })
    }).then(() => {
        const now = new Date();
        miniLog.innerHTML = `Đã lưu Server lúc ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
    }).catch(err => miniLog.innerText = "Lỗi mạng! Chỉ lưu trên máy.");
}

function syncFromCloud() {
    if (!GOOGLE_SHEET_URL) return;
    
    fetch(GOOGLE_SHEET_URL).then(r=>r.json()).then(data => {
        const myTransactions = data.filter(item => item.uid === currentUser);
        if (myTransactions.length > 0) {
            // MAP DỮ LIỆU: Giữ nguyên ngày tháng từ Server gửi về (quan trọng)
            let newTransactions = myTransactions.map(item => {
                // Xử lý ngày tháng từ Google Sheet trả về
                let dateObj = new Date(item.date);
                return { 
                    amount: item.amount, 
                    date: dateObj.toISOString(), 
                    timestamp: dateObj.getTime() 
                };
            });
            
            // Sắp xếp lại: Mới nhất lên đầu
            newTransactions.sort((a, b) => b.timestamp - a.timestamp);

            appData.transactions = newTransactions;
            saveData(); 
            renderUI();
            miniLog.innerText = "Đã đồng bộ dữ liệu!";
        }
    }).catch(e => console.error(e));
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
moneyInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleInputSubmit(); });
if(submitBtn) { submitBtn.addEventListener('click', (e) => { e.stopPropagation(); handleInputSubmit(); }); }

function handleInputSubmit() {
    const amount = parseInt(moneyInput.value);
    if (amount > 0) {
        addTransaction(amount);
        btn.classList.remove('expand');
        moneyInput.value = ''; moneyInput.blur();
    } else { moneyInput.focus(); }
}

function loadData() {
    const raw = localStorage.getItem(`data_${currentUser}`);
    appData = raw ? JSON.parse(raw) : { transactions: [], streak: 0, lastStreakDate: null };
}
function saveData() { localStorage.setItem(`data_${currentUser}`, JSON.stringify(appData)); }

function addTransaction(amount) {
    const now = new Date();
    // Thêm giao dịch mới vào đầu danh sách
    appData.transactions.unshift({ amount: amount, date: now.toISOString(), timestamp: now.getTime() });
    
    // Logic Streak
    const totalToday = calculateTodayTotal();
    const todayStr = now.toISOString().split('T')[0];
    if (totalToday >= STREAK_MIN && appData.lastStreakDate !== todayStr) {
        appData.streak++;
        appData.lastStreakDate = todayStr;
        triggerFireEffect();
    }
    saveData(); renderUI(); syncToSheet(amount);
}

// FIX: Hàm tính tổng ngày hôm nay chuẩn xác
function calculateTodayTotal() {
    const now = new Date();
    // Reset giờ về 0 để so sánh ngày
    now.setHours(0,0,0,0);
    
    return appData.transactions.reduce((sum, tx) => {
        const txDate = new Date(tx.date);
        txDate.setHours(0,0,0,0);
        // Chỉ cộng nếu cùng ngày tháng năm
        if (txDate.getTime() === now.getTime()) {
            return sum + tx.amount;
        }
        return sum;
    }, 0);
}

function formatMoney(num) { return new Intl.NumberFormat('vi-VN').format(num) + ' đ'; }

function renderUI() {
    const total = calculateTodayTotal();
    todayDisplay.innerText = formatMoney(total);
    streakEl.innerText = appData.streak;
    let percent = (total / DAILY_TARGET) * 100;
    if (percent > 100) percent = 100;
    progStatus.style.width = `${percent}%`;
}

// FIX: Render Lịch sử hiển thị chi tiết
function renderHistory() {
    const list = document.getElementById('historyList');
    if (!appData.transactions || appData.transactions.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:var(--text-sub)'>Chưa có dữ liệu.</p>";
        return;
    }
    let html = '';
    let currentDate = '';
    
    appData.transactions.forEach(tx => {
        const d = new Date(tx.date);
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        
        // Nhóm theo ngày
        if (dateStr !== currentDate) {
            html += `<div style="background:var(--border); padding:5px 10px; margin:15px 0 5px 0; border-radius:5px; font-size:0.8rem; color:var(--text-sub); font-weight:bold">${dateStr}</div>`;
            currentDate = dateStr;
        }
        
        // Hiển thị giờ:phút:giây
        const timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
        html += `
            <div class="history-item">
                <span style="color:var(--text-sub); font-size:0.9rem">${timeStr}</span>
                <span style="font-weight:bold; color:var(--accent)">+${formatMoney(tx.amount)}</span>
            </div>`;
    });
    list.innerHTML = html;
}

function renderRanking() {
    const list = document.getElementById('rankingList');
    list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub)"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px"></i><br>Đang tải rank...</div>`;
    if (!GOOGLE_SHEET_URL) { list.innerHTML = "Lỗi Link"; return; }

    fetch(GOOGLE_SHEET_URL).then(r => r.json()).then(data => {
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
                if (index === 0) { rankIcon = "🥇"; style = "color:#ffd700; font-weight:bold;"; }
                else if (index === 1) { rankIcon = "🥈"; style = "color:#c0c0c0; font-weight:bold"; }
                else if (index === 2) { rankIcon = "🥉"; style = "color:#cd7f32; font-weight:bold"; }
                if (player.uid === currentUser) { rowClass += " highlight"; }
                
                html += `<div class="${rowClass}" style="${style}">
                    <div style="display:flex; gap:10px; align-items:center">
                        <span style="width:25px; text-align:center">${rankIcon}</span>
                        <span>${player.uid} ${player.uid === currentUser ? '(YOU)' : ''}</span>
                    </div>
                    <span>${formatMoney(player.total)}</span>
                </div>`;
            });
        }
        list.innerHTML = html;
    }).catch(err => list.innerHTML = "Lỗi kết nối Server!");
}
