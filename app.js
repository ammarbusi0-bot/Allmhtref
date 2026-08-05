// ============================================================
//  المتجر الأخوي - النسخة الأسطورية الشاملة (Pro Max Ultimate)
//  جميع الميزات والأخطاء تم إصلاحها، مع إضافات متطورة
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    getDocs,
    writeBatch,
    limit,
    startAfter,
    getCountFromServer,
    where,
    updateDoc,
    arrayUnion,
    arrayRemove
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

// ============================================================
//  الحالة العامة
// ============================================================
let state = {
    products: [],
    filteredProducts: [],
    cart: [],
    favorites: [],
    currentCategory: 'all',
    searchQuery: '',
    deliveryType: 'inside',
    deliveryKm: 1,
    isSubmitting: false,
    isDarkMode: false,
    lastDoc: null,
    hasMore: true,
    isLoading: false,
    pageSize: 20,
    displayedCount: 0,
    referralCode: '',
    discountApplied: false,
    invitedBy: null,
    referralPoints: {}
};

// ============================================================
//  أدوات مساعدة
// ============================================================
export const escapeHTML = str => str == null ? '' : String(str).replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[tag] || tag);
export const validatePhone = phone => /^[0-9]{7,15}$/.test(phone.trim());
export const validateAddress = addr => addr.trim().length >= 5;

export function showToast(msg, type = 'info', duration = 3500) {
    const toast = document.getElementById('customToast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return alert(msg);
    toastMsg.textContent = msg;
    toast.className = `toast ${type}`;
    toast.style.display = 'flex';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.style.display = 'none', duration);
}

// ============================================================
//  نظام الدعوة والخصم (10% بدون حد أقصى)
// ============================================================
export function getMyReferralCode() {
    let code = localStorage.getItem('myReferralCode');
    if (!code) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        localStorage.setItem('myReferralCode', code);
    }
    return code;
}

export function getInviteLink() {
    return `${window.location.origin}${window.location.pathname}?ref=${getMyReferralCode()}`;
}

export function handleReferral() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const myCode = getMyReferralCode();
    if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
        localStorage.setItem('invitedBy', ref);
        localStorage.setItem('referralUsed', 'true');
        state.invitedBy = ref;
        let points = JSON.parse(localStorage.getItem('referralPoints') || '{}');
        points[ref] = (points[ref] || 0) + 1;
        localStorage.setItem('referralPoints', JSON.stringify(points));
        state.referralPoints = points;
        setTimeout(() => showToast('🎉 تم تفعيل كود الخصم 10% على طلبك الأول فوق 100 ليرة', 'success', 5000), 500);
    }
}

export function getReferralDiscount(total) {
    if (total < 100 || !localStorage.getItem('invitedBy') || localStorage.getItem('discountApplied') === 'true') return 0;
    return total * 0.10;
}

export function applyReferralDiscount(total) {
    const discount = getReferralDiscount(total);
    if (discount > 0) {
        localStorage.setItem('discountApplied', 'true');
        state.discountApplied = true;
    }
    return discount;
}

