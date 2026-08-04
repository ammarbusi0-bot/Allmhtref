import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    getDocs,
    startAfter,
    writeBatch
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

// ==================== الأدوات المساعدة ====================
export function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, tag =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// إشعارات Toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white; padding: 12px 24px; border-radius: 30px; z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2); animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== إدارة الصور ====================
const IMGBB_API_KEY = "42b6820dc31a25d977adefc41f83aa70";
const MAX_UPLOAD_SIZE_MB = 15;
const IMAGE_MAX_WIDTH = 600;
const JPEG_QUALITY = 0.7;

export async function uploadImageToImgBB(fileOrInput) {
    let file = fileOrInput instanceof File ? fileOrInput : fileOrInput?.files?.[0];
    if (!file) return '';

    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        showToast(`⚠️ حجم الصورة كبير جداً. الحد الأقصى ${MAX_UPLOAD_SIZE_MB} ميغابايت.`, 'error');
        return '';
    }

    try {
        const compressedBlob = await compressImageFile(file);
        const formData = new FormData();
        formData.append('image', compressedBlob, 'product.jpg');

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            return data?.data?.url || '';
        }
    } catch (e) {
        console.error("خطأ رفع الصورة:", e);
    }
    showToast("⚠️ تعذر رفع الصورة. تحقق من الاتصال وحاول مجدداً.", 'error');
    return '';
}

function compressImageFile(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > IMAGE_MAX_WIDTH) {
                    height = Math.round((height * IMAGE_MAX_WIDTH) / width);
                    width = IMAGE_MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', JPEG_QUALITY);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

export async function compressOldBase64Images() {
    console.log("⏳ بدء ضغط الصور القديمة...");
    let lastDoc = null;
    let hasMore = true;
    let totalUpdated = 0;
    const BATCH_SIZE = 10;

    try {
        while (hasMore) {
            const constraints = [collection(db, "products"), limit(BATCH_SIZE)];
            if (lastDoc) constraints.push(startAfter(lastDoc));

            const snapshot = await getDocs(query(...constraints));
            if (snapshot.empty) break;

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const url = String(data.imageUrl || '').trim();
                if (url.startsWith('data:image')) {
                    const compressed = await compressBase64ToJPEG(url, 400, 0.5);
                    await updateDoc(doc(db, "products", docSnap.id), { imageUrl: compressed });
                    totalUpdated++;
                }
                await new Promise(r => setTimeout(r, 50));
            }

            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.docs.length < BATCH_SIZE) hasMore = false;
        }
        showToast(`✅ تم ضغط ${totalUpdated} صورة قديمة بنجاح.`, 'success');
    } catch (e) {
        console.error("فشل ضغط الصور القديمة:", e);
    }
}

function compressBase64ToJPEG(base64, maxWidth, quality) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

// ==================== إدارة المظهر الداكن ====================
export function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('alukhowah_dark', isDark ? 'true' : 'false');
    updateDarkModeIcons(isDark);
}

function updateDarkModeIcons(isDark) {
    document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon, .dark-mode-icon').forEach(icon => {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
}

export function loadDarkModePreference() {
    const isDark = localStorage.getItem('alukhowah_dark') === 'true';
    if (isDark) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    updateDarkModeIcons(isDark);
}

// ==================== حالة التطبيق ====================
let globalProducts = [];
let cart = loadCartFromStorage();
let isSubmitting = false;
let currentCategory = 'all';
let currentSearch = '';
let currentDeliveryType = 'inside';
let currentDeliveryKm = 1;

// التحميل التدريجي
let lastVisibleProduct = null;
let isLoadingMore = false;
let hasMoreProducts = true;
const PAGE_SIZE = 24;
let unsubscribeProducts = null;

// تخزين مؤقت للفئات
const categoryCache = {};

// ==================== نظام الدعوة والخصم ====================
export function getMyReferralCode() {
    let code = localStorage.getItem('myReferralCode');
    if (!code) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        localStorage.setItem('myReferralCode', code);
    }
    return code;
}

export function getInviteLink() {
    return `${window.location.origin}${window.location.pathname}?ref=${getMyReferralCode()}`;
}

