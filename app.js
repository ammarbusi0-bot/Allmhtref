// ============================================================
//  المتجر الأخوي - النسخة الأسطورية المُهندسة والمثالية (Pro Max Ultimate Refactored)
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
//  الحالة العامة الموحدة (Centralized State)
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
    referralCode: '',
    discountApplied: false,
    invitedBy: null,
    referralPoints: {},
    otp: {
        code: null,
        expiry: null,
        isVerified: false
    }
};

// ============================================================
//  أدوات مساعدة محسنة (Utilities)
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
    return /^(\+90|0?)(5[0-9]{9})$/.test(cleaned) && cleaned.length >= 10;
}

export function validateAddress(address) {
    return address && address.trim().length >= 3;
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

export function getStock(product) {
    if (!product) return 0;
    if (product.category === 'شحن ألعاب') return Infinity;
    const explicitUnavailability = (product.isAvailable === false || product.available === false || product.inStock === false);
    if (explicitUnavailability) return 0;
    if (product.stock !== undefined && product.stock !== null && product.stock !== '') return Number(product.stock);
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
//  نظام التحقق بالرمز الآمن (OTP System)
// ============================================================
export function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function sendVerificationCode(phone) {
    if (!validatePhone(phone)) {
        showToast('رقم هاتف تركي غير صحيح (مثال: 05xxxxxxxx)', 'error');
        return false;
    }
    const code = generateVerificationCode();
    state.otp.code = code;
    state.otp.expiry = Date.now() + (5 * 60 * 1000);
    state.otp.isVerified = false;

    console.log(`📨 [OTP Code]: ${code} for phone: ${phone}`);
    showToast(`🔑 رمز التحقق: ${code} (تم عرضه في وحدة التحكم)`, 'success', 6000);
    return true;
}

export function verifyCode(inputCode) {
    if (!inputCode) return false;
    const now = Date.now();
    if (!state.otp.code || !state.otp.expiry) {
        showToast('الرجاء طلب رمز التحقق أولاً', 'error');
        return false;
    }
    if (now > state.otp.expiry) {
        showToast('⏰ انتهت صلاحية الرمز، اطلب رمزاً جديداً', 'error');
        return false;
    }
    if (String(inputCode).trim() === String(state.otp.code)) {
        state.otp.isVerified = true;
        showToast('✅ تم التحقق بنجاح!', 'success');
        return true;
    } else {
        showToast('❌ رمز غير صحيح', 'error');
        return false;
    }
}

// ============================================================
//  نظام الدعوة والخصم (Referral System) - [تم إصلاح الخطأ البرمجي هنا بنجاح]
// ============================================================
export function getMyReferralCode() {
    try {
        let code = localStorage.getItem('myReferralCode');
        if (!code) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            localStorage.setItem('myReferralCode', code);
        }
        return code;
    } catch {
        return 'ALUKHOWAH';
    }
}

export function getInviteLink() {
    return `${window.location.origin}${window.location.pathname}?ref=${getMyReferralCode()}`;
}

export function handleReferral() {
    try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const myCode = getMyReferralCode();
        if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
            localStorage.setItem('invitedBy', ref);
            state.invitedBy = ref;
            setTimeout(() => {
                showToast('🎁 تم تفعيل كود الدعوة! أكمِل بياناتك وتحقق من رقم هاتفك للحصول على الخصم.', 'info', 5000);
            }, 500);
        }
    } catch (e) { console.error(e); }
}

export function getReferralDiscount(total) {
    if (total < 100) return 0;
    if (!localStorage.getItem('invitedBy')) return 0;
    if (localStorage.getItem('discountApplied') === 'true') return 0;
    if (!state.otp.isVerified) return 0;

    if (state.otp.expiry && Date.now() > state.otp.expiry) {
        state.otp.isVerified = false;
        state.otp.code = null;
        state.otp.expiry = null;
        return 0;
    }

    const phone = document.getElementById('userPhone')?.value?.trim() || '';
    if (phone) {
        try {
            const used = JSON.parse(localStorage.getItem('used_discount_phones') || '[]');
            if (used.includes(phone)) {
                return 0;
            }
        } catch { return 0; }
    }
    return Math.round(total * 0.10);
}