export function showReferralCode() {
    const container = document.getElementById('referralContainer');
    if (!container) return;
    const code = getMyReferralCode();
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div>
                <span style="font-weight:bold;">🎁 كود الخصم: </span>
                <strong style="font-size:20px;color:#ff6b6b;letter-spacing:2px;background:var(--input-bg);padding:4px 12px;border-radius:6px;">${code}</strong>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="window.copyReferralCode()" class="btn-secondary">📋 نسخ</button>
                <button onclick="window.shareReferral()" class="btn-primary">📱 مشاركة</button>
            </div>
        </div>
        <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على خصم 10% لأول طلب فوق 100 ل.س</p>
    `;
}

export function copyReferralCode() {
    navigator.clipboard.writeText(getMyReferralCode())
        .then(() => showToast('✅ تم نسخ الكود', 'success'))
        .catch(() => showToast('فشل النسخ', 'error'));
}

export function shareReferral() {
    const msg = `🎁 استخدم كود الخصم هذا في متجر ماركت الأخوة واحصل على خصم 10%: ${getMyReferralCode()}\n📱 ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// ============================================================
//  السلة
// ============================================================
function loadCart() {
    try {
        const saved = localStorage.getItem('alukhowah_cart');
        if (saved) {
            state.cart = JSON.parse(saved).map(item => {
                const p = state.products.find(pr => String(pr.id) === String(item.id));
                if (p) {
                    const d = p.discount ? Number(p.discount) : 0;
                    const finalPrice = d > 0 ? Math.round(Number(p.price) - (Number(p.price) * d / 100)) : Number(p.price);
                    return { ...item, price: finalPrice, discount: d };
                }
                return item;
            });
            saveCart();
        }
    } catch { state.cart = []; }
}

function saveCart() {
    try { localStorage.setItem('alukhowah_cart', JSON.stringify(state.cart)); } catch {}
}

export function addToCart(id) {
    const product = state.products.find(p => String(p.id) === String(id));
    if (!product) return showToast('المنتج غير موجود', 'error');
    if (product.available === false) return showToast('❌ هذا المنتج غير متوفر حالياً', 'error');
    if (product.category === 'شحن ألعاب') {
        const numbers = ['905511455598', '905385844122', '905511591245'];
        const num = numbers[Math.floor(Math.random() * numbers.length)];
        const d = product.discount ? Number(product.discount) : 0;
        const price = d > 0 ? Math.round(Number(product.price) - (Number(product.price) * d / 100)) : Number(product.price);
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(`مرحباً، أريد شراء: ${product.name}\nالسعر: ${price} ل.س`)}`, '_blank');
        return showToast('✅ تم تحويلك إلى واتساب', 'info');
    }
    const idx = state.cart.findIndex(item => String(item.id) === String(id));
    if (idx > -1) state.cart[idx].qty += 1;
    else {
        const d = product.discount ? Number(product.discount) : 0;
        const price = d > 0 ? Math.round(Number(product.price) - (Number(product.price) * d / 100)) : Number(product.price);
        state.cart.push({ ...product, price, discount: d, qty: 1 });
    }
    saveCart();
    updateCartBadge();
    showToast('✅ تم إضافة المنتج للسلة', 'success');
}

export function changeQty(id, delta) {
    const idx = state.cart.findIndex(item => String(item.id) === String(id));
    if (idx > -1) {
        state.cart[idx].qty += delta;
        if (state.cart[idx].qty <= 0) state.cart.splice(idx, 1);
        saveCart();
        updateCartBadge();
        renderCartItems();
    }
}

export function removeFromCart(id) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    state.cart = state.cart.filter(item => String(item.id) !== String(id));
    saveCart();
    updateCartBadge();
    renderCartItems();
    showToast('تم الحذف', 'info');
}

export function updateCartBadge() {
    const total = state.cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.innerText = total;
}

// ============================================================
//  حساب الإجمالي
// ============================================================
function calculateFinalTotal() {
    const itemsTotal = state.cart.reduce((sum, item) => sum + (item.price * Math.max(0, item.qty)), 0);
    let smartDiscountPercent = 0;
    if (itemsTotal >= 1000) smartDiscountPercent = 10;
    else if (itemsTotal >= 500) smartDiscountPercent = 5;
    const smartDiscountAmount = itemsTotal * (smartDiscountPercent / 100);
    let discounted = Math.max(0, itemsTotal - smartDiscountAmount);
    const referralDiscount = getReferralDiscount(discounted);
    discounted = Math.max(0, discounted - referralDiscount);
    const deliveryCost = state.deliveryType === 'inside' ? 100 : Math.max(1, Number(state.deliveryKm) || 1) * 35;
    return { itemsTotal, smartDiscountPercent, smartDiscountAmount, referralDiscount, discountedItemsTotal: discounted, deliveryCost, finalTotal: discounted + deliveryCost };
}

// ============================================================
//  عرض السلة
// ============================================================
export function toggleCartModal() {
    document.getElementById('cartModal')?.classList.toggle('open');
    if (document.getElementById('cartModal')?.classList.contains('open')) { updateDelivery(); renderCartItems(); }
}

export function renderCartItems() {
    const container = document.getElementById('cartItemsContainer');
    const summaryDiv = document.getElementById('cartSummary');
    if (!container) return;
    if (state.cart.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;">السلة فارغة حالياً.</p>';
        if (summaryDiv) summaryDiv.style.display = 'none';
        return;
    }
    container.innerHTML = state.cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div><strong>${escapeHTML(item.name)}</strong><div style="font-size:12px;color:#666;">${item.price} Lt × ${item.qty}</div></div>
            <div style="display:flex;align-items:center;gap:8px;">
                <button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button>
                <span style="font-weight:bold;">${item.qty}</span>
                <button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button>
                <span style="font-weight:bold;color:var(--primary);">${item.price * item.qty} Lt</span>
                <i class="fa-solid fa-trash" style="color:red;cursor:pointer;" onclick="window.removeFromCart('${item.id}')"></i>
            </div>
        </div>
    `).join('');
    if (summaryDiv) {
        summaryDiv.style.display = 'block';
        const calc = calculateFinalTotal();
        summaryDiv.innerHTML = `
            <div class="summary-line"><span>مجموع المنتجات:</span><span>${calc.itemsTotal} Lt</span></div>
            ${calc.smartDiscountPercent > 0 ? `<div class="summary-line discount-text"><span>🎉 خصم ذكي (${calc.smartDiscountPercent}%):</span><span>-${Math.round(calc.smartDiscountAmount)} Lt</span></div>` : ''}
            ${calc.referralDiscount > 0 ? `<div class="summary-line discount-text"><span>🎁 خصم الدعوة (10%):</span><span>-${Math.round(calc.referralDiscount)} Lt</span></div>` : ''}
            <div class="summary-line"><span>🚚 التوصيل (${state.deliveryType === 'inside' ? 'داخل عمرانيا' : 'خارج ' + state.deliveryKm + ' كم'}):</span><span>${calc.deliveryCost} Lt</span></div>
            <div class="summary-line total"><span>💰 الإجمالي النهائي:</span><span>${Math.round(calc.finalTotal)} Lt</span></div>
        `;
        const input = document.getElementById('finalTotal');
        if (input) input.value = Math.round(calc.finalTotal);
    }
}

