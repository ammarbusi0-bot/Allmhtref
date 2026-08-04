import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
    query, where, orderBy, limit, serverTimestamp, getDocs, startAfter
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==================== تهيئة Firebase ====================
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
export const db = getFirestore(app);

// ==================== الأدوات المساعدة ====================
export const escapeHTML = str => str == null ? '' : String(str).replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

const normalizeArabicText = (text = '') => {
    return String(text)
        .toLowerCase()
        .replace(/[أإآء]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, '')
        .trim();
};

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white; padding: 12px 24px; border-radius: 30px; z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: opacity 0.3s; font-family: inherit;
        max-width: 90%; text-align: center;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==================== إدارة الصور (WebP + ImgBB) ====================
const IMGBB_API_KEY = "42b6820dc31a25d977adefc41f83aa70", MAX_UPLOAD_SIZE_MB = 15, IMAGE_MAX_WIDTH = 600, WEBP_QUALITY = 0.75;

export async function uploadImageToImgBB(fileOrInput) {
    let file = fileOrInput instanceof File ? fileOrInput : fileOrInput?.files?.[0];
    if (!file) return '';
    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        showToast(`⚠️ حجم الصورة كبير جداً. الحد الأقصى ${MAX_UPLOAD_SIZE_MB} ميغابايت.`, 'error');
        return '';
    }

    try {
        const formData = new FormData();
        const compressedBlob = await compressImageFile(file);
        formData.append('image', compressedBlob, 'product.webp');
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        if (res.ok) return (await res.json())?.data?.url || '';
    } catch (e) { console.error("خطأ رفع الصورة:", e); }
    showToast("⚠️ تعذر رفع الصورة. تحقق من الاتصال وحاول مجدداً.", 'error');
    return '';
}

function compressImageFile(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > IMAGE_MAX_WIDTH) { height = Math.round((height * IMAGE_MAX_WIDTH) / width); width = IMAGE_MAX_WIDTH; }
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    canvas.toBlob(blob => resolve(blob || file), 'image/webp', WEBP_QUALITY);
                } catch (err) { resolve(file); }
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

// ==================== ضغط الصور القديمة ====================
export async function compressOldBase64Images() {
    console.log("⏳ بدء ضغط الصور القديمة...");
    let lastDoc = null, hasMore = true, totalUpdated = 0;
    const BATCH_SIZE = 15;
    try {
        while (hasMore) {
            const constraints = [
                collection(db, "products"),
                orderBy("__name__", "desc"),
                limit(BATCH_SIZE)
            ];
            if (lastDoc) constraints.push(startAfter(lastDoc));
            const snapshot = await getDocs(query(...constraints));
            if (snapshot.empty) break;

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const url = String(data.imageUrl || '').trim();
                if (url.startsWith('data:image') && !data.isCompressed) {
                    try {
                        const compressed = await compressBase64ToWebP(url, 400, 0.6);
                        if (compressed && compressed !== url) {
                            await updateDoc(doc(db, "products", docSnap.id), {
                                imageUrl: compressed,
                                isCompressed: true
                            });
                            totalUpdated++;
                            const localProduct = globalProducts.find(p => p.id === docSnap.id);
                            if (localProduct) {
                                localProduct.imageUrl = compressed;
                                localProduct.isCompressed = true;
                            }
                        }
                    } catch (err) {
                        console.error(`خطأ في ضغط المنتج ${docSnap.id}:`, err);
                    }
                }
                await new Promise(r => setTimeout(r, 60));
            }
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.docs.length < BATCH_SIZE) hasMore = false;
        }
        
        if (totalUpdated > 0) {
            applyFilters();
            showToast(`✅ تم ضغط ${totalUpdated} صورة قديمة بنجاح.`, 'success');
        } else {
            showToast(`ℹ️ لا توجد صور قديمة تحتاج ضغط.`, 'info');
        }
    } catch (e) {
        console.error("فشل ضغط الصور القديمة:", e);
        showToast("❌ فشل ضغط الصور القديمة", 'error');
    }
}

