import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
    query, where, orderBy, limit, serverTimestamp, getDocs, startAfter
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBfJthCuyCOQtyjUFtGOqDD5MhAlAKmBJU",
    authDomain: "market-30cd6.firebaseapp.com",
    projectId: "market-30cd6",
    storageBucket: "market-30cd6.firebasestorage.app",
    messagingSenderId: "339341925839",
    appId: "1:339341925839:web:c6395a82c9b88d494ec6ba",
    measurementId: "G-F7ZK7JFWHZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ========== أدوات مساعدة ========== */
export const escapeHTML = str => str == null ? '' : String(str).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

const normAr = (t = '') => String(t).toLowerCase()
    .replace(/[أإآاء]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '').trim();

let toastQueue = [];
function showToast(msg, type = 'info') {
    toastQueue.push({ msg, type });
    if (toastQueue.length === 1) _showNextToast();
}
function _showNextToast() {
    if (!toastQueue.length) return;
    const { msg, type } = toastQueue[0];
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:${type==='success'?'#2ecc71':type==='error'?'#e74c3c':'#3498db'};color:#fff;padding:12px 24px;border-radius:30px;z-index:10000;box-shadow:0 4px 15px rgba(0,0,0,0.2);transition:opacity .3s;font-family:inherit;max-width:90%;text-align:center;`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => { el.remove(); toastQueue.shift(); _showNextToast(); }, 300); }, 3000);
}

/* ========== إدارة الصور ========== */
const IMGBB_KEY = "42b6820dc31a25d977adefc41f83aa70", MAX_MB = 15, MAX_W = 600, WEBP_Q = 0.75;

export async function uploadImageToImgBB(fileOrInput) {
    const file = fileOrInput instanceof File ? fileOrInput : (fileOrInput && fileOrInput.files && fileOrInput.files[0]);
    if (!file) return '';
    if (file.size > MAX_MB * 1024 * 1024) { showToast(`⚠️ الحد الأقصى ${MAX_MB} ميغابايت.`, 'error'); return ''; }
    try {
        const fd = new FormData();
        fd.append('image', await compressImageFile(file), 'product.webp');
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        return (await res.json()).data.url || '';
    } catch (e) {
        console.error(e);
        showToast("⚠️ تعذر رفع الصورة.", 'error');
        return '';
    }
}

function compressImageFile(file) {
    return new Promise(resolve => {
        const r = new FileReader();
        r.onload = e => {
            const img = new Image();
            img.onload = () => {
                try {
                    const c = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > MAX_W) { h = Math.round((h * MAX_W) / w); w = MAX_W; }
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    c.toBlob(b => resolve(b || file), 'image/webp', WEBP_Q);
                } catch { resolve(file); }
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        r.onerror = () => resolve(file);
        r.readAsDataURL(file);
    });
}

/* ========== ضغط الصور القديمة ========== */
export async function compressOldBase64Images() {
    console.log("⏳ بدء ضغط الصور القديمة...");
    let lastDoc = null, total = 0, hasMore = true;
    const BATCH = 15;
    try {
        while (hasMore) {
            const c = [collection(db, "products"), orderBy("createdAt", "desc"), limit(BATCH)];
            if (lastDoc) c.push(startAfter(lastDoc));
            const snap = await getDocs(query(...c));
            if (snap.empty) break;
            for (const d of snap.docs) {
                const data = d.data(), url = String(data.imageUrl || '').trim();
                if (url.startsWith('data:image') && !data.isCompressed) {
                    try {
                        const comp = await compressBase64ToWebP(url, 400, 0.6);
                        if (comp && comp !== url) {
                            await updateDoc(doc(db, "products", d.id), { imageUrl: comp, isCompressed: true });
                            total++;
                            const lp = globalProducts.find(p => p.id === d.id);
                            if (lp) { lp.imageUrl = comp; lp.isCompressed = true; }
                        }
                    } catch (err) { console.error(`خطأ ضغط ${d.id}:`, err); }
                }
                await new Promise(r => setTimeout(r, 60));
            }
            lastDoc = snap.docs[snap.docs.length - 1];
            hasMore = snap.docs.length === BATCH;
        }
        applyFilters();
        showToast(`✅ تم ضغط ${total} صورة قديمة.`, 'success');
    } catch (e) {
        console.error(e);
        showToast("❌ فشل ضغط الصور القديمة", 'error');
    }
}

function compressBase64ToWebP(base64, maxW, q) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
                c.width = w; c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(c.toDataURL('image/webp', q));
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = base64;
    });
}