export function updateDelivery() {
    const typeEl = document.getElementById('deliveryType');
    const kmContainer = document.getElementById('kmInputContainer');
    if (typeEl) state.deliveryType = typeEl.value;
    if (kmContainer) kmContainer.style.display = state.deliveryType === 'outside' ? 'block' : 'none';
    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) state.deliveryKm = Number(kmEl.value) || 1;
    renderCartItems();
}

// ============================================================
//  إرسال الطلب
// ============================================================
export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (state.isSubmitting || state.cart.length === 0) {
            if (state.cart.length === 0) showToast('السلة فارغة!', 'error');
            return;
        }
        const phone = document.getElementById('userPhone')?.value.trim() || '';
        const address = document.getElementById('userAddress')?.value.trim() || '';
        if (!validatePhone(phone) || !validateAddress(address)) {
            showToast(!validatePhone(phone) ? 'رقم الهاتف غير صحيح' : 'العنوان قصير جداً', 'error');
            return;
        }
        state.isSubmitting = true;
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.innerText = 'جاري إرسال الطلب...'; submitBtn.disabled = true; }
        const itemsSummary = state.cart.map(i => `${i.name} (${i.qty})`).join(' - ');
        const calc = calculateFinalTotal();
        try {
            await addDoc(collection(db, "orders"), {
                phone, address, items: itemsSummary, total: Math.round(calc.finalTotal),
                itemsTotal: calc.itemsTotal, smartDiscount: Math.round(calc.smartDiscountAmount),
                referralDiscount: Math.round(calc.referralDiscount), deliveryCost: calc.deliveryCost,
                deliveryType: state.deliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${state.deliveryKm} كم)`,
                date: new Date().toLocaleString('ar-EG'), createdAt: serverTimestamp(), userId: 'guest'
            });
            showToast(`✅ تم إرسال طلبك بنجاح!\nالإجمالي: ${Math.round(calc.finalTotal)} Lt`, 'success', 5000);
            state.cart = []; saveCart(); updateCartBadge(); renderCartItems(); toggleCartModal(); form.reset();
        } catch (err) { showToast('❌ حدث خطأ: ' + err.message, 'error'); }
        finally {
            state.isSubmitting = false;
            if (submitBtn) { submitBtn.innerText = '🚀 تأكيد الطلب'; submitBtn.disabled = false; }
        }
    });
}

// ============================================================
//  عرض المنتجات (مع التحميل التلقائي)
// ============================================================
export function displayProducts(items, append = false) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (!append) grid.innerHTML = '';
    if (items.length === 0 && !append) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:20px;">لا توجد منتجات متوفرة حالياً.</p>';
        return;
    }
    const favs = state.favorites;
    const fragment = document.createDocumentFragment();
    items.forEach(p => {
        const isFav = favs.includes(String(p.id));
        const imgUrl = String(p.imageUrl || '').trim();
        const isValid = imgUrl && imgUrl !== 'null' && imgUrl !== 'undefined';
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = p.id;
        const discount = p.discount ? Number(p.discount) : 0;
        if (discount > 0) {
            const badge = document.createElement('span');
            badge.className = 'discount-badge';
            badge.textContent = `-${discount}%`;
            card.appendChild(badge);
        }
        const availability = document.createElement('div');
        availability.className = `availability ${p.available !== false ? 'available' : 'unavailable'}`;
        availability.textContent = p.available !== false ? '✅ متوفر' : '❌ غير متوفر';
        card.appendChild(availability);
        const favBtn = document.createElement('div');
        favBtn.className = `fav-btn ${isFav ? 'active' : ''}`;
        favBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
        favBtn.onclick = e => { e.stopPropagation(); window.toggleFavorite(p.id); };
        card.appendChild(favBtn);
        const imgContainer = document.createElement('div');
        imgContainer.className = 'product-img';
        if (isValid) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = escapeHTML(p.name);
            img.loading = 'lazy';
            img.onerror = () => { img.style.display = 'none'; img.nextElementSibling.style.display = 'flex'; };
            imgContainer.appendChild(img);
            const fallback = document.createElement('div');
            fallback.className = 'no-img-fallback';
            fallback.style.display = 'none';
            fallback.innerHTML = '<i class="fa-solid fa-basket-shopping"></i>';
            imgContainer.appendChild(fallback);
        } else {
            const fallback = document.createElement('div');
            fallback.className = 'no-img-fallback';
            fallback.innerHTML = '<i class="fa-solid fa-basket-shopping"></i>';
            imgContainer.appendChild(fallback);
        }
        card.appendChild(imgContainer);
        const info = document.createElement('div');
        info.className = 'product-info';
        const title = document.createElement('div');
        title.className = 'product-title';
        title.textContent = p.name;
        info.appendChild(title);
        const priceDiv = document.createElement('div');
        priceDiv.className = 'product-price';
        const originalPrice = Number(p.price) || 0;
        const finalPrice = discount > 0 ? Math.round(originalPrice - (originalPrice * discount / 100)) : originalPrice;
        if (discount > 0) {
            const old = document.createElement('span');
            old.className = 'old-price';
            old.textContent = `${originalPrice} Lt`;
            priceDiv.appendChild(old);
        }
        priceDiv.appendChild(document.createTextNode(`${finalPrice} Lt`));
        info.appendChild(priceDiv);
        card.appendChild(info);
        const shareBtns = document.createElement('div');
        shareBtns.className = 'share-buttons';
        shareBtns.style.cssText = 'display:flex;gap:8px;margin:5px 0;justify-content:center;';
        const platforms = [
            { name: 'whatsapp', icon: 'fa-brands fa-whatsapp', color: '#25D366' },
            { name: 'facebook', icon: 'fa-brands fa-facebook', color: '#1877F2' },
            { name: 'instagram', icon: 'fa-brands fa-instagram', color: '#E4405F' }
        ];
        platforms.forEach(pl => {
            const btn = document.createElement('button');
            btn.style.cssText = 'background:none;border:none;font-size:18px;cursor:pointer;';
            btn.innerHTML = `<i class="${pl.icon}" style="color:${pl.color};"></i>`;
            btn.onclick = () => window.shareProduct(pl.name, p.name, `${finalPrice} Lt`);
            shareBtns.appendChild(btn);
        });
        card.appendChild(shareBtns);
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-cart';
        addBtn.textContent = '+ أضف للسلة';
        addBtn.onclick = () => window.addToCart(p.id);
        card.appendChild(addBtn);
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
}

// ============================================================
//  التصفية والبحث والترحيل
// ============================================================
let searchTimeout = null;

export function filterBySearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        state.searchQuery = query.trim();
        resetPagination();
        applyFilters();
    }, 300);
}

export function filterByCategory(cat, element) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    state.currentCategory = cat;
    resetPagination();
    applyFilters();
}

function resetPagination() {
    state.lastDoc = null;
    state.hasMore = true;
    state.filteredProducts = [];
    state.displayedCount = 0;
}

export function applyFilters() {
    let filtered = state.products;
    if (state.currentCategory !== 'all') filtered = filtered.filter(p => p.category === state.currentCategory);
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q));
    }
    state.filteredProducts = filtered;
    renderPage(false);
}

function renderPage(append) {
    const start = append ? state.displayedCount : 0;
    const end = start + state.pageSize;
    const pageItems = state.filteredProducts.slice(start, end);
    if (!append) { state.displayedCount = 0; displayProducts(pageItems, false); state.displayedCount = pageItems.length; }
    else { displayProducts(pageItems, true); state.displayedCount += pageItems.length; }
    state.hasMore = state.displayedCount < state.filteredProducts.length;
    updateLoadMoreButton();
}

export function loadMoreProducts() {
    if (state.isLoading || !state.hasMore) return;
    state.isLoading = true;
    const btn = document.getElementById('loadMoreBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري التحميل...'; }
    setTimeout(() => {
        renderPage(true);
        state.isLoading = false;
        if (btn) { btn.disabled = false; }
        updateLoadMoreButton();
    }, 200);
}

function updateLoadMoreButton() {
    const btn = document.getElementById('loadMoreBtn');
    if (!btn) return;
    if (state.hasMore && state.filteredProducts.length > state.displayedCount) {
        btn.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '📦 تحميل المزيد';
    } else btn.style.display = 'none';
}

// ============================================================
//  المفضلة
// ============================================================
export function getFavorites() {
    try { return JSON.parse(localStorage.getItem('alukhowah_favs') || '[]'); } catch { return []; }
}

export function toggleFavorite(id) {
    let favs = getFavorites();
    const strId = String(id);
    const idx = favs.indexOf(strId);
    if (idx > -1) { favs.splice(idx, 1); showToast('💔 أزيل من المفضلة', 'info'); }
    else { favs.push(strId); showToast('❤️ أضيف للمفضلة', 'success'); }
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    state.favorites = favs;
    document.querySelectorAll('.product-card .fav-btn').forEach(btn => {
        const card = btn.closest('.product-card');
        if (card) btn.classList.toggle('active', favs.includes(card.dataset.id));
    });
}

// ============================================================
//  المظهر الداكن
// ============================================================
export function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('alukhowah_dark', isDark ? 'true' : 'false');
    state.isDarkMode = isDark;
    document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon').forEach(icon => {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
}

export function loadDarkModePreference() {
    if (localStorage.getItem('alukhowah_dark') === 'true') {
        document.body.classList.add('dark');
        state.isDarkMode = true;
        document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon').forEach(icon => {
            icon.className = 'fa-solid fa-sun';
        });
    }
}

// ============================================================
//  المشاركة (تم إصلاح رابط واتساب)
// ============================================================
export function shareProduct(platform, productName, productPrice) {
    const msg = `🛍️ ${productName}\n💰 ${productPrice}\n🎁 كود خصم 10%: ${getMyReferralCode()}\n📱 ${window.location.href}`;
    if (platform === 'instagram') {
        navigator.clipboard.writeText(msg)
            .then(() => showToast('✅ تم نسخ الرابط، الصقه في انستا', 'success'))
            .catch(() => showToast('فشل النسخ', 'error'));
    } else if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    } else { // facebook
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(msg)}`, '_blank');
    }
}