function compressBase64ToWebP(base64, maxWidth, quality) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/webp', quality));
            } catch (e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = base64;
    });
}

// ==================== الوضع الداكن ====================
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
    document.body.classList.toggle('dark', isDark);
    updateDarkModeIcons(isDark);
}

// ==================== حالة التطبيق والمتغيرات ====================
let globalProducts = [], cart = loadCartFromStorage(), isSubmitting = false;
let currentCategory = '', currentSearch = '', currentDeliveryType = 'inside', currentDeliveryKm = 1;

const categoryLastDocs = {};
const categoryHasMoreMap = {};
const categoryCache = {};
const categoryFullyLoaded = {};
let isCategoryLoading = false;
let isFullLoadInProgress = false;
const CATEGORY_PAGE_SIZE = 15;

let scrollObserver = null;

// ==================== نظام الدعوة والخصومات ====================
export function getMyReferralCode() {
    let code = localStorage.getItem('myReferralCode');
    if (!code) {
        code = Array.from({ length: 6 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
        localStorage.setItem('myReferralCode', code);
    }
    return code;
}

export const getInviteLink = () => `${window.location.origin}${window.location.pathname}?ref=${getMyReferralCode()}`;

export function shareProduct(platform, productId) {
    const p = globalProducts.find(item => item.id === productId);
    if (!p) return;
    const discount = Number(p.discount) || 0, basePrice = Number(p.price) || 0;
    const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
    const code = getMyReferralCode();
    const message = `🛍️ ${p.name}\n💰 ${finalPrice} TL\n🎁 كود خصم 10%: ${code}\n📱 ${window.location.href}`;
    const encoded = encodeURIComponent(message);

    if (platform === 'instagram') navigator.clipboard.writeText(message).then(() => showToast('✅ تم نسخ الرابط للصقه في انستا', 'success'));
    else if (platform === 'whatsapp') window.open(`https://wa.me/?text=${encoded}`, '_blank');
    else if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encoded}`, '_blank');
}

export function handleReferral() {
    const ref = new URLSearchParams(window.location.search).get('ref'), myCode = getMyReferralCode();
    if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
        localStorage.setItem('invitedBy', ref);
        localStorage.setItem('referralUsed', 'true');
        setTimeout(() => showToast('🎉 مرحباً! تم تفعيل خصم 10% على طلبك الأول فوق 100 TL', 'success'), 500);
    }
}

export function getReferralDiscount(total) {
    return (total >= 100 && localStorage.getItem('invitedBy') && !localStorage.getItem('discountApplied')) ? total * 0.10 : 0;
}

export function showReferralCode() {
    const code = getMyReferralCode(), container = document.getElementById('referralContainer');
    if (container) {
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div><span style="font-weight:bold;">🎁 كود الخصم: </span><strong style="font-size:20px;color:#ff6b6b;letter-spacing:2px;background:var(--input-bg);padding:4px 12px;border-radius:6px;">${code}</strong></div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.copyReferralCode()" style="background:#4CAF50;color:white;border:none;padding:5px 15px;border-radius:5px;cursor:pointer;"><i class="fa-regular fa-copy"></i> نسخ</button>
                    <button onclick="window.shareReferral()" style="background:#25D366;color:white;border:none;padding:5px 15px;border-radius:5px;cursor:pointer;"><i class="fa-brands fa-whatsapp"></i> مشاركة</button>
                </div>
            </div>
            <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على 10% خصم لأول طلب فوق 100 TL</p>
        `;
    }
}

export const copyReferralCode = () => navigator.clipboard.writeText(getMyReferralCode()).then(() => showToast('✅ تم نسخ الكود: ' + getMyReferralCode(), 'success'));
export const shareReferral = () => window.open(`https://wa.me/?text=${encodeURIComponent(`🎁 استخدم كود الخصم هذا في متجر ماركت الأخوة واحصل على 10% خصم: ${getMyReferralCode()}\n📱 ${window.location.href}`)}`, '_blank');