/* ========== المظهر الداكن ========== */
export function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('alukhowah_dark', isDark ? 'true' : 'false');
    updateDarkModeIcons(isDark);
}
function updateDarkModeIcons(isDark) {
    document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon, .dark-mode-icon').forEach(i => i.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon');
}
export function loadDarkModePreference() {
    const isDark = localStorage.getItem('alukhowah_dark') === 'true';
    document.body.classList.toggle('dark', isDark);
    updateDarkModeIcons(isDark);
}

/* ========== حالة التطبيق ========== */
let globalProducts = [], cart = loadCart(), isSubmitting = false;
let currentCategory = 'all', currentSearch = '', currentDeliveryType = 'inside', currentDeliveryKm = 1;
let lastVisibleProduct = null, isLoadingMore = false, hasMoreProducts = true;
const PAGE_SIZE = 24, CAT_PAGE_SIZE = 15;
const categoryLastDocs = {}, categoryHasMoreMap = {}, categoryCache = {};
let isCategoryLoading = false;

function loadCart() { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } }
const saveCart = () => localStorage.setItem('cart', JSON.stringify(cart));

/* ========== نظام الدعوة ========== */
export function getMyReferralCode() {
    let code = localStorage.getItem('myReferralCode');
    if (!code) {
        code = Array.from({ length: 6 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
        localStorage.setItem('myReferralCode', code);
    }
    return code;
}
export const getInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('ref', getMyReferralCode());
    return url.toString();
};

export function shareProduct(platform, productId) {
    const p = globalProducts.find(item => item.id === productId);
    if (!p) return;
    const discount = Number(p.discount) || 0, base = Number(p.price) || 0;
    const final = discount > 0 ? Math.round(base - (base * discount / 100)) : base;
    const code = getMyReferralCode();
    const msg = `🛍️ ${p.name}\n💰 ${final} TL\n🎁 كود خصم 10%: ${code}\n📱 ${window.location.href}`;
    const enc = encodeURIComponent(msg);
    if (platform === 'instagram') navigator.clipboard.writeText(msg).then(() => showToast('✅ تم النسخ', 'success'));
    else if (platform === 'whatsapp') window.open(`https://wa.me/?text=${enc}`, '_blank');
    else if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${enc}`, '_blank');
}

export function handleReferral() {
    const ref = new URLSearchParams(window.location.search).get('ref'), myCode = getMyReferralCode();
    if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
        localStorage.setItem('invitedBy', ref);
        localStorage.setItem('referralUsed', 'true');
        setTimeout(() => showToast('🎉 تم تفعيل خصم 10% على طلبك الأول فوق 100 TL', 'success'), 500);
    }
}
export function getReferralDiscount(total) {
    return (total >= 100 && localStorage.getItem('invitedBy') && !localStorage.getItem('discountApplied')) ? total * 0.10 : 0;
}
export function showReferralCode() {
    const code = getMyReferralCode(), container = document.getElementById('referralContainer');
    if (!container) return;
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div><span style="font-weight:bold;">🎁 كود الخصم: </span><strong style="font-size:20px;color:#ff6b6b;letter-spacing:2px;background:var(--input-bg);padding:4px 12px;border-radius:6px;">${escapeHTML(code)}</strong></div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button onclick="window.copyReferralCode()" style="background:#4CAF50;color:#fff;border:none;padding:5px 15px;border-radius:5px;cursor:pointer;"><i class="fa-regular fa-copy"></i> نسخ</button>
                <button onclick="window.shareReferral()" style="background:#25D366;color:#fff;border:none;padding:5px 15px;border-radius:5px;cursor:pointer;"><i class="fa-brands fa-whatsapp"></i> مشاركة</button>
            </div>
        </div>
        <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على 10% خصم لأول طلب فوق 100 TL</p>`;
}
export const copyReferralCode = () => navigator.clipboard.writeText(getMyReferralCode()).then(() => showToast('✅ تم نسخ الكود', 'success'));
export const shareReferral = () => window.open(`https://wa.me/?text=${encodeURIComponent(`🎁 استخدم كود الخصم في متجر ماركت الأخوة: ${getMyReferralCode()}\n📱 ${window.location.href}`)}`, '_blank');
export function initReferralSystem() { handleReferral(); showReferralCode(); }

/* ========== عرض المنتجات ========== */
function renderSkeletons() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 8 }, () => `
        <div class="product-card skeleton" style="opacity:0.6;pointer-events:none;">
            <div class="product-img" style="background:#e0e0e0;height:180px;border-radius:10px;"></div>
            <div class="product-info" style="padding:10px 0;">
                <div style="background:#e0e0e0;height:15px;width:70%;margin-bottom:8px;border-radius:4px;"></div>
                <div style="background:#e0e0e0;height:20px;width:40%;border-radius:4px;"></div>
            </div>
        </div>`).join('');
}

