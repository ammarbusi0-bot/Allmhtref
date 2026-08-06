// ============================================================
//  المتجر الأخوي - النسخة الكاملة والموسعة الأصلية (Ultimate Full Version)
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
    updateDoc,
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

let app = null, db = null;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.error("خطأ في تهيئة فايربيس:", e);
}

// ---------- الحالة العامة للتطبيق (State) ----------
let state = {
    products: [],
    cart: [],
    deliveryType: 'inside',
    deliveryKm: 1,
    isSubmitting: false,
    user: null,
    invitedBy: null,
    isAdminLoggedIn: false,
    activeCategory: 'all',
    searchQuery: ''
};

let lastOrderTime = 0;

// ============================================================
//  أدوات مساعدة ودعم عامة (Utility Functions)
// ============================================================
export function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[tag] || tag);
}

export function validatePhone(phone) {
    if (!phone) return false;
    return /^[0-9+]{7,15}$/.test(phone.replace(/[^0-9+]/g, ''));
}

export function validateAddress(address) {
    return address && address.trim().length >= 5;
}

export function showToast(message, type = 'info', duration = 3500) {
    try {
        const toast = document.getElementById('customToast');
        const toastMsg = document.getElementById('toastMessage');
        if (!toast || !toastMsg) {
            console.log("Toast:", message);
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

export function closeWelcomeOverlay() {
    try {
        const welcomeOverlay = document.getElementById('welcomeOverlay');
        if (welcomeOverlay) {
            welcomeOverlay.style.opacity = '0';
            welcomeOverlay.style.pointerEvents = 'none';
            setTimeout(() => { welcomeOverlay.style.display = 'none'; }, 400);
        }
    } catch (e) {
        console.error("Overlay error:", e);
    }
}

// مؤقت أمان ذاتي لضمان عدم بقاء واجهة الترحيب معلقة نهائياً
setTimeout(closeWelcomeOverlay, 2000);

export function getStock(product) {
    if (!product) return 0;
    if (product.category === 'شحن ألعاب') return Infinity;
    if (product.isAvailable === false || product.available === false || product.inStock === false) return 0;
    if (product.stock !== undefined && product.stock !== null && product.stock !== '') return Number(product.stock);
    return 99;
}

// ============================================================
//  نظام مزامنة وعرض المنتجات (Products UI & Realtime Listener)
// ============================================================
export function initProductsListener() {
    if (!db) return;
    try {
        onSnapshot(collection(db, 'products'), (snapshot) => {
            state.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProductsUI();
            loadCart();
            updateCartBadge();
        }, (error) => {
            console.error("خطأ في جلب المنتجات:", error);
        });
    } catch (e) {
        console.error("Products listener exception:", e);
    }
}

function renderProductsUI() {
    try {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        let filtered = state.products;
        if (state.activeCategory && state.activeCategory !== 'all') {
            filtered = filtered.filter(p => p.category === state.activeCategory);
        }
        if (state.searchQuery && state.searchQuery.trim() !== '') {
            const q = state.searchQuery.toLowerCase();
            filtered = filtered.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q)));
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;padding:20px;">لا توجد منتجات متطابقة مع البحث أو الفئة الحالية.</p>';
            return;
        }

        container.innerHTML = filtered.map(product => {
            const stock = getStock(product);
            const isOutOfStock = stock <= 0;
            const discount = product.discount ? Number(product.discount) : 0;
            const basePrice = Number(product.price) || 0;
            const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;

            return `
                <div class="product-card" style="background:var(--card-bg, #fff); border-radius:12px; padding:15px; box-shadow:0 4px 12px rgba(0,0,0,0.08); position:relative; display:flex; flex-direction:column; justify-content:space-between; transition:transform 0.2s;">
                    ${discount > 0 ? `<span style="position:absolute; top:12px; right:12px; background:#e74c3c; color:#fff; padding:3px 8px; font-size:11px; border-radius:6px; font-weight:bold;">-${discount}%</span>` : ''}
                    <img src="${escapeHTML(product.image || 'https://via.placeholder.com/150')}" alt="${escapeHTML(product.name)}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:12px;" />
                    <div>
                        <span style="font-size:11px; color:#666; background:var(--input-bg, #f0f0f0); padding:2px 6px; border-radius:4px;">${escapeHTML(product.category || 'عام')}</span>
                        <h3 style="font-size:16px; margin:8px 0 5px 0; color:var(--text-color, #333);">${escapeHTML(product.name)}</h3>
                        <p style="font-size:12px; color:#777; margin-bottom:8px; line-height:1.4;">${escapeHTML(product.description || '')}</p>
                    </div>
                    <div>
                        <div style="font-size:15px; color:var(--primary, #28a745); font-weight:bold; margin-bottom:10px;">
                            ${discount > 0 ? `<del style="color:#999; font-size:12px; margin-left:6px; font-weight:normal;">${basePrice} Lt</del>` : ''}
                            ${finalPrice} Lt
                        </div>
                        <button onclick="window.addToCart('${escapeHTML(product.id)}')" class="btn-primary" style="width:100%; padding:9px; border:none; border-radius:8px; background:var(--primary, #28a745); color:#fff; font-weight:bold; cursor:pointer;" ${isOutOfStock ? 'disabled style="background:#ccc; cursor:not-allowed;"' : ''}>
                            ${isOutOfStock ? 'نفدت الكمية 🚫' : 'إضافة للسلة 🛒'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Render products UI error:", e);
    }
}

// ============================================================
//  نظام المستخدمين، تسجيل الدخول، والدعوات (Users & Referrals)
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
            await setDoc(doc(db, 'users', String(userData.phone)), {
                name: userData.name, phone: userData.phone, address: userData.address, updatedAt: serverTimestamp()
            }, { merge: true });
        }
    } catch (e) { console.error('Set user error:', e); }
}

export function logoutUser() {
    localStorage.removeItem('alukhowah_user');
    state.user = null;
    updateUserUI();
    showReferralCode();
    showToast('تم تسجيل الخروج بنجاح', 'info');
}

export function updateUserUI() {
    try {
        const userInfo = document.getElementById('userInfo');
        if (!userInfo) return;
        if (state.user) {
            userInfo.innerHTML = `<span>👤 ${escapeHTML(state.user.name)}</span> <button onclick="window.logoutUser()" class="btn-secondary" style="padding:4px 8px;font-size:12px;margin-right:6px;">خروج</button>`;
        } else {
            userInfo.innerHTML = `<button onclick="window.showLoginModal()" class="btn-primary" style="padding:5px 12px;font-size:12px;">تسجيل الدخول 👤</button>`;
        }
    } catch (e) { console.error("Update user UI error:", e); }
}

export async function showLoginModal() {
    try {
        const phone = prompt('أدخل رقم الهاتف للتحقق:');
        if (!phone || !validatePhone(phone)) {
            showToast('رقم هاتف غير صحيح', 'error');
            return;
        }
        const name = prompt('أدخل اسمك الكريم:') || 'مستخدم';
        const address = prompt('أدخل عنوان التوصيل بالتفصيل:') || '';
        await setUser({ phone, name, address });
        
        const ref = localStorage.getItem('invitedBy');
        if (ref && db) {
            await setDoc(doc(db, 'referralRequests', String(phone)), {
                phone, name, invitedBy: ref, status: 'قيد المعالجة', createdAt: serverTimestamp()
            }, { merge: true });
        }
        showToast(`مرحباً بك يا ${name}`, 'success');
    } catch (e) { console.error("Login modal error:", e); }
}

export function getMyReferralCode() {
    try {
        let code = localStorage.getItem('myReferralCode');
        if (!code) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            localStorage.setItem('myReferralCode', code);
        }
        return code;
    } catch { return 'ALU12345'; }
}

export function handleReferral() {
    try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const myCode = getMyReferralCode();
        if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
            localStorage.setItem('invitedBy', ref);
            state.invitedBy = ref;
            const user = getUser();
            if (user && user.phone && db) {
                setDoc(doc(db, 'referralRequests', String(user.phone)), {
                    phone: user.phone, name: user.name, invitedBy: ref, status: 'قيد المعالجة', createdAt: serverTimestamp()
                }, { merge: true });
            }
            setTimeout(() => showToast('🎉 تم تفعيل كود الدعوة بنجاح وإرساله للإدارة!', 'success', 4000), 1200);
        }
    } catch (e) { console.error("Referral handler error:", e); }
}

export function getReferralDiscount(total) {
    if (total < 100) return 0;
    const user = getUser();
    if (!user || !user.phone) return 0;
    if (localStorage.getItem(`discountApproved_${user.phone}`) !== 'true') return 0;
    return Math.round(total * 0.10);
}

export function showReferralCode() {
    try {
        const container = document.getElementById('referralContainer');
        if (!container) return;
        const user = getUser();
        if (!user || !user.phone) {
            container.innerHTML = `
                <div style="background:var(--input-bg, #f8f9fa);padding:12px;border-radius:8px;text-align:center;border:1px dashed var(--primary, #28a745);">
                    <p style="font-size:12px;color:#d9534f;font-weight:bold;margin-bottom:6px;">🔒 أدخل رقم هاتفك لتفعيل كود الدعوة والخصم</p>
                    <button onclick="window.showLoginModal()" class="btn-primary" style="padding:6px 14px;font-size:12px;">📱 تسجيل الهاتف الآن</button>
                </div>
            `;
            return;
        }
        const code = getMyReferralCode();
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;background:var(--input-bg, #f8f9fa);padding:10px 14px;border-radius:8px;border:1px solid #ddd;">
                <div>
                    <span style="font-weight:bold;font-size:13px;">🎁 كود الدعوة الخاص بك: </span>
                    <strong style="font-size:16px;color:#e74c3c;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #eee;">${escapeHTML(code)}</strong>
                </div>
                <button onclick="navigator.clipboard.writeText('${code}').then(()=>window.showToast('تم نسخ الكود بنجاح!','success'))" class="btn-secondary" style="padding:5px 10px;font-size:12px;">📋 نسخ الرابط أو الكود</button>
            </div>
        `;
    } catch (e) { console.error("Show referral code error:", e); }
}

// ============================================================
//  لوحة التحكم الإدارية المتكاملة (Admin Dashboard System)
// ============================================================
export function openAdminDashboard() {
    try {
        const pin = prompt('أدخل رمز المرور الخاص بلوحة الإدارة:');
        if (pin !== '123456' && pin !== 'admin123') {
            showToast('❌ رمز المرور غير صحيح!', 'error');
            return;
        }
        state.isAdminLoggedIn = true;
        renderAdminModal();
    } catch (e) {
        showToast('حدث خطأ في فتح لوحة الإدارة', 'error');
    }
}

function renderAdminModal() {
    try {
        let adminModal = document.getElementById('adminModal');
        if (!adminModal) {
            adminModal = document.createElement('div');
            adminModal.id = 'adminModal';
            adminModal.className = 'modal';
            adminModal.innerHTML = `
                <div class="modal-content" style="max-width:950px; width:95%; max-height:92vh; overflow-y:auto; background:var(--bg-color, #fff); padding:25px; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,0.3); position:relative; z-index:9999;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #eee; padding-bottom:12px; margin-bottom:15px;">
                        <h2 style="margin:0; color:var(--text-color,#333);">🛡️ لوحة التحكم الإدارية الشاملة</h2>
                        <button onclick="document.getElementById('adminModal').classList.remove('open')" class="btn-secondary" style="background:#e74c3c; color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-weight:bold;">إغلاق ✕</button>
                    </div>
                    <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                        <button onclick="window.loadAdminSection('requests')" class="btn-primary" style="padding:9px 18px; border-radius:6px;">🎁 طلبات الخصم</button>
                        <button onclick="window.loadAdminSection('orders')" class="btn-primary" style="padding:9px 18px; border-radius:6px;">📦 الطلبات الواردة</button>
                        <button onclick="window.loadAdminSection('products')" class="btn-primary" style="padding:9px 18px; border-radius:6px;">🛍️ إدارة المنتجات والمخزون</button>
                    </div>
                    <div id="adminContent"><p style="text-align:center;color:#666;">جاري التحميل...</p></div>
                </div>
            `;
            document.body.appendChild(adminModal);
        }
        adminModal.classList.add('open');
        window.loadAdminSection('requests');
    } catch (e) { console.error("Render admin modal error:", e); }
}

window.loadAdminSection = async function(section) {
    const content = document.getElementById('adminContent');
    if (!content || !db) return;
    content.innerHTML = '<p style="text-align:center;color:#666;">جاري جلب البيانات من الخادم...</p>';

    try {
        if (section === 'requests') {
            const snap = await getDocs(collection(db, 'referralRequests'));
            let html = '<h3 style="margin-bottom:12px;color:var(--text-color);">🎁 طلبات الخصم المعلقة</h3>';
            if (snap.empty) {
                html += '<p style="color:#666;">لا توجد طلبات خصم معلقة حالياً.</p>';
            } else {
                html += '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; text-align:right;" border="1"><tr style="background:var(--input-bg,#f4f4f4);"><th style="padding:10px;">الاسم</th><th style="padding:10px;">الهاتف</th><th style="padding:10px;">كود الدعوة</th><th style="padding:10px;text-align:center;">إجراء</th></tr>';
                snap.forEach(d => {
                    const data = d.data();
                    html += `<tr><td style="padding:10px;">${escapeHTML(data.name)}</td><td style="padding:10px;">${escapeHTML(data.phone)}</td><td style="padding:10px;">${escapeHTML(data.invitedBy)}</td><td style="padding:10px;text-align:center;"><button onclick="window.approveDiscount('${escapeHTML(data.phone)}')" style="background:#28a745;color:#fff;border:none;padding:6px 12px;border-radius:5px;cursor:pointer;font-weight:bold;">موافقة ✔️</button></td></tr>`;
                });
                html += '</table></div>';
            }
            content.innerHTML = html;
        } else if (section === 'orders') {
            const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
            let html = '<h3 style="margin-bottom:12px;color:var(--text-color);">📦 أحدث طلبات الزبائن</h3>';
            if (snap.empty) {
                html += '<p style="color:#666;">لا توجد طلبات مسجلة حتى الآن.</p>';
            } else {
                html += '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; text-align:right;" border="1"><tr style="background:var(--input-bg,#f4f4f4);"><th style="padding:10px;">العميل</th><th style="padding:10px;">الهاتف</th><th style="padding:10px;">المبلغ النهائي</th><th style="padding:10px;">العنوان</th><th style="padding:10px;">الحالة</th></tr>';
                snap.forEach(d => {
                    const order = d.data();
                    html += `<tr><td style="padding:10px;">${escapeHTML(order.customerName)}</td><td style="padding:10px;">${escapeHTML(order.customerPhone)}</td><td style="padding:10px;font-weight:bold;color:var(--primary);">${order.finalTotal || 0} Lt</td><td style="padding:10px;">${escapeHTML(order.customerAddress)}</td><td style="padding:10px;color:#d9534f;font-weight:bold;">${escapeHTML(order.status || 'قيد المعالجة')}</td></tr>`;
                });
                html += '</table></div>';
            }
            content.innerHTML = html;
        } else if (section === 'products') {
            let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="margin:0;color:var(--text-color);">🛍️ إدارة المنتجات والمخزون</h3><button onclick="window.addNewProductPrompt()" style="background:#007bff;color:#fff;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-weight:bold;">+ إضافة منتج جديد</button></div>';
            html += '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; text-align:right;" border="1"><tr style="background:var(--input-bg,#f4f4f4);"><th style="padding:10px;">الاسم</th><th style="padding:10px;">الفئة</th><th style="padding:10px;">السعر الأساسي</th><th style="padding:10px;">المخزون</th><th style="padding:10px;text-align:center;">إجراء</th></tr>';
            state.products.forEach(p => {
                html += `<tr><td style="padding:10px;">${escapeHTML(p.name)}</td><td style="padding:10px;">${escapeHTML(p.category || 'عام')}</td><td style="padding:10px;">${p.price} Lt</td><td style="padding:10px;font-weight:bold;">${getStock(p)}</td><td style="padding:10px;text-align:center;"><button onclick="window.deleteAdminProduct('${escapeHTML(p.id)}')" style="background:#e74c3c;color:#fff;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">حذف 🗑️</button></td></tr>`;
            });
            html += '</table></div>';
            content.innerHTML = html;
        }
    } catch (e) {
        console.error("Admin section load error:", e);
        content.innerHTML = '<p style="color:red;text-align:center;">حدث خطأ أثناء تحميل محتوى لوحة الإدارة.</p>';
    }
}

export async function approveDiscount(phone) {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'referralRequests', String(phone)), { status: 'تمت الموافقة' });
        localStorage.setItem(`discountApproved_${phone}`, 'true');
        showToast('✅ تمت الموافقة على الخصم بنجاح', 'success');
        window.loadAdminSection('requests');
    } catch (e) { showToast('❌ فشل اعتماد الخصم', 'error'); }
}