export function initReferralSystem() {
    handleReferral();
    showReferralCode();
}

// ==================== عرض المنتجات ====================
function renderSkeletonLoaders() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: 8 }, () => `
        <div class="product-card skeleton" style="opacity:0.6; pointer-events:none;">
            <div class="product-img" style="background:#e0e0e0; height:180px; border-radius:10px;"></div>
            <div class="product-info" style="padding:10px 0;">
                <div style="background:#e0e0e0; height:15px; width:70%; margin-bottom:8px; border-radius:4px;"></div>
                <div style="background:#e0e0e0; height:20px; width:40%; border-radius:4px;"></div>
            </div>
        </div>
    `).join('');
}

function generateProductCardHTML(p, favs) {
    const isFav = favs.includes(p.id), imgUrl = String(p.imageUrl || '').trim(), isValidImg = imgUrl && imgUrl !== 'null' && imgUrl !== 'undefined';
    const imageHTML = isValidImg
        ? `<img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(p.name)}" loading="lazy" width="300" height="200" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="no-img-fallback" style="display:none;"><i class="fa-solid fa-basket-shopping"></i></div>`
        : `<div class="no-img-fallback"><i class="fa-solid fa-basket-shopping"></i></div>`;

    const discount = Number(p.discount) || 0, originalPrice = Number(p.price) || 0;
    const finalPrice = discount > 0 ? Math.round(originalPrice - (originalPrice * discount / 100)) : originalPrice;
    const badge = { 'غير متوفر': ['❌ غير متوفر', '#e74c3c'], 'محدود': ['⚠️ محدود', '#f39c12'] }[p.availability || 'متوفر'] || ['✅ متوفر', '#2ecc71'];
    const disableAdd = p.availability === 'غير متوفر';

    let availabilityDateText = '';
    if (p.availabilityDate) {
        try {
            const dateObj = typeof p.availabilityDate?.toDate === 'function' ? p.availabilityDate.toDate() : new Date(p.availabilityDate);
            if (!isNaN(dateObj.getTime())) availabilityDateText = `<div style="font-size:11px;color:#888;margin:2px 0;">📅 متاح من: ${dateObj.toLocaleDateString('ar-EG')}</div>`;
        } catch (e) { }
    }

    const starsHTML = Array.from({ length: 5 }, (_, i) => `<i class="fa-star ${i < (p.rating || 0) ? 'fa-solid' : 'fa-regular'}" style="color:#f1c40f;"></i>`).join('');

    return `
        ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
        <div class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${p.id}', this)"><i class="fa-solid fa-heart"></i></div>
        <div class="product-img">${imageHTML}</div>
        <div class="product-info">
            <div class="product-title">${escapeHTML(p.name)}</div>
            <div class="product-price">${discount > 0 ? `<span class="old-price">${originalPrice} TL</span>` : ''}${finalPrice} TL</div>
            <div style="margin:3px 0;">${starsHTML}</div>
            <span style="background:${badge[1]}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; display:inline-block; margin-top:4px;">${badge[0]}</span>
            ${availabilityDateText}
        </div>
        <div class="share-buttons" style="display:flex;gap:8px;margin:5px 0;justify-content:center;">
            <button onclick="window.shareProduct('whatsapp', '${p.id}')" style="background:none;border:none;font-size:18px;cursor:pointer;"><i class="fa-brands fa-whatsapp" style="color:#25D366;"></i></button>
            <button onclick="window.shareProduct('facebook', '${p.id}')" style="background:none;border:none;font-size:18px;cursor:pointer;"><i class="fa-brands fa-facebook" style="color:#1877F2;"></i></button>
            <button onclick="window.shareProduct('instagram', '${p.id}')" style="background:none;border:none;font-size:18px;cursor:pointer;"><i class="fa-brands fa-instagram" style="color:#E4405F;"></i></button>
        </div>
        <button class="btn-add-cart" ${disableAdd ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : `onclick="window.addToCart('${p.id}')"`}>${disableAdd ? 'غير متوفر' : '+ أضف للسلة'}</button>
        ${!disableAdd ? `<button class="btn-quick-buy" onclick="window.quickBuy('${p.id}')" style="margin-top:5px; width:100%; padding:5px; background:#27ae60; color:white; border:none; border-radius:5px; cursor:pointer;">⚡ شراء سريع</button>` : ''}
    `;
}