export function shareProduct(platform, productName, productPrice) {
    const code = getMyReferralCode();
    const message = `🛍️ ${productName}\n💰 ${productPrice} TL\n🎁 كود خصم 10%: ${code}\n📱 ${window.location.href}`;
    const encoded = encodeURIComponent(message);

    if (platform === 'instagram') {
        navigator.clipboard.writeText(message).then(() => showToast('✅ تم نسخ الرابط للصقه في انستا', 'success'));
    } else if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encoded}`, '_blank');
    }
}

export function handleReferral() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const myCode = getMyReferralCode();

    if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
        localStorage.setItem('invitedBy', ref);
        localStorage.setItem('referralUsed', 'true');

        let points = JSON.parse(localStorage.getItem('referralPoints') || '{}');
        points[ref] = (points[ref] || 0) + 1;
        localStorage.setItem('referralPoints', JSON.stringify(points));

        setTimeout(() => showToast('🎉 مرحباً! تم تفعيل خصم 10% على طلبك الأول فوق 100 TL', 'success'), 500);
    }
}

export function getReferralDiscount(total) {
    if (total < 100) return 0;
    if (!localStorage.getItem('invitedBy')) return 0;
    if (localStorage.getItem('discountApplied')) return 0;
    return total * 0.10;
}

export function applyReferralDiscount(total) {
    const discount = getReferralDiscount(total);
    if (discount > 0) localStorage.setItem('discountApplied', 'true');
    return discount;
}

export function showReferralCode() {
    const code = getMyReferralCode();
    const container = document.getElementById('referralContainer');
    if (container) {
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <span style="font-weight:bold;">🎁 كود الخصم: </span>
                    <strong style="font-size:20px;color:#ff6b6b;letter-spacing:2px;background:var(--input-bg);padding:4px 12px;border-radius:6px;">${code}</strong>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.copyReferralCode()" style="background:#4CAF50;color:white;border:none;padding:5px 15px;border-radius:5px;cursor:pointer;">
                        <i class="fa-regular fa-copy"></i> نسخ
                    </button>
                    <button onclick="window.shareReferral()" style="background:#25D366;color:white;border:none;padding:5px 15px;border-radius:5px;cursor:pointer;">
                        <i class="fa-brands fa-whatsapp"></i> مشاركة
                    </button>
                </div>
            </div>
            <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على 10% خصم لأول طلب فوق 100 TL</p>
        `;
    }
}

export function copyReferralCode() {
    navigator.clipboard.writeText(getMyReferralCode()).then(() => showToast('✅ تم نسخ الكود: ' + getMyReferralCode(), 'success'));
}