// ============================================================
//  رفع الصور (ImgBB)
// ============================================================
function compressImage(file, maxWidth = 300, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file || !(file instanceof File)) return reject(new Error('ملف غير صالح'));
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                let width = img.width, height = img.height;
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('فشل تحميل الصورة'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
    });
}

export async function uploadImageToImgBB(fileOrInput) {
    const file = fileOrInput instanceof File ? fileOrInput : fileOrInput?.files?.[0];
    if (!file) return '';
    try {
        const compressed = await compressImage(file, 300, 0.7);
        if (!compressed) return '';
        const blob = await fetch(compressed).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', blob, 'product.jpg');
        const res = await fetch(`https://api.imgbb.com/1/upload?key=42b6820dc31a25d977adefc41f83aa70`, { method: 'POST', body: formData });
        if (res.ok) {
            const data = await res.json();
            if (data?.data?.url) return data.data.url;
        }
    } catch {}
    return await compressImage(file, 300, 0.7);
}

// ============================================================
//  الاستماع لتغييرات Firebase
// ============================================================
export function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        state.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadCart();
        resetPagination();
        applyFilters();
        updateCartBadge();
        showToast('تم تحديث المنتجات', 'info', 2000);
    }, (error) => {
        console.error("خطأ جلب المنتجات:", error);
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:red;">تعذر تحميل المنتجات. <button onclick="window.initProductsListener()">إعادة المحاولة</button></p>`;
        showToast('فشل الاتصال بالخادم', 'error');
    });
}

