// ============================================================
//  المتجر الأخوي - النسخة الأسطورية الشاملة والآمنة (Pro Max Ultimate)
//  تم التحسين: عرض الصور، رفع الصور، الأداء، الاستقرار
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
    arrayRemove,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ---------- إعدادات Firebase ----------
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

let unsubscribeProducts = null;
let lastOrderTime = 0;
window._displayedCount = 0;

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
    if (!phone) return false;
    const cleaned = phone.replace(/[^0-9+]/g, '');
    return /^[0-9+]{7,15}$/.test(cleaned);
}

export function validateAddress(address) {
    return address && address.trim().length >= 5;
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

// دالة مركزية لحساب المخزون الفعلي
export function getStock(product) {
    if (!product) return 0;
    if (product.category === 'شحن ألعاب') return Number.MAX_SAFE_INTEGER;
    const explicitUnavailability = (product.isAvailable === false || product.available === false || product.inStock === false);
    if (explicitUnavailability) return 0;
    const stock = Number(product.stock);
    if (!isNaN(stock) && stock >= 0) return stock;
    return 99;
}

export function closeWelcomeOverlay() {
    const welcomeOverlay = document.getElementById('welcomeOverlay');
    if (welcomeOverlay) {
        welcomeOverlay.style.opacity = '0';
        welcomeOverlay.style.pointerEvents = 'none';
        setTimeout(() => {
            welcomeOverlay.style.display = 'none';
        }, 300);
    }
}

// ============================================================
//  نظام المستخدمين
// ============================================================
export function getUser() {
    try {
        const data = localStorage.getItem('alukhowah_user');
        return data ? JSON.parse(data) : null;
    } catch { return null; }
}

export function setUser(userData) {
    try {
        localStorage.setItem('alukhowah_user', JSON.stringify(userData));
        state.user = userData;
        updateUserUI();
    } catch (e) { console.warn('setUser error:', e); }
}

export function logoutUser() {
    try {
        localStorage.removeItem('alukhowah_user');
        state.user = null;
        updateUserUI();
        showToast('تم تسجيل الخروج', 'info');
    } catch (e) { console.warn('logoutUser error:', e); }
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
//  نظام الدعوة والخصم
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
        state.invitedBy = ref;
        setTimeout(() => {
            showToast('🎉 تم تفعيل كود الخصم 10% على طلبك الأول بقيمة 100 ليرة أو أكثر!', 'success', 5000);
        }, 500);
    }
}

export function getReferralDiscount(total) {
    if (total < 100) return 0;
    if (!localStorage.getItem('invitedBy')) return 0;
    if (localStorage.getItem('discountApplied') === 'true') return 0;
    return Math.round(total * 0.10);
}