export function shareReferral() {
    const message = `🎁 استخدم كود الخصم هذا في متجر ماركت الأخوة واحصل على 10% خصم: ${getMyReferralCode()}\n📱 ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

export function initReferralSystem() {
    handleReferral();
    showReferralCode();
}

// ==================== عرض المنتجات مع التحسينات ====================
export function displayProducts(items) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (!items.length) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:20px;">
            لا توجد منتجات متوفرة.
            <br><button onclick="window.loadProductsByCategory(window.getCurrentCategory())" style="margin-top:10px; padding:8px 20px; background:var(--primary); color:white; border:none; border-radius:20px; cursor:pointer;">🔄 تحميل المنتجات</button>
        </p>`;
        updateLoadMoreButtonVisibility(false);
        return;
    }

    const favs = getFavorites();
    grid.innerHTML = items.map(p => {
        const isFav = favs.includes(p.id);
        const imgUrl = String(p.imageUrl || '').trim();
        const isValidImg = imgUrl && imgUrl !== 'null' && imgUrl !== 'undefined';
        const imageHTML = isValidImg
            ? `<img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="no-img-fallback" style="display:none;"><i class="fa-solid fa-basket-shopping"></i></div>`
            : `<div class="no-img-fallback"><i class="fa-solid fa-basket-shopping"></i></div>`;

        const discount = Number(p.discount) || 0;
        const originalPrice = Number(p.price) || 0;
        const finalPrice = discount > 0 ? Math.round(originalPrice - (originalPrice * discount / 100)) : originalPrice;
        const availability = p.availability || 'متوفر';
        const badges = {
            'غير متوفر': ['❌ غير متوفر', '#e74c3c'],
            'محدود': ['⚠️ محدود', '#f39c12']
        };
        const badge = badges[availability] || ['✅ متوفر', '#2ecc71'];
        const disableAdd = availability === 'غير متوفر';

        let availabilityDateText = '';
        if (p.availabilityDate) {
            try {
                const dateObj = typeof p.availabilityDate?.toDate === 'function' ? p.availabilityDate.toDate() : new Date(p.availabilityDate);
                if (!isNaN(dateObj.getTime())) {
                    availabilityDateText = `<div style="font-size:11px;color:#888;margin:2px 0;">📅 متاح من: ${dateObj.toLocaleDateString('ar-EG')}</div>`;
                }
            } catch (e) { }
        }

        const rating = p.rating || 0;
        const starsHTML = Array.from({ length: 5 }, (_, i) => 
            `<i class="fa-star ${i < rating ? 'fa-solid' : 'fa-regular'}" style="color:#f1c40f;"></i>`
        ).join('');

        const shareBtns = `
            <div class="share-buttons" style="display:flex;gap:8px;margin:5px 0;justify-content:center;">
                <button onclick="window.shareProduct('whatsapp', '${escapeHTML(p.name)}', '${finalPrice} TL')" style="background:none;border:none;font-size:18px;cursor:pointer;">
                    <i class="fa-brands fa-whatsapp" style="color:#25D366;"></i>
                </button>
                <button onclick="window.shareProduct('facebook', '${escapeHTML(p.name)}', '${finalPrice} TL')" style="background:none;border:none;font-size:18px;cursor:pointer;">
                    <i class="fa-brands fa-facebook" style="color:#1877F2;"></i>
                </button>
                <button onclick="window.shareProduct('instagram', '${escapeHTML(p.name)}', '${finalPrice} TL')" style="background:none;border:none;font-size:18px;cursor:pointer;">
                    <i class="fa-brands fa-instagram" style="color:#E4405F;"></i>
                </button>
            </div>
        `;

        return `
            <div class="product-card" id="product-card-${p.id}">
                ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                <div class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${p.id}', this)">
                    <i class="fa-solid fa-heart"></i>
                </div>
                <div class="product-img">${imageHTML}</div>
                <div class="product-info">
                    <div class="product-title">${escapeHTML(p.name)}</div>
                    <div class="product-price">
                        ${discount > 0 ? `<span class="old-price">${originalPrice} TL</span>` : ''}
                        ${finalPrice} TL
                    </div>
                    <div style="margin:3px 0;">${starsHTML}</div>
                    <span style="background:${badge[1]}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; display:inline-block; margin-top:4px;">${badge[0]}</span>
                    ${availabilityDateText}
                </div>
                ${shareBtns}
                <button class="btn-add-cart" ${disableAdd ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : `onclick="window.addToCart('${p.id}')"`}>
                    ${disableAdd ? 'غير متوفر' : '+ أضف للسلة'}
                </button>
                ${!disableAdd ? `<button class="btn-quick-buy" onclick="window.quickBuy('${p.id}')" style="margin-top:5px; width:100%; padding:5px; background:#27ae60; color:white; border:none; border-radius:5px; cursor:pointer;">⚡ شراء سريع</button>` : ''}
            </div>
        `;
    }).join('');

    updateLoadMoreButtonVisibility(hasMoreProducts && currentCategory === 'all' && !currentSearch.trim());
}

function updateLoadMoreButtonVisibility(visible) {
    let btn = document.getElementById('loadMoreBtn');
    if (!btn && visible) {
        const grid = document.getElementById('productsGrid');
        if (grid && grid.parentElement) {
            btn = document.createElement('button');
            btn.id = 'loadMoreBtn';
            btn.className = 'btn-load-more';
            btn.style.cssText = 'display:block; margin:20px auto; padding:10px 25px; background:var(--primary, #007bff); color:#fff; border:none; border-radius:20px; font-weight:bold; cursor:pointer;';
            btn.textContent = 'عرض المزيد من المنتجات';
            btn.onclick = () => loadMoreProducts();
            grid.parentElement.appendChild(btn);
        }
    }
    if (btn) btn.style.display = visible ? 'block' : 'none';
}

// ==================== الفلاتر والبحث مع دعم تحميل الفئة ====================
export function applyFilters() {
    let filtered = globalProducts;
    if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
    if (currentSearch.trim()) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(searchLower));
    }
    displayProducts(filtered);
}