export function displayProducts(items) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (!items.length) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:30px;">لا توجد منتجات مطابقة.<br><button onclick="window.filterByCategory('all',null)" style="margin-top:10px;padding:8px 20px;background:var(--primary);color:#fff;border:none;border-radius:20px;cursor:pointer;">🔄 إظهار الكل</button></p>`;
        return;
    }
    const favs = getFavorites();
    grid.innerHTML = items.map(p => {
        const isFav = favs.includes(p.id), imgUrl = String(p.imageUrl || '').trim();
        const isValid = imgUrl && imgUrl !== 'null' && imgUrl !== 'undefined';
        const imgHTML = isValid
            ? `<img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(p.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="no-img-fallback" style="display:none;"><i class="fa-solid fa-basket-shopping"></i></div>`
            : `<div class="no-img-fallback"><i class="fa-solid fa-basket-shopping"></i></div>`;
        const discount = Number(p.discount) || 0, original = Number(p.price) || 0;
        const final = discount > 0 ? Math.round(original - (original * discount / 100)) : original;
        const badge = { 'غير متوفر': ['❌ غير متوفر', '#e74c3c'], 'محدود': ['⚠️ محدود', '#f39c12'] }[p.availability || 'متوفر'] || ['✅ متوفر', '#2ecc71'];
        const disable = p.availability === 'غير متوفر';
        let dateTxt = '';
        if (p.availabilityDate) {
            try {
                const d = typeof p.availabilityDate.toDate === 'function' ? p.availabilityDate.toDate() : new Date(p.availabilityDate);
                if (!isNaN(d.getTime())) dateTxt = `<div style="font-size:11px;color:#888;margin:2px 0;">📅 متاح من: ${d.toLocaleDateString('ar-EG')}</div>`;
            } catch {}
        }
        const stars = Array.from({ length: 5 }, (_, i) => `<i class="fa-star ${i < (p.rating || 0) ? 'fa-solid' : 'fa-regular'}" style="color:#f1c40f;"></i>`).join('');
        const safeId = escapeHTML(p.id);
        return `
            <div class="product-card" id="pc-${safeId}">
                ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                <div class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${safeId}',this)"><i class="fa-solid fa-heart"></i></div>
                <div class="product-img">${imgHTML}</div>
                <div class="product-info">
                    <div class="product-title">${escapeHTML(p.name)}</div>
                    <div class="product-price">${discount > 0 ? `<span class="old-price">${original} TL</span>` : ''}${final} TL</div>
                    <div style="margin:3px 0;">${stars}</div>
                    <span style="background:${badge[1]};color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;display:inline-block;margin-top:4px;">${badge[0]}</span>
                    ${dateTxt}
                </div>
                <div class="share-buttons" style="display:flex;gap:8px;margin:5px 0;justify-content:center;">
                    <button onclick="window.shareProduct('whatsapp','${safeId}')" style="background:none;border:none;font-size:18px;cursor:pointer;"><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i></button>
                    <button onclick="window.shareProduct('facebook','${safeId}')" style="background:none;border:none;font-size:18px;cursor:pointer;"><i class="fa-brands fa-facebook" style="color:#1877F2;"></i></button>
                    <button onclick="window.shareProduct('instagram','${safeId}')" style="background:none;border:none;font-size:18px;cursor:pointer;"><i class="fa-brands fa-instagram" style="color:#E4405F;"></i></button>
                </div>
                <button class="btn-add-cart" ${disable ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : `onclick="window.addToCart('${safeId}')"`}>${disable ? 'غير متوفر' : '+ أضف للسلة'}</button>
                ${!disable ? `<button class="btn-quick-buy" onclick="window.quickBuy('${safeId}')" style="margin-top:5px;width:100%;padding:5px;background:#27ae60;color:#fff;border:none;border-radius:5px;cursor:pointer;">⚡ شراء سريع</button>` : ''}
            </div>`;
    }).join('');
}