export function applyReferralDiscount(total) {
    const discount = getReferralDiscount(total);
    if (discount > 0) {
        localStorage.setItem('discountApplied', 'true');
        localStorage.setItem('referralUsed', 'true');
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
                <strong style="font-size:20px;color:#ff6b6b;letter-spacing:2px;background:var(--input-bg, #eee);padding:4px 12px;border-radius:6px;">${escapeHTML(code)}</strong>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="window.copyReferralCode()" class="btn-secondary">📋 نسخ</button>
                <button onclick="window.shareReferral()" class="btn-primary">📱 مشاركة</button>
            </div>
        </div>
        <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على خصم 10% لأول طلب بقيمة 100 ل.س أو أكثر</p>
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
    const message = `🎁 استخدم كود الخصم هذا في متجر ماركت الأخوة واحصل على خصم 10%: ${code}\n📱 ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// ============================================================
//  إدارة السلة (محسنة)
// ============================================================
function loadCart() {
    try {
        const saved = localStorage.getItem('alukhowah_cart');
        if (saved) {
            const rawCart = JSON.parse(saved);
            state.cart = rawCart.map(item => {
                const product = state.products.find(p => String(p.id) === String(item.id));
                if (!product) return null;

                const stock = getStock(product);
                if (stock <= 0) return null;

                const discount = product.discount ? Number(product.discount) : 0;
                const basePrice = Number(product.price) || 0;
                const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
                
                let safeQty = Math.max(1, Math.floor(Math.abs(Number(item.qty) || 1)));
                if (safeQty > stock) safeQty = stock;
                
                return { ...item, name: product.name, basePrice, price: finalPrice, discount, qty: safeQty };
            }).filter(Boolean);
            saveCart();
        }
    } catch (e) {
        state.cart = [];
        saveCart();
    }
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

    const stock = getStock(product);
    if (stock <= 0) {
        showToast('❌ هذا المنتج غير متوفر حالياً', 'error');
        return;
    }

    const idx = state.cart.findIndex(item => String(item.id) === String(id));
    const currentQty = idx > -1 ? state.cart[idx].qty : 0;
    
    if (currentQty >= stock) {
        showToast(`⚠️ الكمية المتوفرة محدودة (${stock} قطعة فقط)`, 'error');
        return;
    }

    if (idx > -1) {
        state.cart[idx].qty += 1;
    } else {
        const discount = product.discount ? Number(product.discount) : 0;
        const basePrice = Number(product.price) || 0;
        const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
        state.cart.push({ id: product.id, name: product.name, basePrice, price: finalPrice, discount, qty: 1 });
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
    if (idx === -1) return;
    
    const product = state.products.find(p => String(p.id) === String(id));
    if (!product) {
        state.cart.splice(idx, 1);
        saveCart();
        updateCartBadge();
        renderCartItems();
        return;
    }

    const stock = getStock(product);
    const newQty = state.cart[idx].qty + delta;
    
    if (newQty < 1) {
        state.cart.splice(idx, 1);
    } else if (delta > 0 && newQty > stock) {
        showToast(`⚠️ لا يمكن زيادة الكمية عن ${stock}`, 'error');
        return;
    } else {
        state.cart[idx].qty = newQty;
    }
    
    saveCart();
    updateCartBadge();
    renderCartItems();
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
//  حساب الإجمالي النهائي
// ============================================================
function calculateFinalTotal() {
    const itemsTotal = state.cart.reduce((sum, item) => {
        const qty = Math.max(0, Math.floor(item.qty));
        return sum + (item.price * qty);
    }, 0);

    const referralDiscount = getReferralDiscount(itemsTotal);

    let smartDiscountPercent = 0;
    if (itemsTotal >= 1000) smartDiscountPercent = 10;
    else if (itemsTotal >= 500) smartDiscountPercent = 5;

    const smartDiscountAmount = Math.round(itemsTotal * (smartDiscountPercent / 100));
    const totalDiscounts = smartDiscountAmount + referralDiscount;
    const discountedItemsTotal = Math.max(0, itemsTotal - totalDiscounts);

    let deliveryCost = 0;
    if (state.deliveryType === 'inside') {
        deliveryCost = 100;
    } else {
        const km = Math.max(1, Math.floor(Math.abs(Number(state.deliveryKm) || 1)));
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
//  عرض السلة (محسنة)
// ============================================================
export function toggleCartModal() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    modal.classList.toggle('open');
    if (modal.classList.contains('open')) {
        updateDelivery(false);
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
            <div class="cart-item" data-id="${escapeHTML(item.id)}">
                <div>
                    <strong>${escapeHTML(item.name)}</strong>
                    <div style="font-size:12px;color:#666;">${item.price} Lt × ${item.qty}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button class="qty-btn" onclick="window.changeQty('${escapeHTML(item.id)}', -1)">-</button>
                    <span style="font-weight:bold;">${item.qty}</span>
                    <button class="qty-btn" onclick="window.changeQty('${escapeHTML(item.id)}', 1)">+</button>
                    <span style="font-weight:bold;color:var(--primary, #28a745);">${itemTotal} Lt</span>
                    <i class="fa-solid fa-trash" style="color:red;cursor:pointer;" onclick="window.removeFromCart('${escapeHTML(item.id)}')"></i>
                </div>
            </div>
        `;
    }).join('');

    if (summaryDiv) {
        summaryDiv.style.display = 'block';
        const calc = calculateFinalTotal();
        summaryDiv.innerHTML = `
            <div class="summary-line"><span>مجموع المنتجات:</span><span>${calc.itemsTotal} Lt</span></div>
            ${calc.smartDiscountPercent > 0 ? `<div class="summary-line discount-text"><span>🎉 خصم الكمية (${calc.smartDiscountPercent}%):</span><span>-${calc.smartDiscountAmount} Lt</span></div>` : ''}
            ${calc.referralDiscount > 0 ? `<div class="summary-line discount-text"><span>🎁 خصم كود الدعوة (10%):</span><span>-${calc.referralDiscount} Lt</span></div>` : ''}
            <div class="summary-line"><span>🚚 التوصيل (${state.deliveryType === 'inside' ? 'داخل عمرانيا' : 'خارج ' + state.deliveryKm + ' كم'}):</span><span>${calc.deliveryCost} Lt</span></div>
            <div class="summary-line total"><span>💰 الإجمالي النهائي:</span><span>${calc.finalTotal} Lt</span></div>
        `;
        const finalTotalInput = document.getElementById('finalTotal');
        if (finalTotalInput) finalTotalInput.value = calc.finalTotal;
    }
}