export async function filterByCategory(cat, element) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    currentCategory = cat;

    if (cat !== 'all' && !categoryCache[cat] && globalProducts.filter(p => p.category === cat).length === 0) {
        await loadProductsByCategory(cat);
    }
    applyFilters();
}

// إتاحة currentCategory عالمياً
window.getCurrentCategory = () => currentCategory;

async function loadProductsByCategory(category) {
    showToast(`جاري تحميل منتجات ${category}...`, 'info');
    try {
        const q = query(collection(db, "products"), where("category", "==", category), orderBy("createdAt", "desc"), limit(50));
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const existingIds = new Set(globalProducts.map(p => p.id));
        products.forEach(p => {
            if (!existingIds.has(p.id)) {
                globalProducts.push(p);
                existingIds.add(p.id);
            }
        });
        categoryCache[category] = true;
        showToast(`✅ تم تحميل ${products.length} منتج`, 'success');
    } catch (error) {
        console.error("خطأ في تحميل الفئة:", error);
        showToast("فشل تحميل المنتجات", 'error');
    }
}

let searchTimeout;
export function filterBySearch(queryStr) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearch = queryStr;
        applyFilters();
    }, 250);
}

// ==================== المفضلة ====================
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('alukhowah_favs') || '[]'); } catch { return []; }
}

export function toggleFavorite(productId, btnElement) {
    let favs = getFavorites();
    const isFav = favs.includes(productId);
    if (isFav) favs = favs.filter(id => id !== productId);
    else favs.push(productId);
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));

    if (btnElement) btnElement.classList.toggle('active', !isFav);
}

// ==================== إدارة السلة ====================
function loadCartFromStorage() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

export function updateCartBadge() {
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = total;
}

export function addToCart(productId) {
    const product = globalProducts.find(p => p.id === productId);
    if (!product || product.availability === 'غير متوفر') {
        showToast('❌ هذا المنتج غير متوفر حالياً.', 'error');
        return;
    }
    if (product.category === 'شحن ألعاب') {
        redirectToWhatsApp(product);
        return;
    }

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        const discount = Number(product.discount) || 0;
        const basePrice = Number(product.price) || 0;
        const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
        cart.push({ id: product.id, name: product.name, price: finalPrice, discount, qty: 1, imageUrl: product.imageUrl });
    }
    saveCartToStorage();
    updateCartBadge();
    showToast(`✅ تمت إضافة ${product.name} إلى السلة`, 'success');
}

export function quickBuy(productId) {
    addToCart(productId);
    toggleCartModal();
    document.getElementById('checkoutForm')?.scrollIntoView({ behavior: 'smooth' });
}

function redirectToWhatsApp(product) {
    const numbers = ['905511455598', '905385844122', '905511591245'];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    const finalPrice = calculateProductFinalPrice(product);
    const message = `مرحباً، أريد شراء: ${product.name}\nالسعر: ${finalPrice} TL\nالرجاء إرسال تفاصيل الدفع`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
    showToast('✅ تم تحويلك إلى واتساب لإتمام عملية الشحن', 'success');
}

function calculateProductFinalPrice(product) {
    const discount = Number(product.discount) || 0;
    const base = Number(product.price) || 0;
    return discount > 0 ? Math.round(base - (base * discount / 100)) : base;
}

export function changeQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== productId);
    saveCartToStorage();
    updateCartBadge();
    renderCartItems();
}

export function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCartToStorage();
    updateCartBadge();
    renderCartItems();
}

// ==================== الحسابات والتوصيل ====================
export function updateDelivery() {
    const typeEl = document.getElementById('deliveryType');
    const kmContainer = document.getElementById('kmInputContainer');
    if (typeEl) currentDeliveryType = typeEl.value;
    if (kmContainer) kmContainer.style.display = currentDeliveryType === 'outside' ? 'block' : 'none';
    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) currentDeliveryKm = Number(kmEl.value) || 1;
    renderCartItems();
}

