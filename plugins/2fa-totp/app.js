(function() {
    console.log('2fa-totp: App.js initialization started');
    
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength, padString) {
            targetLength = targetLength >> 0;
            padString = String((typeof padString !== 'undefined' ? padString : ' '));
            if (this.length > targetLength) {
                return String(this);
            } else {
                targetLength = targetLength - this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength / padString.length);
                }
                return padString.slice(0, targetLength) + String(this);
            }
        };
    }

    try {
        const { createApp, ref, onMounted, onUnmounted, nextTick } = Vue;

        // --- TOTP Algorithms (Pure JS) ---
        function SHA1(msg) {
            function rotateLeft(n, s) { return (n << s) | (n >>> (32 - s)); }
            function hex(n) {
                let s = "";
                for (let i = 7; i >= 0; i--) s += ((n >>> (i * 4)) & 0xf).toString(16);
                return s;
            }
            const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
            msg += String.fromCharCode(0x80);
            const l = msg.length / 4 + 2;
            const N = Math.ceil(l / 16);
            const M = new Array(N);
            for (let i = 0; i < N; i++) {
                M[i] = new Array(16);
                for (let j = 0; j < 16; j++) {
                    M[i][j] = (msg.charCodeAt(i * 64 + j * 4) << 24) | (msg.charCodeAt(i * 64 + j * 4 + 1) << 16) | (msg.charCodeAt(i * 64 + j * 4 + 2) << 8) | (msg.charCodeAt(i * 64 + j * 4 + 3));
                }
            }
            const lenBits = (msg.length - 1) * 8;
            M[N - 1][14] = Math.floor(lenBits / 4294967296);
            M[N - 1][15] = lenBits & 0xffffffff;
            let H0 = 0x67452301, H1 = 0xefcdab89, H2 = 0x98badcfe, H3 = 0x10325476, H4 = 0xc3d2e1f0;
            for (let i = 0; i < N; i++) {
                const W = new Array(80);
                for (let t = 0; t < 16; t++) W[t] = M[i][t];
                for (let t = 16; t < 80; t++) W[t] = rotateLeft(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
                let a = H0, b = H1, c = H2, d = H3, e = H4;
                for (let t = 0; t < 80; t++) {
                    const s = Math.floor(t / 20);
                    const T = (rotateLeft(a, 5) + (s == 0 ? (b & c) ^ (~b & d) : s == 1 ? b ^ c ^ d : s == 2 ? (b & c) ^ (b & d) ^ (c & d) : b ^ c ^ d) + e + K[s] + W[t]) & 0xffffffff;
                    e = d; d = c; c = rotateLeft(b, 30); b = a; a = T;
                }
                H0 = (H0 + a) & 0xffffffff; H1 = (H1 + b) & 0xffffffff; H2 = (H2 + c) & 0xffffffff; H3 = (H3 + d) & 0xffffffff; H4 = (H4 + e) & 0xffffffff;
            }
            return (hex(H0) + hex(H1) + hex(H2) + hex(H3) + hex(H4));
        }
        function hmac_sha1(key, msg) {
            if (key.length > 64) key = hex2bin(SHA1(key));
            if (key.length < 64) key += new Array(64 - key.length + 1).join(String.fromCharCode(0));
            let ipad = "", opad = "";
            for (let i = 0; i < 64; i++) {
                ipad += String.fromCharCode(key.charCodeAt(i) ^ 0x36);
                opad += String.fromCharCode(key.charCodeAt(i) ^ 0x5c);
            }
            return SHA1(opad + hex2bin(SHA1(ipad + msg)));
        }
        function hex2bin(hex) {
            let res = "";
            for (let i = 0; i < hex.length; i += 2) res += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            return res;
        }
        function base32tohex(base32) {
            const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let bits = ""; let hex = "";
            base32 = base32.replace(/\s/g, "").replace(/=+$/, ""); 
            for (let i = 0; i < base32.length; i++) {
                let val = base32chars.indexOf(base32.charAt(i).toUpperCase());
                if (val === -1) continue;
                bits += val.toString(2).padStart(5, '0');
            }
            for (let i = 0; i + 4 <= bits.length; i += 4) {
                let chunk = bits.substr(i, 4);
                hex = hex + parseInt(chunk, 2).toString(16);
            }
            return hex;
        }
        function getTOTP(secret) {
            try {
                const epoch = Math.round(new Date().getTime() / 1000.0);
                const time = Math.floor(epoch / 30).toString(16).padStart(16, '0');
                const hmac = hmac_sha1(hex2bin(base32tohex(secret)), hex2bin(time));
                const offset = parseInt(hmac.substring(hmac.length - 1), 16);
                let otp = (parseInt(hmac.substr(offset * 2, 8), 16) & 0x7fffffff) + "";
                otp = otp.substr(otp.length - 6, 6);
                return otp.padStart(6, '0');
            } catch (e) { return "Error"; }
        }

        // --- Vue App ---
        const STORAGE_KEY = 'totp-accounts-v2';
        const CONFIG_KEY = 'totp-settings';

        const app = createApp({
            setup() {
                const accounts = ref([]);
                const config = ref({ timerStyle: 'circle' });
                
                const showModal = ref(false);
                const showAbout = ref(false);
                const showSettings = ref(false);
                const showSelectMenu = ref(false);
                
                const modalTitle = ref('');
                const modalForm = ref({ id: '', name: '', secret: '' });
                const nameError = ref(false);
                const secretError = ref(false);

                const menuVisible = ref(false);
                const menuPos = ref({ x: 0, y: 0 });
                const menuContext = ref(null); 

                const showConfirm = ref(false);
                const confirmData = ref({ name: '', id: '' });

                const timeLeft = ref(30);
                const toastMsg = ref('');
                const tokens = ref({});
                const nameInput = ref(null);

                const dragIndex = ref(null);
                const isDragging = ref(false);

                const loadAccounts = () => {
                    try {
                        const z = window.ztools;
                        const res = z && z.db ? z.db.get(STORAGE_KEY) : null;
                        if (res && res.data) {
                            accounts.value = res.data;
                        }
                        const cfg = z && z.db ? z.db.get(CONFIG_KEY) : null;
                        if (cfg && cfg.data) {
                            config.value = { ...config.value, ...cfg.data };
                        }
                    } catch (e) { console.error('Load Error:', e); }
                    updateTokens();
                };

                const saveAccounts = () => {
                    try {
                        const z = window.ztools;
                        if (!z || !z.db) return;
                        let existing = null;
                        try { existing = z.db.get(STORAGE_KEY); } catch(e){}
                        z.db.put({ _id: STORAGE_KEY, _rev: existing ? existing._rev : undefined, data: JSON.parse(JSON.stringify(accounts.value)) });
                    } catch (e) { console.error('Save Error:', e); }
                };

                const saveConfig = () => {
                    try {
                        const z = window.ztools;
                        if (!z || !z.db) return;
                        let existing = null;
                        try { existing = z.db.get(CONFIG_KEY); } catch(e){}
                        z.db.put({ _id: CONFIG_KEY, _rev: existing ? existing._rev : undefined, data: JSON.parse(JSON.stringify(config.value)) });
                    } catch (e) { console.error('Config Save Error:', e); }
                };

                const updateTokens = () => {
                    const epoch = Math.round(new Date().getTime() / 1000.0);
                    timeLeft.value = 30 - (epoch % 30);
                    const newTokens = {};
                    accounts.value.forEach(acc => {
                        newTokens[acc.id] = getTOTP(acc.secret);
                    });
                    tokens.value = newTokens;
                };

                const getPinnedCount = () => accounts.value.filter(a => a.pinned).length;

                const handleAction = (action) => {
                    const acc = menuContext.value;
                    if (!acc) return;
                    if (action === 'delete') {
                        confirmData.value = { name: acc.name, id: acc.id };
                        showConfirm.value = true;
                    } else if (action === 'edit') {
                        modalTitle.value = '修改账号';
                        modalForm.value = { id: acc.id, name: acc.name, secret: acc.secret };
                        nameError.value = false; secretError.value = false;
                        showModal.value = true;
                    } else if (action === 'pin') {
                        acc.pinned = !acc.pinned;
                        const oldIdx = accounts.value.findIndex(a => a.id === acc.id);
                        if (oldIdx !== -1) {
                            const [item] = accounts.value.splice(oldIdx, 1);
                            if (item.pinned) {
                                accounts.value.unshift(item);
                            } else {
                                // 取消置顶：移动到所有置顶项之后的第一个位置
                                const pinnedCount = getPinnedCount();
                                accounts.value.splice(pinnedCount, 0, item);
                            }
                        }
                        saveAccounts();
                    }
                    menuVisible.value = false;
                };

                const handleDragStart = (index, e) => {
                    if (accounts.value[index].pinned) {
                        e.preventDefault(); return;
                    }
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', index);
                    
                    // 异步隐藏原位，确保 ghost image 已生成
                    setTimeout(() => {
                        dragIndex.value = index;
                        isDragging.value = true;
                    }, 0);
                };

                const handleDragOver = (index, e) => {
                    if (dragIndex.value === null || dragIndex.value === index) return;
                    if (accounts.value[index].pinned) return; 

                    const rect = e.currentTarget.getBoundingClientRect();
                    const nextMid = (rect.top + rect.bottom) / 2;
                    // 阈值保护，防止抽搐
                    if (e.clientY < nextMid && dragIndex.value < index) return; 
                    if (e.clientY > nextMid && dragIndex.value > index) return;

                    const list = accounts.value;
                    const draggedItem = list[dragIndex.value];
                    list.splice(dragIndex.value, 1);
                    list.splice(index, 0, draggedItem);
                    dragIndex.value = index;
                };

                const handleDragEnd = () => {
                    isDragging.value = false;
                    dragIndex.value = null;
                    saveAccounts();
                };

                const handleDrop = (index, e) => {
                    isDragging.value = false;
                    dragIndex.value = null;
                };

                const openAddModal = () => {
                    modalTitle.value = '添加账号';
                    modalForm.value = { id: '', name: '', secret: '' };
                    nameError.value = false; secretError.value = false;
                    showModal.value = true;
                    menuVisible.value = false;
                    nextTick(() => nameInput.value?.focus());
                };

                const handleModalSubmit = () => {
                    const name = modalForm.value.name.trim();
                    const secret = modalForm.value.secret.trim().replace(/\s/g, '');
                    if (!name) nameError.value = true;
                    if (!secret) secretError.value = true;
                    if (!name || !secret) return;
                    
                    if (modalForm.value.id) {
                        const idx = accounts.value.findIndex(a => a.id === modalForm.value.id);
                        if (idx !== -1) {
                            accounts.value[idx].name = name;
                            accounts.value[idx].secret = secret;
                        }
                    } else {
                        // 新账号排在置顶项后
                        const pinnedCount = getPinnedCount();
                        accounts.value.splice(pinnedCount, 0, { id: Date.now().toString(), name, secret, pinned: false });
                    }
                    saveAccounts(); showModal.value = false; updateTokens();
                };

                const showContextMenu = (acc, e) => {
                    menuContext.value = acc;
                    menuVisible.value = true;
                    nextTick(() => {
                        let x = e.clientX; let y = e.clientY;
                        if (x + 100 > window.innerWidth) x = window.innerWidth - 110;
                        if (y + 130 > window.innerHeight) y = window.innerHeight - 140;
                        menuPos.value = { x, y };
                    });
                };

                const hideContextMenu = () => { menuVisible.value = false; showSelectMenu.value = false; };
                const confirmDelete = () => {
                    accounts.value = accounts.value.filter(a => a.id !== confirmData.value.id);
                    saveAccounts(); updateTokens(); showConfirm.value = false;
                };
                const copyCode = (acc) => {
                    const code = tokens.value[acc.id];
                    if (code && code !== 'Error') {
                        if (window.ztools) { window.ztools.hideMainWindowTypeString(code); window.ztools.copyText(code); }
                        showToast('已复制密钥');
                    }
                };
                const showToast = (msg) => {
                    toastMsg.value = msg;
                    setTimeout(() => { toastMsg.value = ''; }, 2000);
                };
                const getFormattedToken = (id) => {
                    const t = tokens.value[id] || '......';
                    return t.slice(0, 3) + ' ' + t.slice(3);
                };

                const openExternal = (url) => {
                    if (window.ztools && window.ztools.shellOpenExternal) {
                        window.ztools.shellOpenExternal(url);
                    } else {
                        window.open(url, '_blank');
                    }
                };

                onMounted(() => {
                    if (window.ztools && window.ztools.isDarkColors && window.ztools.isDarkColors()) {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    }
                    loadAccounts();
                    setInterval(updateTokens, 1000);
                    window.addEventListener('click', hideContextMenu);
                });

                return { 
                    accounts, config, toastMsg, timeLeft, tokens, 
                    showModal, modalTitle, modalForm, nameInput, showAbout, showSettings, showSelectMenu,
                    nameError, secretError,
                    showConfirm, confirmData, confirmDelete,
                    menuVisible, menuPos, menuContext,
                    openAddModal, handleModalSubmit, saveConfig,
                    showContextMenu, hideContextMenu, handleAction,
                    copyCode, getFormattedToken, openExternal,
                    handleDragStart, handleDragOver, handleDragEnd, handleDrop,
                    dragIndex, isDragging
                };
            }
        });
        app.mount('#app');
    } catch (e) {
        document.body.innerHTML = '<div style="color:red;padding:20px;">运行异常: ' + e.message + '</div>';
    }
})();
