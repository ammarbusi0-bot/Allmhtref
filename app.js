import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    query,
    orderBy,
    limit,
    serverTimestamp,
    getDocs,
    startAfter
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

// ==================== إدارة الصور ====================
const IMGBB_API_KEY = "42b6820dc31a25d977adefc41f83aa70"; // يُفضّل نقله لخادم خلفي لاحقاً
const MAX_UPLOAD_SIZE_MB = 15;
const IMAGE_MAX_WIDTH = 600;
const JPEG_QUALITY = 0.7;

export async function uploadImageToImgBB(fileOrInput) {
    let file = fileOrInput instanceof File ? fileOrInput : fileOrInput?.files?.[0];
    if (!file) return '';

    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
        alert(`⚠️ حجم الصورة كبير جداً. الحد الأقصى ${MAX_UPLOAD_SIZE_MB} ميغابايت.`);
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
    alert("⚠️ تعذر رفع الصورة. تحقق من الاتصال وحاول مجدداً.");
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

// معالجة الصور القديمة على دفعات مع فواصل مؤقتة
export async function compressOldBase64Images() {
    console.log("⏳ بدء ضغط الصور القديمة على دفعات...");
    let lastDoc = null;
    let hasMore = true;
    let totalUpdated = 0;
    const BATCH_SIZE = 10;

    try {
        while (hasMore) {
            const constraints = [collection(db, "products"), limit(BATCH_SIZE)];
            if (lastDoc) constraints.push(startAfter(lastDoc));

            const snapshot = await getDocs(query(...constraints));
            if (snapshot.empty) {
                hasMore = false;
                break;
            }

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const url = String(data.imageUrl || '').trim();
                if (url.startsWith('data:image')) {
                    const compressed = await compressBase64ToJPEG(url, 400, 0.5);
                    await updateDoc(doc(db, "products", docSnap.id), { imageUrl: compressed });
                    totalUpdated++;
                }
                await new Promise(r => setTimeout(r, 50)); // إفساح مجال للمتصفح
            }

            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.docs.length < BATCH_SIZE) hasMore = false;
        }
        alert(`✅ تم ضغط ${totalUpdated} صورة قديمة بنجاح.`);
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

// ==================== الحالة العامة ====================
let globalProducts = [];
let cart = loadCartFromStorage(); // استمرارية السلة بعد تحديث الصفحة
let isSubmitting = false;
let currentCategory = 'all';
let currentSearch = '';
let currentDeliveryType = 'inside'; // 'inside' | 'outside'
let currentDeliveryKm = 1;
let unsubscribeProducts = null;

// ==================== إدارة السلة (مع localStorage) ====================
function loadCartFromStorage() {
    try {
        const stored = localStorage.getItem('cart');
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
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
        alert('❌ هذا المنتج غير متوفر حالياً.');
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
        cart.push({ 
            id: product.id,
            name: product.name,
            price: finalPrice,
            discount,
            qty: 1,
            imageUrl: product.imageUrl
        });
    }
    saveCartToStorage();
    updateCartBadge();
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

function redirectToWhatsApp(product) {
    const numbers = ['905511455598', '905385844122', '905511591245'];
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    const price = calculateProductFinalPrice(product);
    const message = `مرحباً، أريد شراء: ${product.name}\nالسعر: ${price} TL\nالرجاء إرسال تفاصيل الدفع`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
    alert('✅ تم تحويلك إلى واتساب لإتمام عملية الشحن.');
}

function calculateProductFinalPrice(product) {
    const discount = Number(product.discount) || 0;
    const base = Number(product.price) || 0;
    return discount > 0 ? Math.round(base - (base * discount / 100)) : base;
}

// ==================== حساب التوصيل والإجمالي ====================
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
    
    // خصم ذكي
    let smartDiscountPercent = 0;
    if (itemsTotal >= 1000) smartDiscountPercent = 10;
    else if (itemsTotal >= 500) smartDiscountPercent = 5;
    const smartDiscountAmount = itemsTotal * (smartDiscountPercent / 100);
    let discountedTotal = itemsTotal - smartDiscountAmount;

    // خصم الإحالة (إن وجد)
    const referralDiscount = getReferralDiscount(discountedTotal);
    discountedTotal -= referralDiscount;

    // تكلفة التوصيل
    const deliveryCost = currentDeliveryType === 'inside' ? 100 : (currentDeliveryKm || 1) * 35;
    
    return {
        itemsTotal,
        smartDiscountPercent,
        smartDiscountAmount,
        referralDiscount,
        discountedItemsTotal: discountedTotal,
        deliveryCost,
        finalTotal: discountedTotal + deliveryCost
    };
}

// ==================== عرض السلة ====================
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
                phone,
                address,
                items: itemsSummary,
                total: Math.round(calc.finalTotal),
                itemsTotal: calc.itemsTotal,
                smartDiscount: Math.round(calc.smartDiscountAmount),
                referralDiscount: Math.round(calc.referralDiscount),
                deliveryCost: calc.deliveryCost,
                deliveryType: currentDeliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${currentDeliveryKm} كم)`,
                date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                createdAt: serverTimestamp()
            });
            alert(`✅ تم إرسال طلبك بنجاح!\nالإجمالي: ${Math.round(calc.finalTotal)} TL`);
            cart = [];
            saveCartToStorage();
            updateCartBadge();
            renderCartItems();
            toggleCartModal();
            form.reset();
        } catch (err) {
            alert('❌ حدث خطأ: ' + err.message);
        } finally {
            isSubmitting = false;
            btn.textContent = '🚀 تأكيد الطلب';
            btn.disabled = false;
        }
    });
}

// ==================== الإحالة والخصم ====================
export function getMyReferralCode() {
    let code = localStorage.getItem('myReferralCode');
    if (!code) {
        code = Array.from({ length: 6 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
        localStorage.setItem('myReferralCode', code);
    }
    return code;
}

function getReferralDiscount(total) {
    if (total < 100 || !localStorage.getItem('invitedBy') || localStorage.getItem('discountApplied')) return 0;
    return total * 0.10;
}

export function handleReferral() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const myCode = getMyReferralCode();
    if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
        localStorage.setItem('invitedBy', ref);
        localStorage.setItem('referralUsed', 'true');
        // يمكن إضافة نقاط للإحالة هنا
        setTimeout(() => alert('🎉 مرحباً! تم تفعيل خصم 10% على طلبك الأول فوق 100 TL.'), 500);
    }
}

// ==================== عرض المنتجات والفلاتر ====================
export function displayProducts(items) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (!items.length) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px;">لا توجد منتجات متوفرة.</p>';
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
                    <span style="background:${badge[1]}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; display:inline-block; margin-top:4px;">${badge[0]}</span>
                </div>
                <button class="btn-add-cart" ${disableAdd ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : `onclick="window.addToCart('${p.id}')"`}>
                    ${disableAdd ? 'غير متوفر' : '+ أضف للسلة'}
                </button>
            </div>
        `;
    }).join('');
}