// ============================================================
//  مودال المعلومات
// ============================================================
export function toggleInfoModal() {
    document.getElementById('infoModal')?.classList.toggle('open');
}

// ============================================================
//  تهيئة الصفحة
// ============================================================
export function initMainPage() {
    loadDarkModePreference();

    const enterBtn = document.getElementById('enterBtn');
    const welcomeOverlay = document.getElementById('welcomeOverlay');
    const bgMusic = document.getElementById('bgMusic');
    const toggleMusicBtn = document.getElementById('toggleMusicBtn');
    const musicIcon = document.getElementById('musicIcon');

    if (enterBtn && welcomeOverlay) {
        enterBtn.addEventListener('click', () => {
            if (bgMusic) {
                bgMusic.play().then(() => { if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high'; }).catch(() => {});
            }
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

    state.favorites = getFavorites();
    loadCart();
    initProductsListener();
    initCheckoutForm();
    handleReferral();
    showReferralCode();
    updateCartBadge();

    // ربط الدوال العامة
    window.toggleFavorite = toggleFavorite;
    window.addToCart = addToCart;
    window.changeQty = changeQty;
    window.removeFromCart = removeFromCart;
    window.toggleCartModal = toggleCartModal;
    window.filterByCategory = filterByCategory;
    window.filterBySearch = filterBySearch;
    window.uploadImageToImgBB = uploadImageToImgBB;
    window.updateDelivery = updateDelivery;
    window.toggleInfoModal = toggleInfoModal;
    window.shareProduct = shareProduct;
    window.copyReferralCode = copyReferralCode;
    window.shareReferral = shareReferral;
    window.getMyReferralCode = getMyReferralCode;
    window.loadMoreProducts = loadMoreProducts;
    window.initProductsListener = initProductsListener;

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreProducts);

    applyFilters();
}

// ============================================================
//  تصدير العناصر الأساسية
// ============================================================
export {
    db,
    collection,
    addDoc,
    onSnapshot,
    doc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    getDocs,
    writeBatch,
    limit,
    startAfter,
    getCountFromServer,
    where,
    updateDoc,
    arrayUnion,
    arrayRemove
};