window.addNewProductPrompt = async function() {
    const name = prompt('اسم المنتج الجديد:');
    if (!name) return;
    const price = Number(prompt('سعر المنتج (Lt):'));
    const stock = Number(prompt('الكمية المتاحة في المخزون:'));
    const category = prompt('الفئة (مثال: عطور، إلكترونيات، شحن ألعاب):') || 'عام';
    const image = prompt('رابط صورة المنتج (URL):') || 'https://via.placeholder.com/150';
    const description = prompt('وصف قصير للمنتج:') || '';
    const discount = Number(prompt('نسبة الخصم إن وجدت (مثال: 10 أو 0):') || 0);
    try {
        await addDoc(collection(db, 'products'), { name, price, stock, category, image, description, discount, createdAt: serverTimestamp() });
        showToast('✅ تم إضافة المنتج بنجاح', 'success');
        window.loadAdminSection('products');
    } catch (e) { showToast('❌ فشل إضافة المنتج', 'error'); }
}

window.deleteAdminProduct = async function(id) {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟')) return;
    try {
        await deleteDoc(doc(db, 'products', String(id)));
        showToast('تم حذف المنتج بنجاح', 'info');
        window.loadAdminSection('products');
    } catch (e) { showToast('❌ فشل حذف المنتج', 'error'); }
}

