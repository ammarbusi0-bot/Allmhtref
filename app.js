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

// ===== أدوات مساعدة =====
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// ===== دالة رفع الصور =====
export async function uploadImageToImgBB(fileOrInput) {
    let file = null;
    if (fileOrInput instanceof File) file = fileOrInput;
    else if (fileOrInput && fileOrInput.files && fileOrInput.files[0]) file = fileOrInput.files[0];
    else return '';

    try {
        const formDataImg = new FormData();
        formDataImg.append('image', file);
        const myKey = "42b6820dc31a25d977adefc41f83aa70";
        const resImg = await fetch(`https://api.imgbb.com/1/upload?key=${myKey}`, {
            method: 'POST',
            body: formDataImg
        });
        if (resImg.ok) {
            const dataImg = await resImg.json();
            if (dataImg && dataImg.data && dataImg.data.url) return dataImg.data.url;
        }
    } catch (e) {
        console.warn("فشل ImgBB، يتم استخدام Base64...", e);
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                const maxWidth = 300;
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
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve('');
            img.src = reader.result;
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
    });
}

// ===== إدارة المظهر الداكن =====
export function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('alukhowah_dark', isDark ? 'true' : 'false');
    
    document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon').forEach(icon => {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
}

export function loadDarkModePreference() {
    if (localStorage.getItem('alukhowah_dark') === 'true') {
        document.body.classList.add('dark');
        document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon').forEach(icon => {
            icon.className = 'fa-solid fa-sun';
        });
    }
}

// ===== حالة التطبيق =====
let globalProducts = [];
let cart = [];
let isSubmitting = false;
let currentCategory = 'all';
let currentSearch = '';
let currentDeliveryType = 'inside';
let currentDeliveryKm = 1;

// ===== نظام الدعوة والخصم =====
export function getMyReferralCode() {
    let code = localStorage.getItem('myReferralCode');
    if (!code) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        code = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        localStorage.setItem('myReferralCode', code);
    }
    return code;
}

export function getInviteLink() {
    return `${window.location.origin}${window.location.pathname}?ref=${getMyReferralCode()}`;
}

export function shareProduct(platform, productName, productPrice) {
    const code = getMyReferralCode();
    const message = `🛍️ ${productName}\n💰 ${productPrice}\n🎁 كود خصم 10%: ${code}\n📱 ${window.location.href}`;
    const encoded = encodeURIComponent(message);
    
    const links = {
        whatsapp: `https://wa.me/?text=${encoded}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encoded}`,
        instagram: `https://www.instagram.com/`
    };
    
    if (platform === 'instagram') {
        navigator.clipboard.writeText(message).then(() => alert('✅ تم نسخ الرابط، الصقه في انستا'));
    } else {
        window.open(links[platform], '_blank');
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
        
        setTimeout(() => {
            alert('🎉 مرحباً! تم تفعيل كود الخصم 10% على طلبك الأول فوق 100 ليرة');
        }, 500);
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
    if (discount > 0) {
        localStorage.setItem('discountApplied', 'true');
    }
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
            <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على 10% خصم لأول طلب فوق 100 ليرة</p>
        `;
    }
}

export function copyReferralCode() {
    const code = getMyReferralCode();
    navigator.clipboard.writeText(code).then(() => {
        alert('✅ تم نسخ الكود: ' + code);
    });
}

export function shareReferral() {
    const code = getMyReferralCode();
    const message = `🎁 استخدم كود الخصم هذا في متجر ماركت الأخوة واحصل على 10% خصم: ${code}\n📱 ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

export function initReferralSystem() {
    handleReferral();
    showReferralCode();
}

// ===== دالة عرض المنتجات (معدلة) =====
export function displayProducts(items) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (items.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 20px;">لا توجد منتجات متوفرة حالياً.</p>';
        return;
    }
    const favs = getFavorites();
    grid.innerHTML = items.map(p => {
        const isFav = favs.includes(String(p.id));
        const imgUrlStr = String(p.imageUrl || '').trim();
        const isValidUrl = imgUrlStr !== '' && imgUrlStr !== 'null' && imgUrlStr !== 'undefined';
        
        const imageElement = isValidUrl ?
            `<img src="${escapeHTML(imgUrlStr)}" alt="${escapeHTML(p.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="no-img-fallback" style="display:none;"><i class="fa-solid fa-basket-shopping"></i></div>` :
            `<div class="no-img-fallback"><i class="fa-solid fa-basket-shopping"></i></div>`;

        const discount = p.discount ? Number(p.discount) : 0;
        const originalPrice = Number(p.price) || 0;
        const finalPrice = discount > 0 ? originalPrice - (originalPrice * discount / 100) : originalPrice;

        const shareBtns = `
            <div class="share-buttons" style="display:flex;gap:8px;margin:5px 0;justify-content:center;">
                <button onclick="window.shareProduct('whatsapp', '${escapeHTML(p.name)}', '${finalPrice} Lt')" style="background:none;border:none;font-size:18px;cursor:pointer;">
                    <i class="fa-brands fa-whatsapp" style="color:#25D366;"></i>
                </button>
                <button onclick="window.shareProduct('facebook', '${escapeHTML(p.name)}', '${finalPrice} Lt')" style="background:none;border:none;font-size:18px;cursor:pointer;">
                    <i class="fa-brands fa-facebook" style="color:#1877F2;"></i>
                </button>
                <button onclick="window.shareProduct('instagram', '${escapeHTML(p.name)}', '${finalPrice} Lt')" style="background:none;border:none;font-size:18px;cursor:pointer;">
                    <i class="fa-brands fa-instagram" style="color:#E4405F;"></i>
                </button>
            </div>
        `;

        return `
            <div class="product-card">
                ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                <div class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${p.id}')">
                    <i class="fa-solid fa-heart"></i>
                </div>
                <div class="product-img">${imageElement}</div>
                <div class="product-info">
                    <div class="product-title">${escapeHTML(p.name)}</div>
                    <div class="product-price">
                        ${discount > 0 ? `<span class="old-price">${originalPrice} Lt</span>` : ''}
                        ${Math.round(finalPrice)} Lt
                    </div>
                </div>
                ${shareBtns}
                <button class="btn-add-cart" onclick="window.addToCart('${p.id}')">+ أضف للسلة</button>
            </div>
        `;
    }).join('');
}

export function applyFilters() {
    let filtered = globalProducts;
    if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
    if (currentSearch.trim() !== '') filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(currentSearch.toLowerCase()));
    displayProducts(filtered);
}

