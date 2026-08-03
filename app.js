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
    serverTimestamp
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
    if (fileOrInput instanceof File) {
        file = fileOrInput;
    } else if (fileOrInput && fileOrInput.files && fileOrInput.files[0]) {
        file = fileOrInput.files[0];
    } else {
        return '';
    }

    // 1. محاولة الرفع عبر ImgBB
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
            if (dataImg && dataImg.data && dataImg.data.url) {
                return dataImg.data.url;
            }
        }
    } catch (e) {
        console.warn("فشل ImgBB، يتم استخدام Base64...", e);
    }

    // 2. الحل الاحتياطي: Base64 مضغوط
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
        
        // يعرض الصورة إذا كانت موجودة، وإلا يعرض أيقونة السلة بشكل أنيق
        const imageElement = isValidUrl ?
            `<img src="${escapeHTML(imgUrlStr)}" alt="${escapeHTML(p.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="no-img-fallback" style="display:none;"><i class="fa-solid fa-basket-shopping"></i></div>` :
            `<div class="no-img-fallback"><i class="fa-solid fa-basket-shopping"></i></div>`;

        return `
            <div class="product-card">
                <div class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${p.id}')">
                    <i class="fa-solid fa-heart"></i>
                </div>
                <div class="product-img">${imageElement}</div>
                <div class="product-info">
                    <div class="product-title">${escapeHTML(p.name)}</div>
                    <div class="product-price">${escapeHTML(p.price)} ل.س</div>
                </div>
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
    try {
        return JSON.parse(localStorage.getItem('alukhowah_favs') || '[]');
    } catch (e) {
        return [];
    }
}

export function toggleFavorite(id) {
    let favs = getFavorites();
    const strId = String(id);
    favs = favs.includes(strId) ? favs.filter(fId => fId !== strId) : [...favs, strId];
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    applyFilters();
}

export function addToCart(id) {
    const product = globalProducts.find(p => String(p.id) === String(id));
    if (!product) return;
    const idx = cart.findIndex(item => String(item.id) === String(id));
    if (idx > -1) cart[idx].qty += 1;
    else cart.push({ ...product, price: Number(product.price) || 0, qty: 1 });
    updateCartBadge();
}

export function changeQty(id, delta) {
    const idx = cart.findIndex(item => String(item.id) === String(id));
    if (idx > -1) {
        cart[idx].qty += delta;
        if (cart[idx].qty <= 0) {
            cart.splice(idx, 1);
        }
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

export function toggleCartModal() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    modal.classList.toggle('open');
    if (modal.classList.contains('open')) renderCartItems();
}

export function renderCartItems() {
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalPrice');
    if (!container || !totalEl) return;
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">السلة فارغة حالياً.</p>';
        totalEl.innerText = '0 ل.س';
        return;
    }
    let total = 0;
    container.innerHTML = cart.map((item) => {
        const itemPrice = Number(item.price) || 0;
        const itemTotal = itemPrice * item.qty;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div>
                    <strong>${escapeHTML(item.name)}</strong>
                    <div style="font-size:12px; color:#666;">السعر: ${itemPrice} ل.س</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button>
                    <span style="font-weight:bold;">${item.qty}</span>
                    <button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button>
                    <span style="margin-right: 8px; font-weight:bold; color:var(--primary);">${itemTotal} ل.س</span>
                    <i class="fa-solid fa-trash" style="color:red; cursor:pointer; margin-right:5px;" onclick="window.removeFromCart('${item.id}')"></i>
                </div>
            </div>
        `;
    }).join('');
    totalEl.innerText = `${total} ل.س`;
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
        const totalSum = cart.reduce((sum, i) => sum + ((Number(i.price) || 0) * i.qty), 0);

        try {
            await addDoc(collection(db, "orders"), {
                phone: String(phone),
                address: String(address),
                items: String(itemsSummary),
                total: Number(totalSum),
                date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                createdAt: serverTimestamp()
            });
            alert(`✅ تم إرسال طلبك بنجاح! وسوف نتواصل معك عبر الرقم: ${phone}`);
            cart = [];
            updateCartBadge();
            renderCartItems();
            toggleCartModal();
            form.reset();
        } catch (error) {
            alert('❌ حدث خطأ أثناء إرسال الطلب: ' + error.message);
        } finally {
            isSubmitting = false;
            submitBtn.innerText = 'تأكيد الطلب';
            submitBtn.disabled = false;
        }
    });
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

    // ربط الدوال بالنافذة العامة
    window.toggleFavorite = toggleFavorite;
    window.addToCart = addToCart;
    window.changeQty = changeQty;
    window.removeFromCart = removeFromCart;
    window.toggleCartModal = toggleCartModal;
    window.filterByCategory = filterByCategory;
    window.filterBySearch = filterBySearch;
    window.uploadImageToImgBB = uploadImageToImgBB;
    
    // دالة فتح مودال المعلومات
    window.toggleInfoModal = function() {
        const modal = document.getElementById('infoModal');
        if (modal) modal.classList.toggle('open');
    };
}

export { db, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy, serverTimestamp };