// ✅ الدالة المُصححة - تم إزالة استدعاء getReferralDiscount لتجنب التحقق المزدوج
export function applyReferralDiscount(total) {
    if (total < 100) return 0;
    
    try {
        localStorage.setItem('discountApplied', 'true');
        localStorage.setItem('referralUsed', 'true');
        const phone = document.getElementById('userPhone')?.value?.trim() || '';
        if (phone) {
            const used = JSON.parse(localStorage.getItem('used_discount_phones') || '[]');
            if (!used.includes(phone)) {
                used.push(phone);
                localStorage.setItem('used_discount_phones', JSON.stringify(used));
            }
        }
        state.discountApplied = true;
        return Math.round(total * 0.10);
    } catch (e) {
        console.error(e);
        return 0;
    }
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
        <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على خصم 10% لأول طلب بقيمة 100 ل.س أو أكثر (يتطلب التحقق بالرمز)</p>
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
//  إدارة السلة المحسنة (Cart Management)
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
    } catch (e) { state.cart = []; }
}

function saveCart() {
    try {
        localStorage.setItem('alukhowah_cart', JSON.stringify(state.cart));
    } catch (e) {}
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
    let safeDelta = Math.floor(delta);
    const newQty = state.cart[idx].qty + safeDelta;
    if (newQty < 1) {
        state.cart.splice(idx, 1);
    } else if (safeDelta > 0 && newQty > stock) {
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
//  حساب الإجمالي النهائي الذكي (Calculations)
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
//  عرض السلة وتحديث الواجهة
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

export function updateDelivery() {
    const typeEl = document.getElementById('deliveryType');
    const kmContainer = document.getElementById('kmInputContainer');
    if (typeEl) {
        state.deliveryType = typeEl.value;
        if (kmContainer) kmContainer.style.display = state.deliveryType === 'outside' ? 'block' : 'none';
    }
    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) state.deliveryKm = Math.max(1, Math.floor(Math.abs(Number(kmEl.value) || 1)));
    renderCartItems();
}

// ============================================================
//  إرسال الطلب وإدارة النموذج (Checkout Form)
// ============================================================
export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    if (!document.getElementById('dynamicCheckoutFields')) {
        const fieldsContainer = document.createElement('div');
        fieldsContainer.id = 'dynamicCheckoutFields';
        fieldsContainer.style.cssText = 'display:grid;gap:10px;margin-bottom:15px;';
        fieldsContainer.innerHTML = `
            <div><label>الاسم <span style="color:red;">*</span></label><input type="text" id="firstName" placeholder="الاسم الأول" required></div>
            <div><label>الكنية <span style="color:red;">*</span></label><input type="text" id="lastName" placeholder="الكنية" required></div>
            <div><label>الحي <span style="color:red;">*</span></label><input type="text" id="district" placeholder="الحي" required></div>
            <div><label>الشارع <span style="color:red;">*</span></label><input type="text" id="street" placeholder="الشارع" required></div>
            <div><label>رقم المبنى <span style="color:red;">*</span></label><input type="text" id="building" placeholder="رقم المبنى" required></div>
        `;

        const phoneField = form.querySelector('#userPhone')?.closest('div') || form.querySelector('div');
        if (phoneField) {
            form.insertBefore(fieldsContainer, phoneField);
        } else {
            form.prepend(fieldsContainer);
        }
    }

    if (!document.getElementById('dynamicVerifyGroup')) {
        const verifyGroup = document.createElement('div');
        verifyGroup.id = 'dynamicVerifyGroup';
        verifyGroup.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:15px;';
        verifyGroup.innerHTML = `
            <button type="button" id="sendVerifyBtn" class="btn-secondary">📨 إرسال رمز التحقق</button>
            <input type="text" id="verifyCodeInput" placeholder="أدخل الرمز" style="flex:1;min-width:120px;" required>
            <span id="verifyStatus" style="font-size:14px;"></span>
        `;
        const phoneField = form.querySelector('#userPhone')?.closest('div');
        if (phoneField) {
            phoneField.after(verifyGroup);
        } else {
            form.appendChild(verifyGroup);
        }
    }

    const sendBtn = document.getElementById('sendVerifyBtn');
    const verifyInput = document.getElementById('verifyCodeInput');
    const verifyStatus = document.getElementById('verifyStatus');

    if (sendBtn && verifyInput && !sendBtn._hasListener) {
        sendBtn._hasListener = true;
        sendBtn.addEventListener('click', function() {
            const phone = document.getElementById('userPhone')?.value?.trim() || '';
            if (!validatePhone(phone)) {
                showToast('رقم هاتف تركي غير صحيح (مثال: 05xxxxxxxx)', 'error');
                return;
            }
            try {
                const used = JSON.parse(localStorage.getItem('used_discount_phones') || '[]');
                if (used.includes(phone)) {
                    showToast('⚠️ هذا الرقم استخدم الخصم مسبقاً', 'warning');
                    return;
                }
            } catch (e) {}

            if (sendVerificationCode(phone)) {
                verifyStatus.textContent = '✅ تم الإرسال، أدخل الرمز';
                verifyStatus.style.color = 'green';
                verifyInput.disabled = false;
                verifyInput.focus();
            } else {
                verifyStatus.textContent = '❌ فشل الإرسال';
                verifyStatus.style.color = 'red';
            }
        });
    }

    if (verifyInput && !verifyInput._hasListener) {
        verifyInput._hasListener = true;
        verifyInput.addEventListener('input', function() {
            const code = this.value.trim();
            if (code.length === 6) {
                if (verifyCode(code)) {
                    verifyStatus.textContent = '✅ تم التحقق بنجاح!';
                    verifyStatus.style.color = 'green';
                    this.disabled = true;
                    state.otp.isVerified = true;
                    renderCartItems();
                } else {
                    verifyStatus.textContent = '❌ رمز غير صحيح';
                    verifyStatus.style.color = 'red';
                }
            }
        });
    }

    const kmEl = document.getElementById('deliveryKm');
    if (kmEl && !kmEl._hasListener) {
        kmEl._hasListener = true;
        kmEl.addEventListener('input', updateDelivery);
    }

    if (!form._hasSubmitListener) {
        form._hasSubmitListener = true;
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

            const firstName = document.getElementById('firstName')?.value?.trim() || '';
            const lastName = document.getElementById('lastName')?.value?.trim() || '';
            const district = document.getElementById('district')?.value?.trim() || '';
            const street = document.getElementById('street')?.value?.trim() || '';
            const building = document.getElementById('building')?.value?.trim() || '';
            const phone = document.getElementById('userPhone')?.value?.trim() || '';
            const address = document.getElementById('userAddress')?.value?.trim() || '';

            if (!firstName || !lastName || !district || !street || !building) {
                showToast('يرجى ملء جميع الحقول الإضافية بدقة', 'error');
                return;
            }

            if (!validatePhone(phone)) {
                showToast('رقم الهاتف غير صحيح (يجب أن يكون تركياً)', 'error');
                return;
            }

            if (!validateAddress(address)) {
                showToast('العنوان قصير جداً', 'error');
                return;
            }

            const hasInvite = localStorage.getItem('invitedBy') && !localStorage.getItem('discountApplied');
            if (hasInvite && !state.otp.isVerified) {
                showToast('🔐 يجب التحقق من رقم الهاتف أولاً للحصول على الخصم', 'warning');
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

                if (referralDiscount > 0) {
                    applyReferralDiscount(verifiedItemsTotal);
                }

                const orderData = {
                    firstName,
                    lastName,
                    district,
                    street,
                    building,
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
                    userId: phone
                };

                await addDoc(collection(db, "orders"), orderData);

                lastOrderTime = Date.now();
                showToast(`✅ تم إرسال طلبك بنجاح!\nالإجمالي: ${finalTotal} Lt`, 'success', 5000);
                state.cart = [];
                saveCart();
                updateCartBadge();
                renderCartItems();
                toggleCartModal();
                form.reset();

                state.otp.isVerified = false;
                state.otp.code = null;
                state.otp.expiry = null;
                const statusEl = document.getElementById('verifyStatus');
                const inputEl = document.getElementById('verifyCodeInput');
                if (statusEl) statusEl.textContent = '';
                if (inputEl) {
                    inputEl.disabled = false;
                    inputEl.value = '';
                }

            } catch (error) {
                showToast('❌ ' + error.message, 'error', 5000);
            } finally {
                state.isSubmitting = false;
                submitBtn.innerText = '🚀 تأكيد الطلب';
                submitBtn.disabled = false;
            }
        });
    }
}

// ============================================================
//  عرض المنتجات المُحسّن والآمن
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
            badge.className = 'disc