export function filterByCategory(cat, element) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    currentCategory = cat;
    applyFilters();
}

export function filterBySearch(queryStr) {
    currentSearch = queryStr;
    applyFilters();
}

export function getFavorites() {
    try { return JSON.parse(localStorage.getItem('alukhowah_favs') || '[]'); } catch (e) { return []; }
}

export function toggleFavorite(id) {
    let favs = getFavorites();
    const strId = String(id);
    favs = favs.includes(strId) ? favs.filter(fId => fId !== strId) : [...favs, strId];
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    applyFilters();
}

// ===== إضافة منتج للسلة مع معالجة شحن الألعاب =====
export function addToCart(id) {
    const product = globalProducts.find(p => String(p.id) === String(id));
    if (!product) return;
    
    // إذا كان المنتج من قسم شحن الألعاب - تحويل مباشر للواتساب
    if (product.category === 'شحن ألعاب') {
        redirectToWhatsApp(product);
        return;
    }
    
    // المنتجات العادية تضاف للسلة
    const idx = cart.findIndex(item => String(item.id) === String(id));
    if (idx > -1) {
        cart[idx].qty += 1;
    } else {
        const discount = product.discount ? Number(product.discount) : 0;
        const basePrice = Number(product.price) || 0;
        const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
        cart.push({ ...product, price: finalPrice, discount, qty: 1 });
    }
    updateCartBadge();
}

// ===== تحويل شحن الألعاب إلى واتساب مع رقم عشوائي =====
function redirectToWhatsApp(product) {
    const numbers = ['905511455598', '905385844122', '905511591245'];
    const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
    
    const discount = product.discount ? Number(product.discount) : 0;
    const basePrice = Number(product.price) || 0;
    const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
    
    const message = `مرحباً، أريد شراء: ${product.name}\nالسعر: ${finalPrice} ل.س\nالرجاء إرسال تفاصيل الدفع`;
    
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
    
    // رسالة تأكيد للمستخدم
    alert('✅ تم تحويلك إلى واتساب لإتمام عملية شحن اللعبة');
}

export function changeQty(id, delta) {
    const idx = cart.findIndex(item => String(item.id) === String(id));
    if (idx > -1) {
        cart[idx].qty += delta;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
    }
    updateCartBadge();
    renderCartItems();
}

export function removeFromCart(id) {
    cart = cart.filter(item => String(item.id) !== String(id));
    updateCartBadge();
    renderCartItems();
}

export function updateCartBadge() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.innerText = totalCount;
}

