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

// ---------- إعدادات Firebase (استخدم متغيرات بيئة في الإنتاج) ----------
// 🔒 يُنصح بشدة بإخفاء هذه المفاتيح باستخدام Variables Environment أو خدمة وسيطة.
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
//  الحالة العامة للتطبيق (State Management)
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
    user: null,
    lastDoc: null,
    hasMore: true,
    isLoading: false,
    pageSize: 20,
    referralCode: '',
    discountApplied: false,
    invitedBy: null,
    referralPoints: {}
};

// ============================================================
//  أدوات مساعدة (Utilities)
// ============================================================
export function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[tag] || tag);
}

export function validatePhone(phone) {
    return /^[0-9]{7,15}$/.test(phone.trim());
}

export function validateAddress(address) {
    return address.trim().length >= 5;
}

export function showToast(message, type = 'info', duration = 3500) {
    const toast = document.getElementById('customToast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) {
        alert(message);
        return;
    }
    toastMsg.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'flex';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// ============================================================
//  نظام المستخدمين (محاكاة)
// ============================================================
export function getUser() {
    try {
        const data = localStorage.getItem('alukhowah_user');
        return data ? JSON.parse(data) : null;
    } catch { return null; }
}

export function setUser(userData) {
    localStorage.setItem('alukhowah_user', JSON.stringify(userData));
    state.user = userData;
    updateUserUI();
}

export function logoutUser() {
    localStorage.removeItem('alukhowah_user');
    state.user = null;
    updateUserUI();
    showToast('تم تسجيل الخروج', 'info');
}

export function updateUserUI() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    if (state.user) {
        userInfo.innerHTML = `
            <span>👤 ${escapeHTML(state.user.name || 'مستخدم')}</span>
            <button onclick="window.logoutUser()" class="btn-secondary">خروج</button>
        `;
    } else {
        userInfo.innerHTML = `<button onclick="window.showLoginModal()" class="btn-primary">تسجيل الدخول</button>`;
    }
}

export function showLoginModal() {
    const phone = prompt('أدخل رقم الهاتف:');
    if (!phone || !validatePhone(phone)) {
        showToast('رقم هاتف غير صحيح', 'error');
        return;
    }
    const name = prompt('أدخل اسمك:') || 'مستخدم';
    const address = prompt('أدخل عنوانك:') || '';
    setUser({ phone, name, address, orders: [] });
    showToast(`مرحباً ${name}`, 'success');
}

// ============================================================
//  نظام الدعوة والخصم (محسن)
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
        setTimeout(() => {
            showToast('🎉 تم تفعيل كود الخصم 10% على طلبك الأول فوق 100 ليرة', 'success', 5000);
        }, 500);
    }
}

export function getReferralDiscount(total) {
    if (total < 100) return 0;
    if (!localStorage.getItem('invitedBy')) return 0;
    if (localStorage.getItem('discountApplied') === 'true') return 0;
    return Math.min(total * 0.10, 50);
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
        <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على خصم يصل إلى 50 ل.س لأول طلب فوق 100 ل.س</p>
    `;
}

export function copyReferralCode() {
    const code = getMyReferralCode();
    navigator.clipboard.writeText(code)
        .then(() => showToast('✅ تم نسخ الكود: ' + code, 'success'))
        .catch(() => showToast('فشل النسخ، حاول يدوياً', 'error'));
}

export function shareReferral() {
    const code = getMyReferralCode();
    const message = `🎁 استخدم كود الخصم هذا في متجر ماركت الأخوة واحصل على خصم: ${code}\n📱 ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// ============================================================
//  السلة (مع تحديث الأسعار التلقائي)
// ============================================================
function loadCart() {
    try {
        const saved = localStorage.getItem('alukhowah_cart');
        if (saved) {
            state.cart = JSON.parse(saved);
            // تحديث الأسعار من المنتجات الحالية
            state.cart = state.cart.map(item => {
                const product = state.products.find(p => String(p.id) === String(item.id));
                if (product) {
                    const discount = product.discount ? Number(product.discount) : 0;
                    const basePrice = Number(product.price) || 0;
                    const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
                    return { ...item, price: finalPrice, discount };
                }
                return item;
            });
            saveCart();
        }
    } catch (e) { state.cart = []; }
}

function saveCart() {
    try {
        localStorage.setItem('alukhowah_cart', JSON.stringify(state.cart));
    } catch (e) { /* تجاهل */ }
}

export function addToCart(id) {
    const product = state.products.find(p => String(p.id) === String(id));
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }

    if (product.category === 'شحن ألعاب') {
        redirectToWhatsApp(product);
        return;
    }

    const idx = state.cart.findIndex(item => String(item.id) === String(id));
    if (idx > -1) {
        state.cart[idx].qty += 1;
    } else {
        const discount = product.discount ? Number(product.discount) : 0;
        const basePrice = Number(product.price) || 0;
        const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
        state.cart.push({ ...product, price: finalPrice, discount, qty: 1 });
    }
    saveCart();
    updateCartBadge();
    showToast('✅ تم إضافة المنتج للسلة', 'success');
}