/* ========== الفلاتر والبحث ========== */
export function applyFilters() {
    let filtered = globalProducts;
    if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
    if (currentSearch.trim()) {
        const s = normAr(currentSearch);
        filtered = filtered.filter(p => normAr(p.name || '').includes(s));
    }
    displayProducts(filtered);
}

export async function filterByCategory(cat, element) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    currentCategory = cat;
    if (cat !== 'all' && !categoryCache[cat]) {
        renderSkeletons();
        await loadProductsByCategory(cat, true);
    }
    applyFilters();
}
window.getCurrentCategory = () => currentCategory;

export async function loadProductsByCategory(category, isInitial = true) {
    if (isCategoryLoading) return;
    if (!isInitial && categoryHasMoreMap[category] === false) return;
    isCategoryLoading = true;
    showToast('جاري تحميل المنتجات...', 'info');
    if (isInitial) { categoryLastDocs[category] = null; categoryHasMoreMap[category] = true; }
    try {
        const c = [collection(db, "products"), where("category", "==", category), orderBy("createdAt", "desc"), limit(CAT_PAGE_SIZE)];
        if (!isInitial && categoryLastDocs[category]) c.push(startAfter(categoryLastDocs[category]));
        const snap = await getDocs(query(...c));
        if (snap.empty) { categoryHasMoreMap[category] = false; showToast('لا توجد منتجات إضافية', 'info'); return; }
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        categoryLastDocs[category] = snap.docs[snap.docs.length - 1];
        categoryHasMoreMap[category] = snap.docs.length === CAT_PAGE_SIZE;
        const existing = new Set(globalProducts.map(p => p.id));
        fetched.forEach(p => { if (!existing.has(p.id)) globalProducts.push(p); });
        categoryCache[category] = true;
        applyFilters();
    } catch (err) { console.error(err); showToast('فشل تحميل المنتجات', 'error'); }
    finally { isCategoryLoading = false; }
}

let searchTimeout;
export function filterBySearch(q) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { currentSearch = q; applyFilters(); }, 300);
}

function throttle(fn, wait) {
    let last = 0;
    return (...args) => { const now = Date.now(); if (now - last >= wait) { last = now; fn(...args); } };
}

function initInfiniteScroll() {
    window.addEventListener('scroll', throttle(() => {
        if (window.innerHeight + window.scrollY < document.body.offsetHeight - 500) return;
        if (currentCategory === 'all' && hasMoreProducts && !isLoadingMore && !currentSearch.trim()) loadMoreProducts();
        else if (currentCategory !== 'all' && categoryHasMoreMap[currentCategory] !== false && !isCategoryLoading && !currentSearch.trim()) loadProductsByCategory(currentCategory, false);
    }, 300));
}