// ============================================================
//  إدارة السلة وحسابات المشتريات المتقدمة (Cart & Checkout Engine)
// ============================================================
function loadCart() {
    try {
        const saved = localStorage.getItem('alukhowah_cart');
        if (saved) {
            const raw = JSON.parse(saved);
            state.cart = raw.map(item => {
                const product = state.products.find(p => String(p.id) === String(item.id));
                if (!product) return null;
                const stock = getStock(product);
                if (stock <= 0) return null;
                const discount = product.discount ? Number(product.discount) : 0;
                const basePrice = Number(product.price) || 0;
                const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
                let qty = Math.max(1, Math.min(Number(item.qty) || 1, stock));
                return { ...item, name: product.name, price: finalPrice, qty };
            }).filter(Boolean);
            saveCart();
        }
    } catch (e) { state.cart = []; }
}

function saveCart() {
    try { localStorage.setItem('alukhowah_cart', JSON.stringify(state.cart)); } catch (e) {}
}

export function addToCart(id) {
    try {
        const product = state.products.find(p => String(p.id) === String(id));
        if (!product) { showToast('المنتج غير متوفر', 'error'); return; }

        if (product.category === 'شحن ألعاب') {
            const numbers = ['905511455598', '905385844122', '905511591245'];
            const num = numbers[Math.floor(Math.random() * numbers.length)];
            window.open(`https://wa.me/${num}?text=${encodeURIComponent('مرحباً، أريد شراء شحنة: ' + product.name)}`, '_blank');
            return;
        }

        const stock = getStock(product);
        if (stock <= 0) { showToast('❌ عذراً، نفذ هذا المنتج من المخزون', 'error'); return; }

        const idx = state.cart.findIndex(item => String(item.id) === String(id));
        const currentQty = idx > -1 ? state.cart[idx].qty : 0;
        if (currentQty >= stock) { showToast(`⚠️ عذراً، أقصى كمية متوفرة هي (${stock}) فقط`, 'error'); return; }

        const discount = product.discount ? Number(product.discount) : 0;
        const basePrice = Number(product.price) || 0;
        const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;

        if (idx > -1) {
            state.cart[idx].qty += 1;
        } else {
            state.cart.push({ id: product.id, name: product.name, price: finalPrice, qty: 1 });
        }
        saveCart();
        updateCartBadge();
        showToast('✅ تمت إضافة المنتج إلى سلة المشتريات', 'success');
    } catch (e) { console.error("Add to cart error:", e); }
}