function redirectToWhatsApp(product) {
    const numbers = ['905511455598', '905385844122', '905511591245'];
    const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const discount = product.discount ? Number(product.discount) : 0;
    const basePrice = Number(product.price) || 0;
    const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
    const message = `مرحباً، أريد شراء: ${product.name}\nالسعر: ${finalPrice} ل.س\nالرجاء إرسال تفاصيل الدفع`;
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
    showToast('✅ تم تحويلك إلى واتساب لإتمام عملية شحن اللعبة', 'info');
}

export function changeQty(id, delta) {
    const idx = state.cart.findIndex(item => String(item.id) === String(id));
    if (idx > -1) {
        state.cart[idx].qty += delta;
        if (state.cart[idx].qty <= 0) {
            state.cart.splice(idx, 1);
        }
        saveCart();
        updateCartBadge();
        renderCartItems();
    }
}

export function removeFromCart(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج من السلة؟')) return;
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
//  حساب الإجمالي (مع خصومات متعددة وآمنة)
// ============================================================
function calculateFinalTotal() {
    const itemsTotal = state.cart.reduce((sum, item) => {
        const qty = Math.max(0, item.qty);
        return sum + (item.price * qty);
    }, 0);

    let smartDiscountPercent = 0;
    if (itemsTotal >= 1000) smartDiscountPercent = 10;
    else if (itemsTotal >= 500) smartDiscountPercent = 5;

    const smartDiscountAmount = itemsTotal * (smartDiscountPercent / 100);
    let discountedItemsTotal = Math.max(0, itemsTotal - smartDiscountAmount);

    const referralDiscount = getReferralDiscount(discountedItemsTotal);
    discountedItemsTotal = Math.max(0, discountedItemsTotal - referralDiscount);

    let deliveryCost = 0;
    if (state.deliveryType === 'inside') {
        deliveryCost = 100;
    } else {
        const km = Math.max(1, Number(state.deliveryKm) || 1);
        deliveryCost = km * 35;
    }

    const finalTotal = discountedItemsTotal + deliveryCost;

    return {
        itemsTotal,
        smartDiscountPercent,
        smartDiscountAmount,
        referralDiscount,
        discountedItemsTotal,
        deliveryCost,
        finalTotal
    };
}

// ============================================================
//  عرض السلة
// ============================================================
export function toggleCartModal() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    modal.classList.toggle('open');
    if (modal.classList.contains('open')) {
        updateDelivery();
        renderCartItems();
    }
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

    container.innerHTML = state.cart.map(item => {
        const itemTotal = item.price * item.qty;
        return `
            <div class="cart-item" data-id="${item.id}">
                <div>
                    <strong>${escapeHTML(item.name)}</strong>
                    <div style="font-size:12px;color:#666;">${item.price} Lt × ${item.qty}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button>
                    <span style="font-weight:bold;">${item.qty}</span>
                    <button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button>
                    <span style="font-weight:bold;color:var(--primary);">${itemTotal} Lt</span>
                    <i class="fa-solid fa-trash" style="color:red;cursor:pointer;" onclick="window.removeFromCart('${item.id}')"></i>
                </div>
            </div>
        `;
    }).join('');

    if (summaryDiv) {
        summaryDiv.style.display = 'block';
        const calc = calculateFinalTotal();
        summaryDiv.innerHTML = `
            <div class="summary-line"><span>مجموع المنتجات:</span><span>${calc.itemsTotal} Lt</span></div>
            ${calc.smartDiscountPercent > 0 ? `<div class="summary-line discount-text"><span>🎉 خصم ذكي (${calc.smartDiscountPercent}%):</span><span>-${Math.round(calc.smartDiscountAmount)} Lt</span></div>` : ''}
            ${calc.referralDiscount > 0 ? `<div class="summary-line discount-text"><span>🎁 خصم الدعوة:</span><span>-${Math.round(calc.referralDiscount)} Lt</span></div>` : ''}
            <div class="summary-line"><span>🚚 التوصيل (${state.deliveryType === 'inside' ? 'داخل عمرانيا' : 'خارج ' + state.deliveryKm + ' كم'}):</span><span>${calc.deliveryCost} Lt</span></div>
            <div class="summary-line total"><span>💰 الإجمالي النهائي:</span><span>${Math.round(calc.finalTotal)} Lt</span></div>
        `;
        const finalTotalInput = document.getElementById('finalTotal');
        if (finalTotalInput) finalTotalInput.value = Math.round(calc.finalTotal);
    }
}