/* ========== المفضلة ========== */
function getFavorites() { try { return JSON.parse(localStorage.getItem('alukhowah_favs') || '[]'); } catch { return []; } }
export function toggleFavorite(productId, btn) {
    let favs = getFavorites();
    const isFav = favs.includes(productId);
    favs = isFav ? favs.filter(id => id !== productId) : [...favs, productId];
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    if (btn) btn.classList.toggle('active', !isFav);
}

/* ========== السلة ========== */
export function updateCartBadge() {
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = cart.reduce((s, i) => s + i.qty, 0);
}

export function addToCart(productId) {
    const p = globalProducts.find(x => x.id === productId);
    if (!p || p.availability === 'غير متوفر') return showToast('❌ المنتج غير متوفر.', 'error');
    if (p.category === 'شحن ألعاب') return redirectToWhatsApp(p);
    const ex = cart.find(i => i.id === productId);
    if (ex) ex.qty += 1;
    else {
        const discount = Number(p.discount) || 0, base = Number(p.price) || 0;
        const final = discount > 0 ? Math.round(base - (base * discount / 100)) : base;
        cart.push({ id: p.id, name: p.name, price: final, discount, qty: 1, imageUrl: p.imageUrl });
    }
    saveCart(); updateCartBadge();
    showToast(`✅ تمت إضافة ${p.name} إلى السلة`, 'success');
}

export function quickBuy(productId) { addToCart(productId); toggleCartModal(); document.getElementById('checkoutForm')?.scrollIntoView({ behavior: 'smooth' }); }