export function updateDelivery(render = true) {
    const typeEl = document.getElementById('deliveryType');
    const kmContainer = document.getElementById('kmInputContainer');
    if (typeEl) {
        state.deliveryType = typeEl.value;
        if (kmContainer) kmContainer.style.display = state.deliveryType === 'outside' ? 'block' : 'none';
    }
    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) {
        state.deliveryKm = Math.max(1, Math.floor(Math.abs(Number(kmEl.value) || 1)));
    }
    if (render) renderCartItems();
}

// ============================================================
//  إرسال الطلب مع المعاملات والتحقق خادمياً
// ============================================================
export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    const deliveryTypeEl = document.getElementById('deliveryType');
    if (deliveryTypeEl) {
        deliveryTypeEl.addEventListener('change', () => updateDelivery(true));
    }

    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) {
        kmEl.addEventListener('input', () => updateDelivery(true));
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const now = Date.now();
        if (now - lastOrderTime < 10000) {
            showToast('⚠️ يرجى الانتظار القليل من الوقت قبل إرسال طلب جديد.', 'error');
            return;
        }

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
            showToast('رقم الهاتف غير صحيح', 'error');
            return;
        }
        if (!validateAddress(address)) {
            showToast('العنوان قصير جداً (أقل من 5 أحرف)', 'error');
            return;
        }

        state.isSubmitting = true;
        submitBtn.innerText = 'جاري إرسال الطلب...';
        submitBtn.disabled = true;

        try {
            const { verifiedItems, verifiedItemsTotal } = await runTransaction(db, async (transaction) => {
                let tVerifiedItems = [];
                let tVerifiedItemsTotal = 0;
                let tUpdates = [];

                for (const item of state.cart) {
                    const productRef = doc(db, "products", String(item.id));
                    const productDoc = await transaction.get(productRef);

                    if (!productDoc.exists()) {
                        throw new Error(`المنتج "${item.name}" لم يعد متوفراً!`);
                    }

                    const data = productDoc.data();
                    const currentStock = getStock(data);

                    if (data.category !== 'شحن ألعاب' && currentStock < item.qty) {
                        throw new Error(`عذراً، الكمية المتوفرة من "${data.name}" هي ${currentStock} فقط.`);
                    }

                    const basePrice = Number(data.price) || 0;
                    const discount = data.discount ? Number(data.discount) : 0;
                    const realPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;

                    const itemTotal = realPrice * item.qty;
                    tVerifiedItemsTotal += itemTotal;

                    tVerifiedItems.push({
                        id: item.id,
                        name: data.name,
                        qty: item.qty,
                        price: realPrice
                    });

                    if (data.category !== 'شحن ألعاب') {
                        tUpdates.push({ ref: productRef, newStock: Math.max(0, currentStock - item.qty) });
                    }
                }

                for (const u of tUpdates) {
                    transaction.update(u.ref, { stock: u.newStock });
                }
                
                return { verifiedItems: tVerifiedItems, verifiedItemsTotal: tVerifiedItemsTotal };
            });

            const referralDiscount = getReferralDiscount(verifiedItemsTotal);
            let smartDiscountPercent = 0;
            if (verifiedItemsTotal >= 1000) smartDiscountPercent = 10;
            else if (verifiedItemsTotal >= 500) smartDiscountPercent = 5;

            const smartDiscountAmount = Math.round(verifiedItemsTotal * (smartDiscountPercent / 100));
            const totalDiscounts = smartDiscountAmount + referralDiscount;
            const discountedItemsTotal = Math.max(0, verifiedItemsTotal - totalDiscounts);

            let deliveryCost = 0;
            if (state.deliveryType === 'inside') {
                deliveryCost = 100;
            } else {
                const km = Math.max(1, Math.floor(Math.abs(Number(state.deliveryKm) || 1)));
                deliveryCost = km * 35;
            }

            const finalTotal = discountedItemsTotal + deliveryCost;

            const orderData = {
                phone: String(phone),
                address: String(address),
                items: verifiedItems.map(i => `${i.name} (${i.qty})`).join(' - '),
                verifiedItems: verifiedItems,
                total: finalTotal,
                itemsTotal: verifiedItemsTotal,
                smartDiscount: smartDiscountAmount,
                referralDiscount: referralDiscount,
                deliveryCost: deliveryCost,
                deliveryType: state.deliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${state.deliveryKm} كم)`,
                date: new Date().toLocaleString('ar-EG'),
                createdAt: serverTimestamp(),
                userId: state.user?.phone || 'guest'
            };

            const docRef = await addDoc(collection(db, "orders"), orderData);

            if (state.user) {
                const localOrderData = { ...orderData, createdAt: new Date().toISOString() };
                state.user.orders = state.user.orders || [];
                state.user.orders.push({ id: docRef.id, ...localOrderData });
                setUser(state.user);
            }

            if (referralDiscount > 0) {
                applyReferralDiscount(verifiedItemsTotal);
            }

            lastOrderTime = Date.now();
            showToast(`✅ تم إرسال طلبك بنجاح!\nالإجمالي: ${finalTotal} Lt`, 'success', 5000);
            state.cart = [];
            saveCart();
            updateCartBadge();
            renderCartItems();
            toggleCartModal();
            form.reset();
        } catch (error) {
            showToast('❌ ' + error.message, 'error', 5000);
        } finally {
            state.isSubmitting = false;
            submitBtn.innerText = '🚀 تأكيد الطلب';
            submitBtn.disabled = false;
        }
    });
}

// ============================================================
//  عرض المنتجات (معالجة متطورة لتوفر المخزون وتحسين الصور)
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
        // تحسين فحص الرابط: يعتبر صالحاً إذا بدأ بـ http أو كان base64
        const isValid = imgUrl && (imgUrl.startsWith('http') || imgUrl.startsWith('data:image'));

        const stock = getStock(p);
        const isGameCharge = p.category === 'شحن ألعاب';
        const isAvailable = isGameCharge || stock > 0;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = p.id;

        // شارة الخصم
        const discount = p.discount ? Number(p.discount) : 0;
        if (discount > 0) {
            const badge = document.createElement('span');
            badge.className = 'discount-badge';
            badge.textContent = `-${discount}%`;
            card.appendChild(badge);
        }

        // شارة المخزون
        const stockBadge = document.createElement('span');
        stockBadge.className = `stock-badge ${isAvailable ? 'in-stock' : 'out-of-stock'}`;
        stockBadge.textContent = isGameCharge ? '🎮 شحن فورّي' : (isAvailable ? `🟢 متوفر (${stock})` : '🔴 غير متوفر');
        stockBadge.style.cssText = 'position:absolute;top:40px;right:8px;background:rgba(0,0,0,0.7);color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;z-index:2;';
        card.appendChild(stockBadge);

        // زر المفضلة
        const favBtn = document.createElement('div');
        favBtn.className = `fav-btn ${isFav ? 'active' : ''}`;
        favBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
        favBtn.onclick = (e) => {
            e.stopPropagation();
            window.toggleFavorite(p.id);
        };
        card.appendChild(favBtn);

        // حاوية الصورة
        const imgContainer = document.createElement('div');
        imgContainer.className = 'product-img';

        if (isValid) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = escapeHTML(p.name);
            img.loading = 'lazy';
            img.decode = 'async'; // تحسين التحميل

            // معالج الخطأ المحسّن
            img.onerror = function() {
                this.style.display = 'none';
                const fallback = this.nextElementSibling;
                if (fallback) fallback.style.display = 'flex';
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

        // معلومات المنتج
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

        // أزرار المشاركة
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

        // زر الإضافة للسلة / واتساب
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-cart';
        
        if (isGameCharge) {
            addBtn.textContent = '💬 شراء عبر واتساب';
            addBtn.style.background = '#25D366';
            addBtn.style.color = '#fff';
        } else {
            addBtn.textContent = isAvailable ? '+ أضف للسلة' : '🚫 غير متوفر';
            addBtn.disabled = !isAvailable;
            addBtn.style.opacity = isAvailable ? '1' : '0.6';
        }

        addBtn.onclick = () => { if (isAvailable) window.addToCart(p.id); };
        card.appendChild(addBtn);

        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
}

// ============================================================
//  التصفية والبحث والترحيل
// ============================================================
let searchTimeout = null;

export function filterBySearch(queryStr) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        state.searchQuery = (queryStr || '').trim();
        resetPagination();
        applyFilters();
    }, 250);
}

export function filterByCategory(cat, element) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    state.currentCategory = cat;
    resetPagination();
    applyFilters();
}

function resetPagination() {
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
//  المفضلة
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
            .then(() => showToast('✅ تم نسخ التفاصيل، الصقها في انستغرام', 'success'))
            .catch(() => showToast('فشل النسخ', 'error'));
    } else {
        window.open(links[platform], '_blank');
    }
}

// ============================================================
//  رفع الصور (محسّن مع إعادة المحاولة)
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

export async function uploadImageToImgBB(fileOrInput, retries = 2) {
    let file = null;
    if (fileOrInput instanceof File) file = fileOrInput;
    else if (fileOrInput?.files?.[0]) file = fileOrInput.files[0];
    else return '';

    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const compressedBase64 = await compressImage(file, 300, 0.7);
            if (!compressedBase64) return '';

            const blob = await fetch(compressedBase64).then(r => r.blob());
            const formData = new FormData();
            formData.append('image', blob, 'product.jpg');

            const myKey = "42b6820dc31a25d977adefc41f83aa70";
            // استخدام AbortController للتحكم في المهلة
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${myKey}`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data?.data?.url) {
                    return data.data.url;
                } else {
                    throw new Error('استجابة غير صالحة من ImgBB');
                }
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (error) {
            lastError = error;
            console.warn(`محاولة رفع الصورة ${attempt+1} فشلت:`, error.message);
            if (attempt < retries) {
                // انتظار قبل إعادة المحاولة
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    // إذا فشلت جميع المحاولات، نعود لاستخدام Base64 كحل بديل
    try {
        const base64 = await compressImage(file, 300, 0.7);
        return base64 || '';
    } catch (e) {
        console.error('فشل حتى في الضغط المحلي:', e);
        return '';
    }
}

// ============================================================
//  مراقبة قاعدة البيانات Firebase
// ============================================================
export function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (typeof unsubscribeProducts === 'function') {
        unsubscribeProducts();
        unsubscribeProducts = null;
    }

    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

    unsubscribeProducts = onSnapshot(q, (snapshot) => {
        const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        state.products = newProducts;
        
        loadCart();
        
        resetPagination();
        applyFilters();
        updateCartBadge();
        if (document.getElementById('cartModal')?.classList.contains('open')) {
            renderCartItems();
        }
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

export function toggleInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.classList.toggle('open');
}

// ============================================================
//  تهيئة الصفحة الرئيسية
// ============================================================
export function initMainPage() {
    try {
        loadDarkModePreference();

        const enterBtn = document.getElementById('enterBtn');
        const bgMusic = document.getElementById('bgMusic');
        const toggleMusicBtn = document.getElementById('toggleMusicBtn');
        const musicIcon = document.getElementById('musicIcon');

        if (enterBtn) {
            enterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeWelcomeOverlay();
                if (bgMusic) {
                    bgMusic.play()
                        .then(() => { if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high'; })
                        .catch(() => {});
                }
            });
        }

        setTimeout(() => {
            closeWelcomeOverlay();
        }, 2000);

        if (toggleMusicBtn && bgMusic && musicIcon) {
            toggleMusicBtn.addEventListener('click', () => {
                if (bgMusic.paused) {
                    bgMusic.play().catch(() => {});
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
        
        initProductsListener();
        initCheckoutForm();
        handleReferral();
        showReferralCode();
        updateUserUI();

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
        window.closeWelcomeOverlay = closeWelcomeOverlay;

        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', loadMoreProducts);
        }

    } catch (e) {
        console.error("خطأ أثناء التهيئة الرئيسية:", e);
        closeWelcomeOverlay();
    }
}

// منع التعارض مع لوحة التحكم (تحسين)
function startApp() {
    if (document.getElementById('adminMainContent')) {
        console.log('لوحة التحكم مكتشفة، نمنع تهيئة الصفحة الرئيسية');
        return;
    }
    initMainPage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}

// ============================================================
//  تصدير العناصر الأساسية (مع إضافة الدوال الجديدة)
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
    arrayRemove,
    runTransaction,
    escapeHTML,
    uploadImageToImgBB,
    toggleDarkMode,
    loadDarkModePreference
};