export function updateDelivery() {
    const typeEl = document.getElementById('deliveryType');
    const kmContainer = document.getElementById('kmInputContainer');
    if (typeEl) {
        state.deliveryType = typeEl.value;
        if (kmContainer) kmContainer.style.display = state.deliveryType === 'outside' ? 'block' : 'none';
    }
    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) state.deliveryKm = Number(kmEl.value) || 1;
    renderCartItems();
}

// ============================================================
//  إرسال الطلب (مع التحقق وتخزين الطلبات)
// ============================================================
export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (state.isSubmitting) return;
        if (state.cart.length === 0) {
            showToast('السلة فارغة!', 'error');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;

        const phone = document.getElementById('userPhone')?.value.trim() || '';
        const address = document.getElementById('userAddress')?.value.trim() || '';

        if (!validatePhone(phone)) {
            showToast('رقم الهاتف غير صحيح (7-15 رقم)', 'error');
            return;
        }
        if (!validateAddress(address)) {
            showToast('العنوان قصير جداً (أقل من 5 أحرف)', 'error');
            return;
        }

        state.isSubmitting = true;
        submitBtn.innerText = 'جاري إرسال الطلب...';
        submitBtn.disabled = true;

        const itemsSummary = state.cart.map(i => `${i.name} (${i.qty})`).join(' - ');
        const calc = calculateFinalTotal();

        try {
            const orderData = {
                phone: String(phone),
                address: String(address),
                items: String(itemsSummary),
                total: Math.round(calc.finalTotal),
                itemsTotal: calc.itemsTotal,
                smartDiscount: Math.round(calc.smartDiscountAmount),
                referralDiscount: Math.round(calc.referralDiscount),
                deliveryCost: calc.deliveryCost,
                deliveryType: state.deliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${state.deliveryKm} كم)`,
                date: new Date().toLocaleString('ar-EG'),
                createdAt: serverTimestamp(),
                userId: state.user?.phone || 'guest'
            };

            const docRef = await addDoc(collection(db, "orders"), orderData);

            if (state.user) {
                state.user.orders = state.user.orders || [];
                state.user.orders.push({ id: docRef.id, ...orderData });
                setUser(state.user);
            }

            showToast(`✅ تم إرسال طلبك بنجاح!\nالإجمالي: ${Math.round(calc.finalTotal)} Lt`, 'success', 5000);
            state.cart = [];
            saveCart();
            updateCartBadge();
            renderCartItems();
            toggleCartModal();
            form.reset();
        } catch (error) {
            showToast('❌ حدث خطأ أثناء إرسال الطلب: ' + error.message, 'error');
        } finally {
            state.isSubmitting = false;
            submitBtn.innerText = '🚀 تأكيد الطلب';
            submitBtn.disabled = false;
        }
    });
}

// ============================================================
//  عرض المنتجات (مع Lazy Loading والترحيل الحقيقي)
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

        const favBtn = document.createElement('div');
        favBtn.className = `fav-btn ${isFav ? 'active' : ''}`;
        favBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
        favBtn.onclick = (e) => {
            e.stopPropagation();
            window.toggleFavorite(p.id);
        };
        card.appendChild(favBtn);

        const imgContainer = document.createElement('div');
        imgContainer.className = 'product-img';
        if (isValid) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = escapeHTML(p.name);
            img.loading = 'lazy';
            img.onerror = () => {
                img.style.display = 'none';
                img.nextElementSibling.style.display = 'flex';
            };
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
//  التصفية والبحث والترحيل الحقيقي
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
    window._displayedCount = 0;
}

export function applyFilters() {
    let filtered = state.products;
    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === state.currentCategory);
    }
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q));
    }
    state.filteredProducts = filtered;
    renderPage(false);
}

function renderPage(append = false) {
    const start = append ? window._displayedCount : 0;
    const end = start + state.pageSize;
    const pageItems = state.filteredProducts.slice(start, end);

    if (!append) {
        window._displayedCount = 0;
        displayProducts(pageItems, false);
        window._displayedCount = pageItems.length;
    } else {
        displayProducts(pageItems, true);
        window._displayedCount += pageItems.length;
    }

    state.hasMore = window._displayedCount < state.filteredProducts.length;
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
    if (state.hasMore && state.filteredProducts.length > window._displayedCount) {
        btn.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '📦 تحميل المزيد';
    } else {
        btn.style.display = 'none';
    }
}

// ============================================================
//  المفضلة (مع تحديث فوري)
// ============================================================
export function getFavorites() {
    try {
        const data = localStorage.getItem('alukhowah_favs');
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

export function toggleFavorite(id) {
    let favs = getFavorites();
    const strId = String(id);
    const idx = favs.indexOf(strId);
    if (idx > -1) {
        favs.splice(idx, 1);
        showToast('💔 أزيل من المفضلة', 'info');
    } else {
        favs.push(strId);
        showToast('❤️ أضيف للمفضلة', 'success');
    }
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    state.favorites = favs;
    updateFavButtons();
}

function updateFavButtons() {
    const favs = state.favorites;
    document.querySelectorAll('.product-card .fav-btn').forEach(btn => {
        const card = btn.closest('.product-card');
        if (!card) return;
        const id = card.dataset.id;
        if (favs.includes(id)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
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
//  المشاركة
// ============================================================
export function shareProduct(platform, productName, productPrice) {
    const code = getMyReferralCode();
    const message = `🛍️ ${productName}\n💰 ${productPrice}\n🎁 كود خصم: ${code}\n📱 ${window.location.href}`;
    const encoded = encodeURIComponent(message);
    const links = {
        whatsapp: `https://wa.me/?text=${encoded}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encoded}`,
        instagram: `https://www.instagram.com/`
    };
    if (platform === 'instagram') {
        navigator.clipboard.writeText(message)
            .then(() => showToast('✅ تم نسخ الرابط، الصقه في انستا', 'success'))
            .catch(() => showToast('فشل النسخ', 'error'));
    } else {
        window.open(links[platform], '_blank');
    }
}