export function changeQty(id, delta) {
    try {
        const idx = state.cart.findIndex(item => String(item.id) === String(id));
        if (idx === -1) return;
        const product = state.products.find(p => String(p.id) === String(id));
        if (!product) { state.cart.splice(idx, 1); saveCart(); updateCartBadge(); renderCartItems(); return; }

        const stock = getStock(product);
        const newQty = state.cart[idx].qty + delta;
        if (newQty < 1) {
            state.cart.splice(idx, 1);
        } else if (delta > 0 && newQty > stock) {
            showToast(`⚠️ أقصى كمية مسموحة هي ${stock}`, 'error');
            return;
        } else {
            state.cart[idx].qty = newQty;
        }
        saveCart();
        updateCartBadge();
        renderCartItems();
    } catch (e) { console.error("Change quantity error:", e); }
}

export function removeFromCart(id) {
    state.cart = state.cart.filter(item => String(item.id) !== String(id));
    saveCart();
    updateCartBadge();
    renderCartItems();
    showToast('تمت إزالة المنتج من السلة', 'info');
}

export function updateCartBadge() {
    try {
        const total = state.cart.reduce((sum, item) => sum + item.qty, 0);
        const badge = document.getElementById('cartCount');
        if (badge) badge.innerText = total;
    } catch (e) {}
}

