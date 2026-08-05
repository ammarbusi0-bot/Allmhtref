// ============================================================
//  المتجر الأخوي - النسخة الأسطورية الشاملة والآمنة (Pro Max Ultimate - Fully Fixed)
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
    setDoc,
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

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

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
    lastDoc: null,
    hasMore: true,
    isLoading: false,
    pageSize: 20,
    referralCode: '',
    discountApplied: false,
    invitedBy: null,
    isAdminLoggedIn: false
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
    try {
        const toast = document.getElementById('customToast');
        const toastMsg = document.getElementById('toastMessage');
        if (!toast || !toastMsg) {
            console.log(message);
            return;
        }
        toastMsg.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'flex';
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, duration);
    } catch (e) {
        console.error("Toast error:", e);
    }
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
    try {
        const welcomeOverlay = document.getElementById('welcomeOverlay');
        if (welcomeOverlay) {
            welcomeOverlay.style.opacity = '0';
            welcomeOverlay.style.pointerEvents = 'none';
            setTimeout(() => {
                welcomeOverlay.style.display = 'none';
            }, 300);
        }
    } catch (e) {
        console.error("Error closing welcome overlay:", e);
    }
}

// ============================================================
//  نظام المستخدمين ومزامنة Firestore
// ============================================================
export function getUser() {
    try {
        const data = localStorage.getItem('alukhowah_user');
        return data ? JSON.parse(data) : null;
    } catch { return null; }
}

export async function setUser(userData) {
    try {
        localStorage.setItem('alukhowah_user', JSON.stringify(userData));
        state.user = userData;
        updateUserUI();
        showReferralCode();

        if (db) {
            const userRef = doc(db, 'users', String(userData.phone));
            await setDoc(userRef, {
                name: userData.name,
                phone: userData.phone,
                address: userData.address,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
    } catch (e) {
        console.error('Error saving user:', e);
    }
}

export function logoutUser() {
    try {
        localStorage.removeItem('alukhowah_user');
        state.user = null;
        updateUserUI();
        showReferralCode();
        showToast('تم تسجيل الخروج', 'info');
    } catch (e) {
        console.error("Logout error:", e);
    }
}

export function updateUserUI() {
    try {
        const userInfo = document.getElementById('userInfo');
        if (!userInfo) return;
        if (state.user) {
            userInfo.innerHTML = `
                <span>👤 ${escapeHTML(state.user.name || 'مستخدم')}</span>
                <button onclick="window.logoutUser()" class="btn-secondary">خروج</button>
            `;
        } else {
            userInfo.innerHTML = '';
        }
    } catch (e) {
        console.error("Update user UI error:", e);
    }
}

export async function showLoginModal() {
    try {
        const phone = prompt('أدخل رقم الهاتف:');
        if (!phone || !validatePhone(phone)) {
            showToast('رقم هاتف غير صحيح', 'error');
            return;
        }
        const name = prompt('أدخل اسمك:') || 'مستخدم';
        const address = prompt('أدخل عنوانك:') || '';
        
        await setUser({ phone, name, address, orders: [] });
        
        const ref = localStorage.getItem('invitedBy');
        if (ref && db) {
            await submitReferralRequestToFirestore(phone, name, ref);
        }

        showToast(`مرحباً ${name}`, 'success');
    } catch (e) {
        console.error("Login modal error:", e);
    }
}

// ============================================================
//  نظام الدعوة والخصم (مرتبط بـ Firestore للإدارة)
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
        return 'ALU12345';
    }
}

export function getInviteLink() {
    return `${window.location.origin}${window.location.pathname}?ref=${getMyReferralCode()}`;
}

export async function handleReferral() {
    try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const myCode = getMyReferralCode();
        
        if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
            localStorage.setItem('invitedBy', ref);
            state.invitedBy = ref;
            
            const user = getUser();
            if (user && user.phone && db) {
                await submitReferralRequestToFirestore(user.phone, user.name, ref);
            }

            setTimeout(() => {
                showToast('🎉 تم تفعيل كود الدعوة وإرساله للإدارة للتحقق!', 'success', 5000);
            }, 500);
        }
    } catch (e) {
        console.error("Handle referral error:", e);
    }
}

