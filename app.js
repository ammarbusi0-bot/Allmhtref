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
    // إضافات لتحرير الأقسام
    writeBatch,
    getDocs
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

// ========== دوال مساعدة (بدون تغيير) ==========
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

export async function uploadImageToImgBB(fileOrInput) {
    let file = null;
    if (fileOrInput instanceof File) file = fileOrInput;
    else if (fileOrInput?.files?.[0]) file = fileOrInput.files[0];
    else return '';

    try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=42b6820dc31a25d977adefc41f83aa70`, { method: 'POST', body: fd });
        if (res.ok) {
            const data = await res.json();
            if (data?.data?.url) return data.data.url;
        }
    } catch (e) { console.warn("ImgBB failed", e); }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxW = 300;
                let w = img.width, h = img.height;
                if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve('');
            img.src = reader.result;
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
    });
}

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

// ========== إدارة الأقسام من Firebase ==========
const CATEGORIES_COLL = "categories";

export async function addCategoryToFirestore(name) {
    await addDoc(collection(db, CATEGORIES_COLL), {
        name: name.trim(),
        createdAt: serverTimestamp()
    });
}

export async function deleteCategory(id) {
    await deleteDoc(doc(db, CATEGORIES_COLL, id));
}

export function getCategoriesListener(callback) {
    const q = query(collection(db, CATEGORIES_COLL), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snapshot) => {
        const cats = snapshot.docs.map(d => ({ id: d.id, name: d.data().name }));
        callback(cats);
    });
}

// ========== حالة التطبيق (لم تتغير الأساسيات) ==========
let globalProducts = [];
let cart = [];
let isSubmitting = false;
let currentCategory = 'all';
let currentSearch = '';
let currentDeliveryType = 'inside';
let currentDeliveryKm = 1;

export function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        globalProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        applyFilters();
    }, (err) => {
        grid.innerHTML = '<p style="grid-column:1/-1;color:red;">تعذر تحميل المنتجات.</p>';
    });
}

export function displayProducts(items) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    if (!items.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">لا توجد منتجات.</p>';
        return;
    }
    const favs = getFavorites();
    grid.innerHTML = items.map(p => {
        const isFav = favs.includes(String(p.id));
        const imgUrlStr = String(p.imageUrl || '').trim();
        const isValidUrl = imgUrlStr !== '' && imgUrlStr !== 'null' && imgUrlStr !== 'undefined';
        const imageEl = isValidUrl ?
            `<img src="${escapeHTML(imgUrlStr)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="no-img-fallback" style="display:none;"><i class="fa-solid fa-basket-shopping"></i></div>` :
            `<div class="no-img-fallback"><i class="fa-solid fa-basket-shopping"></i></div>`;

        const discount = p.discount ? Number(p.discount) : 0;
        const originalPrice = Number(p.price) || 0;
        const finalPrice = discount > 0 ? originalPrice - (originalPrice * discount / 100) : originalPrice;

        return `
            <div class="product-card">
                ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                <div class="fav-btn ${isFav?'active':''}" onclick="window.toggleFavorite('${p.id}')"><i class="fa-solid fa-heart"></i></div>
                <div class="product-img">${imageEl}</div>
                <div class="product-info">
                    <div class="product-title">${escapeHTML(p.name)}</div>
                    <div class="product-price">
                        ${discount > 0 ? `<span class="old-price">${originalPrice} ل.س</span>` : ''}
                        ${Math.round(finalPrice)} ل.س
                    </div>
                </div>
                <button class="btn-add-cart" onclick="window.addToCart('${p.id}')">+ أضف للسلة</button>
            </div>
        `;
    }).join('');
}

export function applyFilters() {
    let filtered = globalProducts;
    if (currentCategory !== 'all') filtered = filtered.filter(p => p.category === currentCategory);
    if (currentSearch.trim()) filtered = filtered.filter(p => (p.name||'').toLowerCase().includes(currentSearch.toLowerCase()));
    displayProducts(filtered);
}

export function filterByCategory(cat, el) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    currentCategory = cat;
    applyFilters();
}