// ============================================================
//  رفع الصور (مع ضغط وتحسين)
// ============================================================
function compressImage(file, maxWidth = 300, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file || !(file instanceof File)) {
            reject(new Error('ملف غير صالح'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
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
    let file = null;
    if (fileOrInput instanceof File) file = fileOrInput;
    else if (fileOrInput?.files?.[0]) file = fileOrInput.files[0];
    else return '';

    try {
        const compressedBase64 = await compressImage(file, 300, 0.7);
        if (!compressedBase64) return '';

        const blob = await fetch(compressedBase64).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', blob, 'product.jpg');

        // 🔒 استخدم مفتاح ImgBB مخفي في متغير بيئي، هذا المفتاح للعرض فقط
        const myKey = "42b6820dc31a25d977adefc41f83aa70";
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${myKey}`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            if (data?.data?.url) return data.data.url;
        }
    } catch (e) {
        console.warn("ImgBB فشل، نستخدم Base64", e);
    }
    return await compressImage(file, 300, 0.7);
}

// ============================================================
//  الاستماع لتغييرات Firebase (مع تحديث ذكي)
// ============================================================
export function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        state.products = newProducts;
        loadCart(); // يعيد حساب الأسعار
        resetPagination();
        applyFilters();
        updateCartBadge();
        showToast('تم تحديث المنتجات', 'info', 2000);
    }, (error) => {
        console.error("خطأ جلب المنتجات:", error);
        grid.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;color:red;">
                تعذر تحميل المنتجات. <button onclick="window.initProductsListener()">إعادة المحاولة</button>
            </p>
        `;
        showToast('فشل الاتصال بالخادم', 'error');
    });
}

// ============================================================
//  مودال المعلومات
// ============================================================
export function toggleInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.classList.toggle('open');
}

// ============================================================
//  تهيئة الصفحة الرئيسية
// ============================================================
export function initMainPage() {
    loadDarkModePreference();

    // الترحيب والموسيقى
    const enterBtn = document.getElementById('enterBtn');
    const welcomeOverlay = document.getElementById('welcomeOverlay');
    const bgMusic = document.getElementById('bgMusic');
    const toggleMusicBtn = document.getElementById('toggleMusicBtn');
    const musicIcon = document.getElementById('musicIcon');

    if (enterBtn && welcomeOverlay) {
        enterBtn.addEventListener('click', () => {
            if (bgMusic) {
                bgMusic.play()
                    .then(() => { if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high'; })
                    .catch(() => {});
            }
            welcomeOverlay.style.display = 'none';
        });
    }

    if (toggleMusicBtn && bgMusic && musicIcon) {
        toggleMusicBtn.addEventListener('click', () => {
            if (bgMusic.paused) {
                bgMusic.play();
                musicIcon.className = 'fa-solid fa-volume-high';
            } else {
                bgMusic.pause();
                musicIcon.className = 'fa-solid fa-volume-xmark';
            }
        });
    }

    document.querySelectorAll('.dark-toggle').forEach(btn => {
        btn.addEventListener('click', toggleDarkMode);
    });

    state.user = getUser();
    state.favorites = getFavorites();
    loadCart();

    initProductsListener();
    initCheckoutForm();
    handleReferral();
    showReferralCode();
    updateUserUI();
    updateCartBadge();

    // ربط الدوال بالنافذة
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
    window.logoutUser = logoutUser;
    window.showLoginModal = showLoginModal;
    window.initProductsListener = initProductsListener;

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreProducts);
    }

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