async function submitReferralRequestToFirestore(phone, name, refCode) {
    if (!db) return;
    try {
        const reqRef = doc(db, 'referralRequests', String(phone));
        await setDoc(reqRef, {
            phone: phone,
            name: name,
            invitedBy: refCode,
            status: 'قيد المعالجة',
            createdAt: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        console.error('Error submitting referral request:', e);
    }
}

export function getReferralDiscount(total) {
    if (total < 100) return 0;
    const user = getUser();
    if (!user || !user.phone) return 0;
    
    const phoneKey = `discountApproved_${user.phone}`;
    if (localStorage.getItem(phoneKey) !== 'true') return 0;
    
    return Math.round(total * 0.10);
}

export function showReferralCode() {
    try {
        const container = document.getElementById('referralContainer');
        if (!container) return;

        const user = getUser();
        if (!user || !user.phone) {
            container.innerHTML = `
                <div style="background:var(--input-bg, #f8f9fa);padding:10px;border-radius:8px;text-align:center;border:1px dashed var(--primary, #28a745);">
                    <p style="font-size:12px;color:#d9534f;font-weight:bold;margin-bottom:6px;">🔒 أدخل رقم هاتفك لتفعيل خصم الدعوة</p>
                    <button onclick="window.showLoginModal()" class="btn-primary" style="padding:5px 12px;font-size:12px;">📱 أدخل رقم الهاتف</button>
                </div>
            `;
            return;
        }

        const code = getMyReferralCode();
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <span style="font-weight:bold;">🎁 كود الخصم: </span>
                    <strong style="font-size:18px;color:#ff6b6b;letter-spacing:2px;background:var(--input-bg, #eee);padding:4px 10px;border-radius:6px;">${escapeHTML(code)}</strong>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="window.copyReferralCode()" class="btn-secondary">📋 نسخ</button>
                    <button onclick="window.shareReferral()" class="btn-primary">📱 مشاركة</button>
                </div>
            </div>
            <p style="font-size:11px;color:#888;margin-top:4px;">شارك الكود واحصل على خصم 10% (يخضع لموافقة الإدارة)</p>
        `;
    } catch (e) {
        console.error("Show referral code error:", e);
    }
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
//  نظام لوحة الإدارة (Admin Dashboard)
// ============================================================
export function openAdminDashboard() {
    const pin = prompt('أدخل رمز المرور الخاص بالإدارة:');
    if (pin !== '123456' && pin !== 'admin123') {
        showToast('❌ رمز المرور غير صحيح', 'error');
        return;
    }
    state.isAdminLoggedIn = true;
    renderAdminModal();
}

function renderAdminModal() {
    let adminModal = document.getElementById('adminModal');
    if (!adminModal) {
        adminModal = document.createElement('div');
        adminModal.id = 'adminModal';
        adminModal.className = 'modal';
        adminModal.innerHTML = `
            <div class="modal-content" style="max-width:800px; width:95%; max-height:90vh; overflow-y:auto; background:var(--bg-color, #fff); padding:20px; border-radius:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:15px;">
                    <h2>🛡️ لوحة التحكم الإدارية الشاملة</h2>
                    <button onclick="document.getElementById('adminModal').classList.remove('open')" class="btn-secondary">إغلاق ✕</button>
                </div>
                <div id="adminContent">
                    <p>جاري تحميل البيانات...</p>
                </div>
            </div>
        `;
        document.body.appendChild(adminModal);
    }
    adminModal.classList.add('open');
    loadAdminData();
}

async function loadAdminData() {
    const content = document.getElementById('adminContent');
    if (!content) return;

    if (!db) {
        content.innerHTML = '<p style="color:red;">قاعدة البيانات غير متصلة.</p>';
        return;
    }

    try {
        const refSnapshot = await getDocs(collection(db, 'referralRequests'));
        let referralHTML = '<h3>🎁 طلبات الخصم والدعوات</h3>';
        if (refSnapshot.empty) {
            referralHTML += '<p style="color:#777;">لا توجد طلبات خصم حالياً.</p>';
        } else {
            referralHTML += '<table style="width:100%; border-collapse:collapse; margin-bottom:20px;" border="1"><tr><th style="padding:8px;">الاسم</th><th style="padding:8px;">الهاتف</th><th style="padding:8px;">الكود المستخدم</th><th style="padding:8px;">الحالة</th><th style="padding:8px;">إجراء</th></tr>';
            refSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                referralHTML += `
                    <tr>
                        <td style="padding:8px;">${escapeHTML(data.name)}</td>
                        <td style="padding:8px;">${escapeHTML(data.phone)}</td>
                        <td style="padding:8px;">${escapeHTML(data.invitedBy)}</td>
                        <td style="padding:8px;">${escapeHTML(data.status)}</td>
                        <td style="padding:8px; text-align:center;">
                            <button onclick="window.approveDiscount('${escapeHTML(data.phone)}')" class="btn-primary" style="padding:4px 8px; font-size:12px;">موافقة على الخصم</button>
                        </td>
                    </tr>
                `;
            });
            referralHTML += '</table>';
        }

        const ordersSnapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(20)));
        let ordersHTML = '<h3>📦 أحدث الطلبات</h3>';
        if (ordersSnapshot.empty) {
            ordersHTML += '<p style="color:#777;">لا توجد طلبات مسجلة.</p>';
        } else {
            ordersHTML += '<table style="width:100%; border-collapse:collapse;" border="1"><tr><th style="padding:8px;">العميل</th><th style="padding:8px;">الهاتف</th><th style="padding:8px;">الإجمالي</th><th style="padding:8px;">العنوان</th><th style="padding:8px;">الحالة</th></tr>';
            ordersSnapshot.forEach(docSnap => {
                const order = docSnap.data();
                ordersHTML += `
                    <tr>
                        <td style="padding:8px;">${escapeHTML(order.customerName)}</td>
                        <td style="padding:8px;">${escapeHTML(order.customerPhone)}</td>
                        <td style="padding:8px;">${order.finalTotal || 0} Lt</td>
                        <td style="padding:8px;">${escapeHTML(order.customerAddress)}</td>
                        <td style="padding:8px;">${escapeHTML(order.status)}</td>
                    </tr>
                `;
            });
            ordersHTML += '</table>';
        }

        content.innerHTML = referralHTML + '<hr style="margin:20px 0;" />' + ordersHTML;

    } catch (e) {
        console.error('Error loading admin data:', e);
        content.innerHTML = '<p style="color:red;">حدث خطأ أثناء تحميل بيانات الإدارة.</p>';
    }
}

export async function approveDiscount(phone) {
    if (!db) return;
    try {
        const reqRef = doc(db, 'referralRequests', String(phone));
        await updateDoc(reqRef, { status: 'تمت الموافقة' });
        
        localStorage.setItem(`discountApproved_${phone}`, 'true');
        showToast('✅ تمت الموافقة على الخصم بنجاح', 'success');
        loadAdminData();
    } catch (e) {
        console.error('Error approving discount:', e);
        showToast('❌ حدث خطأ أثناء الموافقة', 'error');
    }
}

// ============================================================
//  إدارة السلة
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
    } catch (e) { /* تجاهل */ }
}

export function addToCart(id) {
    try {
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
    } catch (e) {
        console.error("Add to cart error:", e);
    }
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
    try {
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
    } catch (e) {
        console.error("Change qty error:", e);
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
    try {
        const total = state.cart.reduce((sum, item) => sum + item.qty, 0);
        const badge = document.getElementById('cartCount');
        if (badge) badge.innerText = total;
    } catch (e) {
        console.error("Update cart badge error:", e);
    }
}

// ============================================================
//  حساب الإجمالي النهائي
// ============================================================
function calculateFinalTotal() {
    try {
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
    } catch (e) {
        console.error("Calculate final total error:", e);
        return { itemsTotal: 0, smartDiscountPercent: 0, smartDiscountAmount: 0, referralDiscount: 0, discountedItemsTotal: 0, deliveryCost: 0, finalTotal: 0 };
    }
}

// ============================================================
//  عرض السلة
// ============================================================
export function toggleCartModal() {
    try {
        const modal = document.getElementById('cartModal');
        if (!modal) return;
        modal.classList.toggle('open');
        if (modal.classList.contains('open')) {
            updateDelivery();
            renderCartItems();
        }
    } catch (e) {
        console.error("Toggle cart modal error:", e);
    }
}

export function renderCartItems() {
    try {
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
    } catch (e) {
        console.error("Render cart items error:", e);
    }
}

export function updateDelivery() {
    try {
        const typeEl = document.getElementById('deliveryType');
        const kmContainer = document.getElementById('kmInputContainer');
        if (typeEl) {
            state.deliveryType = typeEl.value;
            if (kmContainer) kmContainer.style.display = state.deliveryType === 'outside' ? 'block' : 'none';
        }
        const kmEl = document.getElementById('deliveryKm');
        if (kmEl) state.deliveryKm = Math.max(1, Math.floor(Math.abs(Number(kmEl.value) || 1)));
        renderCartItems();
    } catch (e) {
        console.error("Update delivery error:", e);
    }
}

// ============================================================
//  إرسال الطلب (معالجة كاملة وآمنة)
// ============================================================
export function initCheckoutForm() {
    try {
        const form = document.getElementById('checkoutForm');
        if (!form) return;

        const kmEl = document.getElementById('deliveryKm');
        if (kmEl) {
            kmEl.addEventListener('input', updateDelivery);
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
            const phone = document.getElementById('userPhone')?.value.trim() || '';
            const address = document.getElementById('userAddress')?.value.trim() || '';
            const name = document.getElementById('userName')?.value.trim() || getUser()?.name || 'مستخدم';

            if (!validatePhone(phone)) {
                showToast('⚠️ رقم الهاتف غير صحيح', 'error');
                return;
            }
            if (!validateAddress(address)) {
                showToast('⚠️ العنوان يجب أن يكون 5 أحرف على الأقل', 'error');
                return;
            }

            state.isSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'جاري إرسال الطلب...';
            }

            try {
                const calc = calculateFinalTotal();
                const orderData = {
                    customerName: name,
                    customerPhone: phone,
                    customerAddress: address,
                    items: state.cart.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        qty: item.qty
                    })),
                    itemsTotal: calc.itemsTotal,
                    smartDiscount: calc.smartDiscountAmount,
                    referralDiscount: calc.referralDiscount,
                    deliveryCost: calc.deliveryCost,
                    finalTotal: calc.finalTotal,
                    deliveryType: state.deliveryType,
                    deliveryKm: state.deliveryKm,
                    status: 'قيد المعالجة',
                    createdAt: serverTimestamp()
                };

                if (db) {
                    await runTransaction(db, async (transaction) => {
                        for (const item of state.cart) {
                            const productRef = doc(db, 'products', String(item.id));
                            const productDoc = await transaction.get(productRef);
                            if (productDoc.exists()) {
                                const currentStock = getStock(productDoc.data());
                                if (currentStock < item.qty) {
                                    throw new Error(`الكمية المطلوبة للمنتج ${item.name} غير متوفرة حالياً في المخزون.`);
                                }
                                if (productDoc.data().category !== 'شحن ألعاب') {
                                    transaction.update(productRef, { stock: currentStock - item.qty });
                                }
                            }
                        }
                        const orderRef = collection(db, 'orders');
                        transaction.set(doc(orderRef), orderData);
                    });
                }

                await setUser({ phone, name, address, orders: [] });

                state.cart = [];
                saveCart();
                updateCartBadge();
                toggleCartModal();

                lastOrderTime = Date.now();
                showToast('🎉 تم إرسال طلبك بنجاح!', 'success', 5000);
                form.reset();

            } catch (error) {
                console.error('Checkout error:', error);
                showToast('❌ حدث خطأ أثناء إرسال الطلب: ' + (error.message || 'حاول مرة أخرى'), 'error');
            } finally {
                state.isSubmitting = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'إرسال الطلب الآن';
                }
            }
        });
    } catch (e) {
        console.error("Init checkout form error:", e);
    }
}

// ============================================================
//  ربط الدوال بالنطاق العام (Window) لضمان عمل الأزرار وتجنب التعليق
// ============================================================
window.escapeHTML = escapeHTML;
window.validatePhone = validatePhone;
window.validateAddress = validateAddress;
window.showToast = showToast;
window.getStock = getStock;
window.closeWelcomeOverlay = closeWelcomeOverlay;
window.getUser = getUser;
window.setUser = setUser;
window.logoutUser = logoutUser;
window.showLoginModal = showLoginModal;
window.getMyReferralCode = getMyReferralCode;
window.getInviteLink = getInviteLink;
window.handleReferral = handleReferral;
window.getReferralDiscount = getReferralDiscount;
window.showReferralCode = showReferralCode;
window.copyReferralCode = copyReferralCode;
window.shareReferral = shareReferral;
window.openAdminDashboard = openAdminDashboard;
window.approveDiscount = approveDiscount;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.updateCartBadge = updateCartBadge;
window.toggleCartModal = toggleCartModal;
window.renderCartItems = renderCartItems;
window.updateDelivery = updateDelivery;
window.initCheckoutForm = initCheckoutForm;

// ============================================================
//  تهيئة التطبيق عند اكتمال تحميل الصفحة (مع حماية ضد التعليق)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        handleReferral();
        loadCart();
        updateUserUI();
        showReferralCode();
        initCheckoutForm();
        updateCartBadge();

        const welcomeOverlay = document.getElementById('welcomeOverlay');
        if (welcomeOverlay) {
            welcomeOverlay.addEventListener('click', (e) => {
                if (e.target.id === 'welcomeOverlay' || e.target.classList.contains('close-welcome')) {
                    closeWelcomeOverlay();
                }
            });
            // إغلاق تلقائي احتياطي بعد 6 ثوانٍ إن حدثت أي مشكلة بالنقر
            setTimeout(() => {
                closeWelcomeOverlay();
            }, 6000);
        }
    } catch (e) {
        console.error("DOMContentLoaded initialization error:", e);
        closeWelcomeOverlay(); // إغلاق شاشة الترحيب بالقوة لمنع تعليق المستخدم
    }
});