export function filterBySearch(q) { currentSearch = q; applyFilters(); }

export function getFavorites() { try { return JSON.parse(localStorage.getItem('alukhowah_favs')||'[]'); } catch { return []; } }
export function toggleFavorite(id) {
    let favs = getFavorites(); const sid = String(id);
    favs = favs.includes(sid) ? favs.filter(f=>f!==sid) : [...favs, sid];
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    applyFilters();
}

export function addToCart(id) {
    const product = globalProducts.find(p => String(p.id) === String(id));
    if (!product) return;
    const idx = cart.findIndex(i => String(i.id) === String(id));
    if (idx > -1) cart[idx].qty += 1;
    else {
        const discount = product.discount ? Number(product.discount) : 0;
        const base = Number(product.price) || 0;
        const final = discount > 0 ? base - (base * discount / 100) : base;
        cart.push({ ...product, price: Math.round(final), discount, qty: 1 });
    }
    updateCartBadge();
}

export function changeQty(id, delta) {
    const idx = cart.findIndex(i => String(i.id) === String(id));
    if (idx > -1) {
        cart[idx].qty += delta;
        if (cart[idx].qty <= 0) cart.splice(idx,1);
    }
    updateCartBadge();
    renderCartItems();
}

export function removeFromCart(id) {
    cart = cart.filter(i => String(i.id) !== String(id));
    updateCartBadge();
    renderCartItems();
}

export function updateCartBadge() {
    const total = cart.reduce((s,i) => s + i.qty, 0);
    document.getElementById('cartCount')?.innerText = total;
}

// حساب إجمالي الطلب مع الخصومات الذكية والتوصيل
function calculateFinalTotal() {
    const itemsTotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    let smartDiscount = 0;
    if (itemsTotal >= 1000) smartDiscount = 0.10;
    else if (itemsTotal >= 500) smartDiscount = 0.05;

    const discountedItems = itemsTotal - (itemsTotal * smartDiscount);
    let deliveryCost = 0;
    if (currentDeliveryType === 'inside') deliveryCost = 100;
    else deliveryCost = (currentDeliveryKm || 1) * 35;

    return {
        itemsTotal,
        smartDiscountPercent: smartDiscount * 100,
        smartDiscountAmount: itemsTotal * smartDiscount,
        discountedItems,
        deliveryCost,
        finalTotal: discountedItems + deliveryCost
    };
}

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
        renderCartItems();
        updateDelivery(); // لتهيئة حالة التوصيل
    }
}