function calculateFinalTotal() {
    try {
        const itemsTotal = state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
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
            const km = Math.max(1, Number(state.deliveryKm) || 1);
            deliveryCost = km * 35;
        }

        const finalTotal = discountedItemsTotal + deliveryCost;
        return { itemsTotal, smartDiscountPercent, smartDiscountAmount, referralDiscount, deliveryCost, finalTotal };
    } catch (e) {
        return { itemsTotal: 0, smartDiscountPercent: 0, smartDiscountAmount: 0, referralDiscount: 0, deliveryCost: 0, finalTotal: 0 };
    }
}

export function toggleCartModal() {
    try {
        const modal = document.getElementById('cartModal');
        if (modal) {
            modal.classList.toggle('open');
            if (modal.classList.contains('open')) {
                updateDelivery();
                renderCartItems();
            }
        }
    } catch (e) {}
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
        if (kmEl) state.deliveryKm = Math.max(1, Number(kmEl.value) || 1);
        renderCartItems();
    } catch (e) {}
}

export function renderCartItems() {
    try {
        const container = document.getElementById('cartItemsContainer');
        const summaryDiv = document.getElementById('cartSummary');
        if (!container) return;

        if (state.cart.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">سلة المشتريات فارغة حالياً.</p>';
            if (summaryDiv) summaryDiv.style.display = 'none';
            return;
        }

        container.innerHTML = state.cart.map(item => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div>
                    <strong style="font-size:14px;color:var(--text-color);">${escapeHTML(item.name)}</strong>
                    <div style="font-size:12px;color:#666;margin-top:2px;">${item.price} Lt × ${item.qty}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button onclick="window.changeQty('${escapeHTML(item.id)}', -1)" style="padding:2px 8px;cursor:pointer;">-</button>
                    <span style="font-weight:bold;min-width:20px;text-align:center;">${item.qty}</span>
                    <button onclick="window.changeQty('${escapeHTML(item.id)}', 1)" style="padding:2px 8px;cursor:pointer;">+</button>
                    <span style="color:var(--primary,#28a745);font-weight:bold;margin-right:8px;min-width:60px;text-align:left;">${item.price * item.qty} Lt</span>
                    <span style="color:#e74c3c;cursor:pointer;margin-right:6px;" onclick="window.removeFromCart('${escapeHTML(item.id)}')">🗑️</span>
                </div>
            </div>
        `).join('');

        if (summaryDiv) {
            summaryDiv.style.display = 'block';
            const calc = calculateFinalTotal();
            summaryDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;"><span>المجموع الفرعي:</span><span>${calc.itemsTotal} Lt</span></div>
                ${calc.smartDiscountPercent > 0 ? `<div style="display:flex; justify-content:space-between; color:#e74c3c; margin-bottom:6px; font-size:13px;"><span>🎉 خصم الكمية الذكي (${calc.smartDiscountPercent}%):</span><span>-${calc.smartDiscountAmount} Lt</span></div>` : ''}
                ${calc.referralDiscount > 0 ? `<div style="display:flex; justify-content:space-between; color:#e74c3c; margin-bottom:6px; font-size:13px;"><span>🎁 خصم كود الدعوة (10%):</span><span>-${calc.referralDiscount} Lt</span></div>` : ''}
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;"><span>🚚 تكلفة التوصيل:</span><span>${calc.deliveryCost} Lt</span></div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:16px; margin-top:10px; border-top:2px solid #ddd; padding-top:8px; color:var(--text-color);"><span>الإجمالي النهائي للدفع:</span><span style="color:var(--primary);">${calc.finalTotal} Lt</span></div>
            `;
        }
    } catch (e) { console.error("Render cart items error:", e); }
}