function calculateFinalTotal() {
    const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    let smartDiscountPercent = 0;
    if (itemsTotal >= 1000) smartDiscountPercent = 10;
    else if (itemsTotal >= 500) smartDiscountPercent = 5;
    const smartDiscountAmount = itemsTotal * (smartDiscountPercent / 100);
    let discountedTotal = itemsTotal - smartDiscountAmount;

    const referralDiscount = getReferralDiscount(discountedTotal);
    discountedTotal -= referralDiscount;

    const deliveryCost = currentDeliveryType === 'inside' ? 100 : (currentDeliveryKm || 1) * 35;
    return { itemsTotal, smartDiscountPercent, smartDiscountAmount, referralDiscount, discountedItemsTotal: discountedTotal, deliveryCost, finalTotal: discountedTotal + deliveryCost };
}

// ==================== عرض السلة والمودال ====================
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

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">السلة فارغة حالياً.</p>';
        if (summaryDiv) summaryDiv.style.display = 'none';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${escapeHTML(item.name)}</strong>
                <div style="font-size:12px; color:#666;">${item.price} TL × ${item.qty}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button>
                <span style="font-weight:bold;">${item.qty}</span>
                <button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button>
                <span style="font-weight:bold; color:var(--primary);">${item.price * item.qty} TL</span>
                <i class="fa-solid fa-trash" style="color:red; cursor:pointer;" onclick="window.removeFromCart('${item.id}')"></i>
            </div>
        </div>
    `).join('');

    if (summaryDiv) {
        summaryDiv.style.display = 'block';
        const calc = calculateFinalTotal();
        summaryDiv.innerHTML = `
            <div class="summary-line"><span>مجموع المنتجات:</span><span>${calc.itemsTotal} TL</span></div>
            ${calc.smartDiscountPercent > 0 ? `<div class="summary-line discount-text"><span>🎉 خصم ذكي (${calc.smartDiscountPercent}%):</span><span>-${Math.round(calc.smartDiscountAmount)} TL</span></div>` : ''}
            ${calc.referralDiscount > 0 ? `<div class="summary-line discount-text"><span>🎁 خصم الدعوة (10%):</span><span>-${Math.round(calc.referralDiscount)} TL</span></div>` : ''}
            <div class="summary-line"><span>🚚 التوصيل (${currentDeliveryType === 'inside' ? 'داخل عمرانيا' : 'خارج ' + currentDeliveryKm + ' كم'}):</span><span>${calc.deliveryCost} TL</span></div>
            <div class="summary-line total"><span>💰 الإجمالي النهائي:</span><span>${Math.round(calc.finalTotal)} TL</span></div>
        `;
        const finalTotalInput = document.getElementById('finalTotal');
        if (finalTotalInput) finalTotalInput.value = Math.round(calc.finalTotal);
    }
}

// ==================== نموذج الطلب ====================
export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmitting || cart.length === 0) return;
        const btn = document.getElementById('submitBtn');
        isSubmitting = true;
        btn.textContent = 'جاري الإرسال...';
        btn.disabled = true;

        const phone = document.getElementById('userPhone')?.value.trim() || '';
        const address = document.getElementById('userAddress')?.value.trim() || '';
        const itemsSummary = cart.map(i => `${i.name} (${i.qty})`).join(' - ');
        const calc = calculateFinalTotal();

        try {
            await addDoc(collection(db, "orders"), {
                phone, address, items: itemsSummary,
                total: Math.round(calc.finalTotal),
                itemsTotal: calc.itemsTotal,
                smartDiscount: Math.round(calc.smartDiscountAmount),
                referralDiscount: Math.round(calc.referralDiscount),
                deliveryCost: calc.deliveryCost,
                deliveryType: currentDeliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${currentDeliveryKm} كم)`,
                date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                createdAt: serverTimestamp()
            });
            showToast(`✅ تم إرسال طلبك بنجاح! الإجمالي: ${Math.round(calc.finalTotal)} TL`, 'success');
            cart = [];
            saveCartToStorage();
            updateCartBadge();
            renderCartItems();
            toggleCartModal();
            form.reset();
        } catch (err) {
            showToast('❌ حدث خطأ: ' + err.message, 'error');
        } finally {
            isSubmitting = false;
            btn.textContent = '🚀 تأكيد الطلب';
            btn.disabled = false;
        }
    });
}

// ==================== مودال المعلومات ====================
export function toggleInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.classList.toggle('open');
}