export function displayProducts(items) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (!items.length) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:30px;">
            لا توجد منتجات مطابقة لهذا القسم.
        </p>`;
        return;
    }

    const favs = getFavorites();
    grid.innerHTML = items.map(p => `
        <div class="product-card" id="product-card-${p.id}">
            ${generateProductCardHTML(p, favs)}
        </div>
    `).join('') + `<div id="scrollSentinel" style="height:20px; grid-column:1/-1; visibility:hidden;"></div>`;

    setupIntersectionObserver();
}

// ==================== التصفية والبحث والتمرير ====================
export function applyFilters() {
    if (!currentCategory) return;
    
    let filtered = globalProducts.filter(p => p.category === currentCategory);
    if (currentSearch.trim()) {
        const searchNorm = normalizeArabicText(currentSearch);
        filtered = filtered.filter(p => normalizeArabicText(p.name || '').includes(searchNorm));
    }
    displayProducts(filtered);
}

export async function filterByCategory(cat, element) {
    if (!cat) return;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    currentCategory = cat;

    if (!categoryCache[cat]) {
        renderSkeletonLoaders();
        await loadProductsByCategory(cat, true);
    }
    
    if (currentSearch.trim() && !categoryFullyLoaded[cat]) {
        await loadAllProductsForCategory(cat);
    }
    
    applyFilters();
}

async function loadAllProductsForCategory(category) {
    if (!category || isFullLoadInProgress) return;
    if (categoryFullyLoaded[category]) return;
    
    isFullLoadInProgress = true;
    categoryLastDocs[category] = null;
    categoryHasMoreMap[category] = true;
    let lastDoc = null;
    const BATCH_SIZE = 50;

    try {
        while (categoryHasMoreMap[category]) {
            const constraints = [
                collection(db, "products"),
                where("category", "==", category),
                orderBy("__name__", "desc"),
                limit(BATCH_SIZE)
            ];
            if (lastDoc) constraints.push(startAfter(lastDoc));
            const snapshot = await getDocs(query(...constraints));
            if (snapshot.empty) {
                categoryHasMoreMap[category] = false;
                break;
            }
            const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const existingIds = new Set(globalProducts.map(p => p.id));
            newProducts.forEach(p => { if (!existingIds.has(p.id)) globalProducts.push(p); });
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.docs.length < BATCH_SIZE) categoryHasMoreMap[category] = false;
        }
        categoryFullyLoaded[category] = true;
    } catch (err) {
        console.error("فشل تحميل كل منتجات القسم:", err);
        showToast("تعذر تحميل جميع المنتجات للبحث", 'error');
    } finally {
        isFullLoadInProgress = false;
    }
}

export async function loadProductsByCategory(category, isInitial = true) {
    if (!category || isCategoryLoading) return;
    if (!isInitial && categoryHasMoreMap[category] === false) return;

    isCategoryLoading = true;

    if (isInitial) {
        categoryLastDocs[category] = null;
        categoryHasMoreMap[category] = true;
        categoryFullyLoaded[category] = false;
    }

    try {
        let constraints = [
            collection(db, "products"),
            where("category", "==", category),
            orderBy("__name__", "desc"),
            limit(CATEGORY_PAGE_SIZE)
        ];

        if (!isInitial && categoryLastDocs[category]) {
            constraints.push(startAfter(categoryLastDocs[category]));
        }

        const q = query(...constraints);
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            categoryHasMoreMap[category] = false;
            return;
        }

        let fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const existingIds = new Set(globalProducts.map(p => p.id));
        fetchedProducts.forEach(p => { if (!existingIds.has(p.id)) globalProducts.push(p); });

        categoryLastDocs[category] = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.docs.length < CATEGORY_PAGE_SIZE) categoryHasMoreMap[category] = false;

        categoryCache[category] = true;
        applyFilters();
    } catch (error) {
        console.error("خطأ في تحميل الفئة:", error);
        showToast("فشل تحميل المنتجات", 'error');
    } finally {
        isCategoryLoading = false;
    }
}

let searchTimeout;
export function filterBySearch(queryStr) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        currentSearch = queryStr;
        
        if (currentSearch.trim() && currentCategory) {
            if (!categoryFullyLoaded[currentCategory]) {
                showToast(`🔎 جاري البحث داخل (${currentCategory})...`, 'info');
                await loadAllProductsForCategory(currentCategory);
            }
        }
        
        applyFilters();
    }, 300);
}

// ==================== تحسين التمرير السلس (IntersectionObserver) ====================
function setupIntersectionObserver() {
    if (scrollObserver) scrollObserver.disconnect();
    
    const sentinel = document.getElementById('scrollSentinel');
    if (!sentinel) return;

    scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            if (currentCategory && categoryHasMoreMap[currentCategory] !== false && !isCategoryLoading && !currentSearch.trim()) {
                loadProductsByCategory(currentCategory, false);
            }
        }
    }, { rootMargin: '300px' });

    scrollObserver.observe(sentinel);
}

// ==================== المفضلة ====================
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('alukhowah_favs') || '[]'); } catch { return []; }
}

export function toggleFavorite(productId, btnElement) {
    let favs = getFavorites();
    const isFav = favs.includes(productId);
    favs = isFav ? favs.filter(id => id !== productId) : [...favs, productId];
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    if (btnElement) btnElement.classList.toggle('active', !isFav);
}

// ==================== إدارة السلة والشراء ====================
function loadCartFromStorage() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

const saveCartToStorage = () => localStorage.setItem('cart', JSON.stringify(cart));

export function updateCartBadge() {
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
}

export function addToCart(productId) {
    const product = globalProducts.find(p => p.id === productId);
    if (!product || product.availability === 'غير متوفر') return showToast('❌ هذا المنتج غير متوفر حالياً.', 'error');
    if (product.category === 'شحن ألعاب') return redirectToWhatsApp(product);

    const existing = cart.find(item => item.id === productId);
    if (existing) existing.qty += 1;
    else {
        const discount = Number(product.discount) || 0, basePrice = Number(product.price) || 0;
        const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
        cart.push({ id: product.id, name: product.name, price: finalPrice, discount, qty: 1, imageUrl: product.imageUrl });
    }
    saveCartToStorage(); updateCartBadge();
    showToast(`✅ تمت إضافة ${product.name} إلى السلة`, 'success');
}

export function quickBuy(productId) {
    addToCart(productId);
    toggleCartModal();
    document.getElementById('checkoutForm')?.scrollIntoView({ behavior: 'smooth' });
}

function redirectToWhatsApp(product) {
    const numbers = ['905511455598', '905385844122', '905511591245'], number = numbers[Math.floor(Math.random() * numbers.length)];
    const discount = Number(product.discount) || 0, base = Number(product.price) || 0;
    const finalPrice = discount > 0 ? Math.round(base - (base * discount / 100)) : base;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(`مرحباً، أريد شراء: ${product.name}\nالسعر: ${finalPrice} TL\nالرجاء إرسال تفاصيل الدفع`)}`, '_blank');
    showToast('✅ تم تحويلك إلى واتساب لإتمام عملية الشحن', 'success');
}