export function initCheckoutForm() {
    try {
        const form = document.getElementById('checkoutForm');
        if (!form) return;

        const kmEl = document.getElementById('deliveryKm');
        if (kmEl) kmEl.addEventListener('input', updateDelivery);

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const now = Date.now();
            if (now - lastOrderTime < 5000) {
                showToast('⚠️ يرجى الانتظار قليلاً قبل إرسال طلب جديد.', 'error');
                return;
            }
            if (state.cart.length === 0) { showToast('سلة المشتريات فارغة', 'error'); return; }

            const phone = document.getElementById('userPhone')?.value.trim() || '';
            const address = document.getElementById('userAddress')?.value.trim() || '';
            const name = document.getElementById('userName')?.value.trim() || getUser()?.name || 'مستخدم';

            if (!validatePhone(phone) || !validateAddress(address)) {
                showToast('تأكد من صحة رقم الهاتف والعنوان (العنوان 5 أحرف على الأقل)', 'error');
                return;
            }

            try {
                const calc = calculateFinalTotal();
                const orderData = {
                    customerName: name,
                    customerPhone: phone,
                    customerAddress: address,
                    items: state.cart,
                    finalTotal: calc.finalTotal,
                    deliveryType: state.deliveryType,
                    deliveryCost: calc.deliveryCost,
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
                                    throw new Error(`عذراً، الكمية غير متوفرة حالياً للمنتج: ${item.name}`);
                                }
                                if (productDoc.data().category !== 'شحن ألعاب') {
                                    transaction.update(productRef, { stock: currentStock - item.qty });
                                }
                            }
                        }
                        transaction.set(doc(collection(db, 'orders')), orderData);
                    });
                }

                await setUser({ phone, name, address });
                state.cart = [];
                saveCart();
                updateCartBadge();
                toggleCartModal();
                lastOrderTime = Date.now();
                showToast('🎉 تم إرسال طلبك بنجاح تام!', 'success', 6000);
                form.reset();
            } catch (err) {
                showToast('❌ خطأ أثناء إرسال الطلب: ' + (err.message || ''), 'error');
            }
        });
    } catch (e) { console.error("Checkout form init error:", e); }
}

// ============================================================
//  ربط الدوال بالنطاق العام (Global Window Scope Bindings)
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
window.handleReferral = handleReferral;
window.showReferralCode = showReferralCode;
window.openAdminDashboard = openAdminDashboard;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.updateCartBadge = updateCartBadge;
window.toggleCartModal = toggleCartModal;
window.renderCartItems = renderCartItems;
window.updateDelivery = updateDelivery;
window.initCheckoutForm = initCheckoutForm;

// ============================================================
//  التهيئة العامة الشاملة عند اكتمال التحميل (DOM Content Loaded)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        initProductsListener();
        handleReferral();
        loadCart();
        updateUserUI();
        showReferralCode();
        initCheckoutForm();
        updateCartBadge();
        console.log("تم تحميل المتجر الأخوي بنجاح وبشكل كامل وآمن.");
    } catch (e) {
        console.error("خطأ في التهيئة الرئيسية للصفحة:", e);
    }
});