// ==================== تحميل المنتجات ====================
export async function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (unsubscribeProducts) {
        unsubscribeProducts();
        unsubscribeProducts = null;
    }

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        const snapshot = await getDocs(q);
        globalProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (snapshot.docs.length > 0) lastVisibleProduct = snapshot.docs[snapshot.docs.length - 1];
        hasMoreProducts = snapshot.docs.length === PAGE_SIZE;
        applyFilters();
    } catch (error) {
        console.error("خطأ تحميل المنتجات:", error);
        grid.innerHTML = '<p style="color:red; text-align:center;">تعذر تحميل المنتجات. <button onclick="window.initProductsListener()">إعادة المحاولة</button></p>';
    }
}

export async function loadMoreProducts() {
    if (isLoadingMore || !hasMoreProducts || !lastVisibleProduct) return;
    isLoadingMore = true;
    const btn = document.getElementById('loadMoreBtn');
    if (btn) btn.textContent = 'جاري التحميل...';

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), startAfter(lastVisibleProduct), limit(PAGE_SIZE));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            hasMoreProducts = false;
        } else {
            const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            globalProducts = [...globalProducts, ...newProducts];
            lastVisibleProduct = snapshot.docs[snapshot.docs.length - 1];
            hasMoreProducts = snapshot.docs.length === PAGE_SIZE;
            applyFilters();
        }
    } catch (e) {
        console.error("خطأ في جلب المزيد:", e);
        showToast("فشل تحميل المزيد", 'error');
    } finally {
        isLoadingMore = false;
        if (btn) btn.textContent = 'عرض المزيد من المنتجات';
        updateLoadMoreButtonVisibility(hasMoreProducts);
    }
}

// ==================== دوال الإدارة ====================
export async function deleteProduct(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        try {
            await deleteDoc(doc(db, "products", productId));
            globalProducts = globalProducts.filter(p => p.id !== productId);
            applyFilters();
            showToast('تم الحذف بنجاح', 'success');
        } catch (e) {
            showToast('فشل الحذف: ' + e.message, 'error');
        }
    }
}

export async function updateProduct(productId, newData) {
    try {
        await updateDoc(doc(db, "products", productId), newData);
        showToast('تم التحديث بنجاح', 'success');
    } catch (e) {
        showToast('فشل التحديث: ' + e.message, 'error');
    }
}

// ==================== البحث الصوتي (مُصحح) ====================
export function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast('المتصفح لا يدعم البحث الصوتي', 'error');
        return;
    }
    try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = transcript;
                filterBySearch(transcript);
            }
        };
        recognition.onerror = () => showToast('حدث خطأ أثناء التعرف على الصوت', 'error');
        recognition.start();
    } catch (err) {
        showToast('تعذر تشغيل البحث الصوتي', 'error');
    }
}

// ==================== تهيئة الصفحة الرئيسية ====================
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
                bgMusic.play().then(() => {
                    if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high';
                }).catch(err => console.log("تعذر تشغيل الصوت تلقائياً:", err));
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

    document.querySelectorAll('.dark-toggle').forEach(btn => btn.addEventListener('click', toggleDarkMode));

    initProductsListener();
    initCheckoutForm();
    initReferralSystem();
    updateCartBadge();

    // ربط الدوال العالمية
    window.toggleFavorite = toggleFavorite;
    window.addToCart = addToCart;
    window.changeQty = changeQty;
    window.removeFromCart = removeFromCart;
    window.toggleCartModal = toggleCartModal;
    window.filterByCategory = filterByCategory;
    window.filterBySearch = filterBySearch;
    window.uploadImageToImgBB = uploadImageToImgBB;
    window.compressOldBase64Images = compressOldBase64Images;
    window.updateDelivery = updateDelivery;
    window.toggleInfoModal = toggleInfoModal;
    window.shareProduct = shareProduct;
    window.copyReferralCode = copyReferralCode;
    window.shareReferral = shareReferral;
    window.getMyReferralCode = getMyReferralCode;
    window.loadMoreProducts = loadMoreProducts;
    window.toggleDarkMode = toggleDarkMode;
    window.loadProductsByCategory = loadProductsByCategory;
    window.quickBuy = quickBuy;
    window.deleteProduct = deleteProduct;
    window.updateProduct = updateProduct;
    window.startVoiceSearch = startVoiceSearch;
    window.initProductsListener = initProductsListener;
}

// تشغيل تلقائي
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMainPage);
} else {
    initMainPage();
}

export { db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, writeBatch };