export function changeQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== productId);
    saveCartToStorage(); updateCartBadge(); renderCartItems();
}

export function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    saveCartToStorage(); updateCartBadge(); renderCartItems();
}

export function updateDelivery() {
    const typeEl = document.getElementById('deliveryType'), kmContainer = document.getElementById('kmInputContainer');
    if (typeEl) currentDeliveryType = typeEl.value;
    if (kmContainer) kmContainer.style.display = currentDeliveryType === 'outside' ? 'block' : 'none';
    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) currentDeliveryKm = Math.max(1, parseFloat(kmEl.value) || 1);
    renderCartItems();
}

function calculateFinalTotal() {
    const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const smartDiscountPercent = itemsTotal >= 1000 ? 10 : (itemsTotal >= 500 ? 5 : 0);
    const smartDiscountAmount = itemsTotal * (smartDiscountPercent / 100);
    let discountedTotal = itemsTotal - smartDiscountAmount;
    const referralDiscount = getReferralDiscount(discountedTotal);
    discountedTotal -= referralDiscount;
    const deliveryCost = currentDeliveryType === 'inside' ? 100 : currentDeliveryKm * 35;
    return { itemsTotal, smartDiscountPercent, smartDiscountAmount, referralDiscount, discountedItemsTotal: discountedTotal, deliveryCost, finalTotal: discountedTotal + deliveryCost };
}