function redirectToWhatsApp(p) {
    const nums = ['905511455598', '905385844122', '905511591245'], num = nums[Math.floor(Math.random() * nums.length)];
    const discount = Number(p.discount) || 0, base = Number(p.price) || 0;
    const final = discount > 0 ? Math.round(base - (base * discount / 100)) : base;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(`مرحباً، أريد شراء: ${p.name}\nالسعر: ${final} TL\nالرجاء إرسال تفاصيل الدفع`)}`, '_blank');
    showToast('✅ تم تحويلك إلى واتساب', 'success');
}

export function changeQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== productId);
    saveCart(); updateCartBadge(); renderCartItems();
}

export function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCart(); updateCartBadge(); renderCartItems();
}

export function updateDelivery() {
    const typeEl = document.getElementById('deliveryType'), kmCont = document.getElementById('kmInputContainer');
    if (typeEl) currentDeliveryType = typeEl.value;
    if (kmCont) kmCont.style.display = currentDeliveryType === 'outside' ? 'block' : 'none';
    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) { const v = Number(kmEl.value); currentDeliveryKm = (isNaN(v) || v < 1) ? 1 : v; }
    renderCartItems();
}

function calculateFinalTotal() {
    const itemsTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const smartPct = itemsTotal >= 1000 ? 10 : (itemsTotal >= 500 ? 5 : 0);
    const smartAmt = itemsTotal * (smartPct / 100);
    let discounted = Math.max(0, itemsTotal - smartAmt);
    const refDiscount = getReferralDiscount(discounted);
    discounted = Math.max(0, discounted - refDiscount);
    const delivery = currentDeliveryType === 'inside' ? 100 : (currentDeliveryKm || 1) * 35;
    return { itemsTotal, smartPct, smartAmt, refDiscount, discounted, delivery, final: discounted + delivery };
}

export function toggleCartModal() {
    const m = document.getElementById('cartModal');
    if (!m) return;
    m.classList.toggle('open');
    if (m.classList.contains('open')) { updateDelivery(); renderCartItems(); }
}

export function renderCartItems() {
    const container = document.getElementById('cartItemsContainer'), summary = document.getElementById('cartSummary');
    if (!container) return;
    if (!cart.length) {
        container.innerHTML = '<p style="text-align:center;color:#888;">السلة فارغة.</p>';
        if (summary) summary.style.display = 'none';
        return;
    }
    container.innerHTML = cart.map(item => {
        const safeId = escapeHTML(item.id);
        return `
        <div class="cart-item">
            <div><strong>${escapeHTML(item.name)}</strong><div style="font-size:12px;color:#666;">${item.price} TL × ${item.qty}</div></div>
            <div style="display:flex;align-items:center;gap:8px;">
                <button class="qty-btn" onclick="window.changeQty('${safeId}',-1)">-</button>
                <span style="font-weight:bold;">${item.qty}</span>
                <button class="qty-btn" onclick="window.changeQty('${safeId}',1)">+</button>
                <span style="font-weight:bold;color:var(--primary);">${item.price * item.qty} TL</span>
                <i class="fa-solid fa-trash" style="color:red;cursor:pointer;" onclick="window.removeFromCart('${safeId}')"></i>
            </div>
        </div>`;
    }).join('');
    if (summary) {
        summary.style.display = 'block';
        const c = calculateFinalTotal();
        summary.innerHTML = `
            <div class="summary-line"><span>مجموع المنتجات:</span><span>${c.itemsTotal} TL</span></div>
            ${c.smartPct > 0 ? `<div class="summary-line discount-text"><span>🎉 خصم ذكي (${c.smartPct}%):</span><span>-${Math.round(c.smartAmt)} TL</span></div>` : ''}
            ${c.refDiscount > 0 ? `<div class="summary-line discount-text"><span>🎁 خصم الدعوة (10%):</span><span>-${Math.round(c.refDiscount)} TL</span></div>` : ''}
            <div class="summary-line"><span>🚚 التوصيل (${currentDeliveryType === 'inside' ? 'داخل عمرانيا' : 'خارج ' + currentDeliveryKm + ' كم'}):</span><span>${c.delivery} TL</span></div>
            <div class="summary-line total"><span>💰 الإجمالي النهائي:</span><span>${Math.round(c.final)} TL</span></div>`;
        const fti = document.getElementById('finalTotal');
        if (fti) fti.value = Math.round(c.final);
    }
}

/* ========== نموذج الطلب ========== */
export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmitting || !cart.length) return;
        const btn = document.getElementById('submitBtn');
        isSubmitting = true; btn.textContent = 'جاري الإرسال...'; btn.disabled = true;
        const phone = (document.getElementById('userPhone')?.value || '').trim();
        const address = (document.getElementById('userAddress')?.value || '').trim();
        const c = calculateFinalTotal();
        try {
            await addDoc(collection(db, "orders"), {
                phone, address,
                items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
                total: Math.round(c.final), itemsTotal: c.itemsTotal,
                smartDiscount: Math.round(c.smartAmt), referralDiscount: Math.round(c.refDiscount),
                deliveryCost: c.delivery, deliveryType: currentDeliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${currentDeliveryKm} كم)`,
                date: new Date().toLocaleString('ar-EG'),
                createdAt: serverTimestamp()
            });
            if (c.refDiscount > 0) localStorage.setItem('discountApplied', 'true');
            showToast(`✅ تم إرسال طلبك! الإجمالي: ${Math.round(c.final)} TL`, 'success');
            cart = []; saveCart(); updateCartBadge(); renderCartItems(); toggleCartModal(); form.reset();
        } catch (err) { showToast('❌ حدث خطأ: ' + err.message, 'error'); }
        finally { isSubmitting = false; btn.textContent = '🚀 تأكيد الطلب'; btn.disabled = false; }
    });
}

export function toggleInfoModal() {
    const m = document.getElementById('infoModal');
    if (m) m.classList.toggle('open');
}

/* ========== تحميل المنتجات ========== */
export async function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    renderSkeletons();
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        const snap = await getDocs(q);
        globalProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        lastVisibleProduct = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
        hasMoreProducts = snap.docs.length === PAGE_SIZE;
        applyFilters();
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color:red;text-align:center;">تعذر تحميل المنتجات. <button onclick="window.initProductsListener()">إعادة المحاولة</button></p>';
    }
}