export function renderCartItems() {
    const container = document.getElementById('cartItemsContainer');
    const totalArea = document.getElementById('cartTotalArea');
    const finalTotalInput = document.getElementById('finalTotal');
    if (!container || !totalArea) return;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center;">السلة فارغة.</p>';
        totalArea.innerHTML = 'الإجمالي: 0 ل.س';
        if (finalTotalInput) finalTotalInput.value = 0;
        return;
    }

    const calc = calculateFinalTotal();

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${escapeHTML(item.name)}</strong>
                <div style="font-size:12px;">${item.price} ل.س × ${item.qty}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button class="qty-btn" onclick="window.changeQty('${item.id}',-1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="window.changeQty('${item.id}',1)">+</button>
                <span style="font-weight:bold; color:var(--primary);">${item.price * item.qty} ل.س</span>
                <i class="fa-solid fa-trash" style="color:red; cursor:pointer;" onclick="window.removeFromCart('${item.id}')"></i>
            </div>
        </div>
    `).join('');

    totalArea.innerHTML = `
        <div>مجموع المنتجات: ${calc.itemsTotal} ل.س</div>
        ${calc.smartDiscountPercent > 0 ? `<div style="color:green;">خصم ذكي (${calc.smartDiscountPercent}%): -${Math.round(calc.smartDiscountAmount)} ل.س</div>` : ''}
        <div>التوصيل (${currentDeliveryType==='inside'?'داخل عمرانيا':'خارج عمرانيا '+currentDeliveryKm+' كم'}): ${calc.deliveryCost} ل.س</div>
        <div style="font-size:1.2em; margin-top:5px;">الإجمالي النهائي: <strong>${Math.round(calc.finalTotal)} ل.س</strong></div>
    `;
    if (finalTotalInput) finalTotalInput.value = Math.round(calc.finalTotal);
}

export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (isSubmitting) return;
        if (cart.length === 0) { alert('السلة فارغة!'); return; }

        const submitBtn = document.getElementById('submitBtn');
        isSubmitting = true;
        submitBtn.innerText = 'جاري الإرسال...';
        submitBtn.disabled = true;

        const phone = document.getElementById('userPhone')?.value.trim() || '';
        const address = document.getElementById('userAddress')?.value.trim() || '';
        const itemsSummary = cart.map(i => `${i.name} (${i.qty})`).join(' - ');
        const calc = calculateFinalTotal();
        const finalTotal = Math.round(calc.finalTotal);

        try {
            await addDoc(collection(db, "orders"), {
                phone, address,
                items: itemsSummary,
                total: finalTotal,
                deliveryType: currentDeliveryType === 'inside' ? 'داخل عمرانيا' : `خارج عمرانيا (${currentDeliveryKm} كم)`,
                deliveryCost: calc.deliveryCost,
                itemsTotal: calc.itemsTotal,
                smartDiscount: Math.round(calc.smartDiscountAmount),
                date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                createdAt: serverTimestamp()
            });
            alert('✅ تم إرسال طلبك بنجاح!');
            cart = [];
            updateCartBadge();
            renderCartItems();
            toggleCartModal();
            form.reset();
        } catch (err) {
            alert('❌ خطأ: ' + err.message);
        } finally {
            isSubmitting = false;
            submitBtn.innerText = 'تأكيد الطلب';
            submitBtn.disabled = false;
        }
    });
}

// ========== عرض الأقسام الديناميكية ==========
function renderCategories(categories) {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    container.innerHTML = `
        <span class="cat-chip active" onclick="window.filterByCategory('all', this)">الكل</span>
        ${categories.map(c => `<span class="cat-chip" onclick="window.filterByCategory('${escapeHTML(c.name)}', this)">${escapeHTML(c.name)}</span>`).join('')}
    `;
}

// ========== تهيئة الصفحة الرئيسية ==========
export function initMainPage() {
    loadDarkModePreference();

    const enterBtn = document.getElementById('enterBtn');
    const welcome = document.getElementById('welcomeOverlay');
    const bgMusic = document.getElementById('bgMusic');
    const toggleMusicBtn = document.getElementById('toggleMusicBtn');
    const musicIcon = document.getElementById('musicIcon');

    if (enterBtn && welcome) {
        enterBtn.addEventListener('click', () => {
            if (bgMusic) bgMusic.play().then(() => { if(musicIcon) musicIcon.className='fa-solid fa-volume-high'; }).catch(console.log);
            welcome.style.display = 'none';
        });
    }
    if (toggleMusicBtn && bgMusic && musicIcon) {
        toggleMusicBtn.addEventListener('click', () => {
            if (bgMusic.paused) { bgMusic.play(); musicIcon.className='fa-solid fa-volume-high'; }
            else { bgMusic.pause(); musicIcon.className='fa-solid fa-volume-xmark'; }
        });
    }
    document.querySelectorAll('.dark-toggle').forEach(b => b.addEventListener('click', toggleDarkMode));

    initProductsListener();
    initCheckoutForm();

    // ربط الدوال
    window.toggleFavorite = toggleFavorite;
    window.addToCart = addToCart;
    window.changeQty = changeQty;
    window.removeFromCart = removeFromCart;
    window.toggleCartModal = toggleCartModal;
    window.filterByCategory = filterByCategory;
    window.filterBySearch = filterBySearch;
    window.updateDelivery = updateDelivery;

    window.toggleInfoModal = () => document.getElementById('infoModal')?.classList.toggle('open');

    // تحميل الأقسام الديناميكية
    getCategoriesListener((categories) => {
        renderCategories(categories);
    });
}

export { db, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy, serverTimestamp };