// ===== حساب الإجمالي مع الخصم الذكي والتوصيل والخصم الترويجي =====
function calculateFinalTotal() {
    const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // خصم ذكي
    let smartDiscountPercent = 0;
    if (itemsTotal >= 1000) smartDiscountPercent = 10;
    else if (itemsTotal >= 500) smartDiscountPercent = 5;
    
    const smartDiscountAmount = itemsTotal * (smartDiscountPercent / 100);
    let discountedItemsTotal = itemsTotal - smartDiscountAmount;
    
    // خصم الدعوة (يضاف للخصم الذكي)
    const referralDiscount = getReferralDiscount(discountedItemsTotal);
    discountedItemsTotal -= referralDiscount;
    
    // تكلفة التوصيل
    let deliveryCost = 0;
    if (currentDeliveryType === 'inside') {
        deliveryCost = 100;
    } else {
        deliveryCost = (currentDeliveryKm || 1) * 35;
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

// ===== تحديث التوصيل =====
export function updateDelivery() {
    const typeEl = document.getElementById('deliveryType');
    const kmContainer = document.getElementById('kmInputContainer');
    
    if (typeEl) {
        currentDeliveryType = typeEl.value;
        if (kmContainer) kmContainer.style.display = currentDeliveryType === 'outside' ? 'block' : 'none';
    }
    
    const kmEl = document.getElementById('deliveryKm');
    if (kmEl) currentDeliveryKm = Number(kmEl.value) || 1;
    
    renderCartItems();
}

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
    
    let total = 0;
    container.innerHTML = cart.map((item) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div>
                    <strong>${escapeHTML(item.name)}</strong>
                    <div style="font-size:12px; color:#666;">${item.price} Lt × ${item.qty}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button>
                    <span style="font-weight:bold;">${item.qty}</span>
                    <button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button>
                    <span style="font-weight:bold; color:var(--primary);">${itemTotal} Lt</span>
                    <i class="fa-solid fa-trash" style="color:red; cursor:pointer;" onclick="window.removeFromCart('${item.id}')"></i>
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
            ${calc.referralDiscount > 0 ? `<div class="summary-line discount-text"><span>🎁 خصم الدعوة (10%):</span><span>-${Math.round(calc.referralDiscount)} Lt</span></div>` : ''}
            <div class="summary-line"><span>🚚 التوصيل (${currentDeliveryType === 'inside' ? 'داخل عمرانيا' : 'خارج ' + currentDeliveryKm + ' كم'}):</span><span>${calc.deliveryCost} Lt</span></div>
            <div class="summary-line total"><span>💰 الإجمالي النهائي:</span><span>${Math.round(calc.finalTotal)} Lt</span></div>
        `;
        
        const finalTotalInput = document.getElementById('finalTotal');
        if (finalTotalInput) finalTotalInput.value = Math.round(calc.finalTotal);
    }
}

export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (isSubmitting) return;
        if (cart.length === 0) { alert('السلة فارغة!'); return; }
        
        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;
        isSubmitting = true;
        submitBtn.innerText = 'جاري إرسال الطلب...';
        submitBtn.disabled = true;

        const phone = document.getElementById('userPhone')?.value.trim() || '';
        const address = document.getElementById('userAddress')?.value.trim() || '';
        const itemsSummary = cart.map(i => `${i.name} (${i.qty})`).join(' - ');
        const calc = calculateFinalTotal();

        try {
            await addDoc(collection(db, "orders"), {
                phone: String(phone),
                address: String(address),
                items: String(itemsSummary),
                total: Math.round(calc.finalTotal),
                itemsTotal: calc.itemsTotal,
                smartDiscount: Math.round(calc.smartDiscountAmount),
                referralDiscount: Math.round(calc.referralDiscount),
                deliveryCost: calc.deliveryCost,
                deliveryType: currentDeliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${currentDeliveryKm} كم)`,
                date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                createdAt: serverTimestamp()
            });
            
            alert(`✅ تم إرسال طلبك بنجاح!\nالإجمالي: ${Math.round(calc.finalTotal)} Lt\nسيتم التواصل معك عبر: ${phone}`);
            cart = [];
            updateCartBadge();
            renderCartItems();
            toggleCartModal();
            form.reset();
        } catch (error) {
            alert('❌ حدث خطأ أثناء إرسال الطلب: ' + error.message);
        } finally {
            isSubmitting = false;
            submitBtn.innerText = '🚀 تأكيد الطلب';
            submitBtn.disabled = false;
        }
    });
}

// ===== مودال المعلومات =====
export function toggleInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.classList.toggle('open');
}

// ===== تهيئة الصفحة الرئيسية =====
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
                }).catch((err) => console.log("تعذر تشغيل الصوت تلقائياً:", err));
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

    initProductsListener();
    initCheckoutForm();
    initReferralSystem();

    // ربط الدوال بالنافذة العامة
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
}

export function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        globalProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFilters();
    }, (error) => {
        console.error("خطأ جلب المنتجات:", error);
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:red;">تعذر تحميل المنتجات.</p>';
    });
}

export { db, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy, serverTimestamp };