export async function loadMoreProducts() {
    if (isLoadingMore || !hasMoreProducts || !lastVisibleProduct) return;
    isLoadingMore = true;
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), startAfter(lastVisibleProduct), limit(PAGE_SIZE));
        const snap = await getDocs(q);
        if (snap.empty) { hasMoreProducts = false; }
        else {
            const newP = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            globalProducts.push(...newP);
            lastVisibleProduct = snap.docs[snap.docs.length - 1];
            hasMoreProducts = snap.docs.length === PAGE_SIZE;
            applyFilters();
        }
    } catch (e) { console.error(e); }
    finally { isLoadingMore = false; }
}

/* ========== إدارة المنتجات ========== */
export async function deleteProduct(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        try {
            await deleteDoc(doc(db, "products", productId));
            globalProducts = globalProducts.filter(p => p.id !== productId);
            applyFilters();
            showToast('تم الحذف بنجاح', 'success');
        } catch (e) { showToast('فشل الحذف: ' + e.message, 'error'); }
    }
}

export async function updateProduct(productId, newData) {
    try {
        await updateDoc(doc(db, "products", productId), newData);
        const p = globalProducts.find(x => x.id === productId);
        if (p) Object.assign(p, newData);
        applyFilters();
        showToast('تم التحديث بنجاح', 'success');
    } catch (e) { showToast('فشل التحديث: ' + e.message, 'error'); }
}

/* ========== البحث الصوتي ========== */
export function startVoiceSearch() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return showToast('المتصفح لا يدعم البحث الصوتي', 'error');
    try {
        const r = new SR();
        r.lang = 'ar-EG';
        r.onresult = e => {
            const t = e.results[0][0].transcript.trim();
            const inp = document.getElementById('searchInput');
            if (inp) { inp.value = t; filterBySearch(t); }
        };
        r.onerror = () => showToast('خطأ في التعرف على الصوت', 'error');
        r.start();
    } catch { showToast('تعذر تشغيل البحث الصوتي', 'error'); }
}

/* ========== تهيئة الصفحة ========== */
export function initMainPage() {
    loadDarkModePreference();
    const enterBtn = document.getElementById('enterBtn'), welcomeOverlay = document.getElementById('welcomeOverlay');
    const bgMusic = document.getElementById('bgMusic'), toggleMusicBtn = document.getElementById('toggleMusicBtn'), musicIcon = document.getElementById('musicIcon');

    if (enterBtn && welcomeOverlay) {
        enterBtn.addEventListener('click', () => {
            if (bgMusic) bgMusic.play().then(() => { if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high'; }).catch(() => {
                if (musicIcon) musicIcon.className = 'fa-solid fa-volume-xmark';
                showToast('اضغط على زر الصوت لتشغيل الموسيقى', 'info');
            });
            welcomeOverlay.style.display = 'none';
        });
    }

    if (toggleMusicBtn && bgMusic && musicIcon) {
        toggleMusicBtn.addEventListener('click', () => {
            if (bgMusic.paused) { bgMusic.play(); musicIcon.className = 'fa-solid fa-volume-high'; }
            else { bgMusic.pause(); musicIcon.className = 'fa-solid fa-volume-xmark'; }
        });
    }

    document.querySelectorAll('.dark-toggle').forEach(btn => btn.addEventListener('click', toggleDarkMode));

    initProductsListener();
    initCheckoutForm();
    initReferralSystem();
    updateCartBadge();
    initInfiniteScroll();

    Object.assign(window, {
        toggleFavorite, addToCart, changeQty, removeFromCart, toggleCartModal,
        filterByCategory, filterBySearch, uploadImageToImgBB, compressOldBase64Images,
        updateDelivery, toggleInfoModal, shareProduct, copyReferralCode, shareReferral,
        getMyReferralCode, loadMoreProducts, toggleDarkMode, loadProductsByCategory,
        quickBuy, deleteProduct, updateProduct, startVoiceSearch, initProductsListener
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMainPage);
else initMainPage();