export function toggleCartModal() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    modal.classList.toggle('open');
    if (modal.classList.contains('open')) { updateDelivery(); renderCartItems(); }
}

export function renderCartItems() {
    const container = document.getElementById('cartItemsContainer'), summaryDiv = document.getElementById('cartSummary');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">السلة فارغة حالياً.</p>';
        if (summaryDiv) summaryDiv.style.display = 'none';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div><strong>${escapeHTML(item.name)}</strong><div style="font-size:12px; color:#666;">${item.price} TL × ${item.qty}</div></div>
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

// ==================== نموذج إرسال الطلب ====================
export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmitting || cart.length === 0) return;
        const btn = document.getElementById('submitBtn');
        isSubmitting = true; btn.textContent = 'جاري الإرسال...'; btn.disabled = true;

        const phone = document.getElementById('userPhone')?.value.trim() || '';
        const address = document.getElementById('userAddress')?.value.trim() || '';
        const calc = calculateFinalTotal();

        try {
            await addDoc(collection(db, "orders"), {
                phone, address, items: cart.map(i => `${i.name} (${i.qty})`).join(' - '),
                total: Math.round(calc.finalTotal), itemsTotal: calc.itemsTotal,
                smartDiscount: Math.round(calc.smartDiscountAmount), referralDiscount: Math.round(calc.referralDiscount),
                deliveryCost: calc.deliveryCost, deliveryType: currentDeliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${currentDeliveryKm} كم)`,
                date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                createdAt: serverTimestamp()
            });

            if (calc.referralDiscount > 0) localStorage.setItem('discountApplied', 'true');

            showToast(`✅ تم إرسال طلبك بنجاح! الإجمالي: ${Math.round(calc.finalTotal)} TL`, 'success');
            cart = []; saveCartToStorage(); updateCartBadge(); renderCartItems(); toggleCartModal(); form.reset();
        } catch (err) { showToast('❌ حدث خطأ: ' + err.message, 'error'); }
        finally { isSubmitting = false; btn.textContent = '🚀 تأكيد الطلب'; btn.disabled = false; }
    });
}

export function toggleInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.classList.toggle('open');
}

// ==================== تهيئة التحميل الأولي ====================
export async function initProductsListener() {
    const firstChip = document.querySelector('.cat-chip:not([data-category="all"])');
    const defaultCat = firstChip?.getAttribute('data-category') || firstChip?.dataset?.category || 'خضار وفواكه';
    if (firstChip) firstChip.classList.add('active');
    await filterByCategory(defaultCat, firstChip);
}

// ==================== دوال الإدارة المباشرة (غرفة الإدارة) ====================
export function toggleAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.classList.toggle('open');
}

export async function addProduct(productData) {
    try {
        const docRef = await addDoc(collection(db, "products"), {
            ...productData,
            createdAt: serverTimestamp()
        });
        
        const newProduct = { id: docRef.id, ...productData, createdAt: new Date() };
        globalProducts.unshift(newProduct);

        const cat = productData.category;
        if (cat) {
            categoryLastDocs[cat] = null;
            categoryHasMoreMap[cat] = true;
            categoryFullyLoaded[cat] = false;
            delete categoryCache[cat];
        }

        applyFilters();
        showToast('✅ تم إضافة المنتج بنجاح', 'success');
        return docRef.id;
    } catch (e) {
        showToast('❌ فشل إضافة المنتج: ' + e.message, 'error');
        return null;
    }
}

export async function deleteProduct(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        try {
            const deletedProduct = globalProducts.find(p => p.id === productId);
            await deleteDoc(doc(db, "products", productId));
            globalProducts = globalProducts.filter(p => p.id !== productId);
            
            const cardEl = document.getElementById(`product-card-${productId}`);
            if (cardEl) {
                cardEl.remove();
            } else {
                applyFilters();
            }
            
            showToast('تم الحذف بنجاح', 'success');
        } catch (e) { showToast('فشل الحذف: ' + e.message, 'error'); }
    }
}

export async function updateProduct(productId, newData) {
    try {
        await updateDoc(doc(db, "products", productId), newData);
        const product = globalProducts.find(p => p.id === productId);
        if (product) {
            const oldCategory = product.category;
            Object.assign(product, newData);
            
            if (newData.category && oldCategory !== newData.category) {
                categoryFullyLoaded[oldCategory] = false;
                categoryFullyLoaded[newData.category] = false;
                delete categoryCache[oldCategory];
                delete categoryCache[newData.category];
                applyFilters();
            } else {
                // تحديث كارت المنتج المباشر لتفادي الرفرفة
                const cardEl = document.getElementById(`product-card-${productId}`);
                if (cardEl) {
                    cardEl.innerHTML = generateProductCardHTML(product, getFavorites());
                } else {
                    applyFilters();
                }
            }
        }
        showToast('تم التحديث بنجاح', 'success');
    } catch (e) { showToast('فشل التحديث: ' + e.message, 'error'); }
}

// ==================== البحث الصوتي ====================
export function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast('المتصفح لا يدعم البحث الصوتي', 'error');
    try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) { searchInput.value = transcript; filterBySearch(transcript); }
        };
        recognition.onerror = () => showToast('حدث خطأ أثناء التعرف على الصوت', 'error');
        recognition.start();
    } catch (err) { showToast('تعذر تشغيل البحث الصوتي', 'error'); }
}

// ==================== تهيئة التطبيق وتصدير النافذة العامّة ====================
export function initMainPage() {
    loadDarkModePreference();

    const enterBtn = document.getElementById('enterBtn'), welcomeOverlay = document.getElementById('welcomeOverlay');
    const bgMusic = document.getElementById('bgMusic'), toggleMusicBtn = document.getElementById('toggleMusicBtn'), musicIcon = document.getElementById('musicIcon');

    if (enterBtn && welcomeOverlay) {
        enterBtn.addEventListener('click', () => {
            if (bgMusic) bgMusic.play().then(() => { if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high'; }).catch(e => console.log("تعذر تشغيل الصوت تلقائياً:", e));
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

    Object.assign(window, {
        toggleFavorite, addToCart, changeQty, removeFromCart, toggleCartModal,
        filterByCategory, filterBySearch, uploadImageToImgBB, compressOldBase64Images,
        updateDelivery, toggleInfoModal, shareProduct, copyReferralCode, shareReferral,
        getMyReferralCode, toggleDarkMode, loadProductsByCategory,
        quickBuy, deleteProduct, updateProduct, addProduct, startVoiceSearch, initProductsListener,
        toggleAdminModal
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMainPage);
} else {
    initMainPage();
}