export function applyFilters() {
    let filtered = globalProducts;
    if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
    if (currentSearch.trim()) {
        const searchLower = currentSearch.toLowerCase();
        filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(searchLower));
    }
    displayProducts(filtered);
}

export function filterByCategory(cat, element) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    element?.classList.add('active');
    currentCategory = cat;
    applyFilters();
}

let searchTimeout;
export function filterBySearch(queryStr) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearch = queryStr;
        applyFilters();
    }, 250);
}

// ==================== المفضلة (تحديث موضعي) ====================
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch { return []; }
}

export function toggleFavorite(productId, btnElement) {
    const favs = getFavorites();
    const isFav = favs.includes(productId);
    const newFavs = isFav ? favs.filter(id => id !== productId) : [...favs, productId];
    localStorage.setItem('favorites', JSON.stringify(newFavs));

    if (btnElement) {
        btnElement.classList.toggle('active', !isFav);
    } else {
        // إذا لم يتم تمرير الزر، نعيد رسم البطاقة (لحالة نادرة)
        const card = document.getElementById(`product-card-${productId}`);
        if (card) {
            const favBtn = card.querySelector('.fav-btn');
            if (favBtn) favBtn.classList.toggle('active', !isFav);
        }
    }
}

// ==================== مستمع المنتجات (مع إلغاء الاشتراك القديم) ====================
export function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (unsubscribeProducts) unsubscribeProducts();

    const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(24));
    unsubscribeProducts = onSnapshot(q, snapshot => {
        globalProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFilters();
    }, error => {
        console.error("خطأ تحميل المنتجات:", error);
        grid.innerHTML = '<p style="color:red; text-align:center;">فشل تحميل المنتجات.</p>';
    });
}

// ==================== المظهر الداكن ====================
export function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon').forEach(icon => {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
}

export function loadDarkModePreference() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon').forEach(icon => {
            icon.className = 'fa-solid fa-sun';
        });
    }
}

// ==================== تهيئة الصفحة الرئيسية ====================
export function initMainPage() {
    loadDarkModePreference();

    // شاشة الترحيب والموسيقى
    const enterBtn = document.getElementById('enterBtn');
    const welcome = document.getElementById('welcomeOverlay');
    const bgMusic = document.getElementById('bgMusic');
    const toggleMusicBtn = document.getElementById('toggleMusicBtn');
    const musicIcon = document.getElementById('musicIcon');

    if (enterBtn && welcome) {
        enterBtn.addEventListener('click', () => {
            if (bgMusic) bgMusic.play().catch(() => {});
            welcome.style.display = 'none';
            if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high';
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

    // أزرار الوضع الليلي
    document.querySelectorAll('.dark-toggle').forEach(btn => btn.addEventListener('click', toggleDarkMode));

    // تهيئة المكونات الأساسية
    initProductsListener();
    initCheckoutForm();
    handleReferral();
    updateCartBadge();

    // ربط الدوال العامة
    window.addToCart = addToCart;
    window.changeQty = changeQty;
    window.removeFromCart = removeFromCart;
    window.toggleFavorite = toggleFavorite;
    window.filterByCategory = filterByCategory;
    window.filterBySearch = filterBySearch;
    window.uploadImageToImgBB = uploadImageToImgBB;
    window.compressOldBase64Images = compressOldBase64Images;
    window.updateDelivery = updateDelivery;
    window.toggleCartModal = toggleCartModal;
    window.shareProduct = shareProduct; // إن أردت إضافتها
}

// دوال إضافية للسلة والمودال
export function toggleCartModal() {
    document.getElementById('cartModal')?.classList.toggle('open');
    if (document.getElementById('cartModal')?.classList.contains('open')) {
        updateDelivery();
        renderCartItems();
    }
}

// للمشاركة يمكن إضافتها حسب الحاجة
function shareProduct(platform, name, price) {
    const code = getMyReferralCode();
    const msg = `🛍️ ${name}\n💰 ${price} TL\n🎁 كود خصم 10%: ${code}\n📱 ${window.location.href}`;
    const encoded = encodeURIComponent(msg);
    if (platform === 'whatsapp') window.open(`https://wa.me/?text=${encoded}`, '_blank');
    else if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encoded}`, '_blank');
    else if (platform === 'instagram') {
        navigator.clipboard.writeText(msg).then(() => alert('✅ تم نسخ النص لمشاركته في انستغرام.'));
    }
}

export { db, collection, addDoc, onSnapshot, doc, updateDoc, query, orderBy, serverTimestamp };
