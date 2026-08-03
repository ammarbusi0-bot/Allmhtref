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

// ===== إعداد Firebase =====
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
export { db };

// ===== أدوات مساعدة =====
export function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

export async function uploadImageToImgBB(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return null;
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);
    try {
        const response = await fetch('https://api.imgbb.com/1/upload?key=42b6820dc31a25d977adefc41f83aa70', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        return data.success ? data.data.url : null;
    } catch (error) {
        console.error("خطأ في رفع الصورة إلى ImgBB:", error);
        return null;
    }
}

// ===== إدارة المظهر الداكن =====
export function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('alukhowah_dark', isDark ? 'true' : 'false');
    const icon = document.getElementById('darkModeIcon');
    if (icon) {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
}

export function loadDarkModePreference() {
    const saved = localStorage.getItem('alukhowah_dark');
    if (saved === 'true') {
        document.body.classList.add('dark');
        const icon = document.getElementById('darkModeIcon');
        if (icon) icon.className = 'fa-solid fa-sun';
    }
}

// ===== متغيرات عامة =====
export let globalProducts = [];
export let cart = [];
export let isSubmitting = false;
let currentCategory = 'all';
let currentSearch = '';

// ===== جلب المنتجات (للاستخدام في index.html) =====
export function initProductsListener() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        globalProducts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        applyFilters();
    }, (error) => {
        console.error("خطأ جلب المنتجات:", error);
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:red;">تعذر تحميل المنتجات.</p>';
    });
}

// ===== عرض المنتجات =====
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
        const imageElement = (p.imageUrl && p.imageUrl.trim() !== '') ?
            `<img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` +
            `<i class="fa-solid fa-basket-shopping" style="display:none; font-size:50px; color:#aaa;"></i>` :
            `<i class="fa-solid fa-basket-shopping" style="font-size:50px; color:#aaa;"></i>`;
        return `
            <div class="product-card">
                <div class="fav-btn ${isFav ? 'active' : ''}" onclick="window.toggleFavorite('${p.id}')">
                    <i class="fa-solid fa-heart"></i>
                </div>
                <div class="product-img">${imageElement}</div>
                <div class="product-info">
                    <div class="product-title">${escapeHTML(p.name)}</div>
                    <div class="product-price">${Number(p.price)} ل.س</div>
                </div>
                <button class="btn-add-cart" onclick="window.addToCart('${p.id}')">+ أضف للسلة</button>
            </div>
        `;
    }).join('');
}

// ===== التصفية =====
export function applyFilters() {
    let filtered = globalProducts;
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    if (currentSearch.trim() !== '') {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(currentSearch.toLowerCase()));
    }
    displayProducts(filtered);
}

export function filterByCategory(cat, element) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    currentCategory = cat;
    applyFilters();
}

export function filterBySearch(query) {
    currentSearch = query;
    applyFilters();
}

// ===== المفضلة =====
export function getFavorites() {
    return JSON.parse(localStorage.getItem('alukhowah_favs') || '[]');
}

export function toggleFavorite(id) {
    let favs = getFavorites();
    const strId = String(id);
    if (favs.includes(strId)) {
        favs = favs.filter(fId => fId !== strId);
    } else {
        favs.push(strId);
    }
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    applyFilters(); // إعادة تطبيق الفلتر بعد تغيير المفضلة
}

// ===== السلة =====
export function addToCart(id) {
    const product = globalProducts.find(p => String(p.id) === String(id));
    if (!product) return;
    const existingIndex = cart.findIndex(item => String(item.id) === String(id));
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({ ...product, price: Number(product.price), qty: 1 });
    }
    updateCartBadge();
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
    if (modal.classList.contains('open')) {
        renderCartItems();
    }
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
                    <div style="font-size:12px; color:#666;">العدد: ${item.qty} × ${itemPrice} ل.س</div>
                </div>
                <div>
                    <span style="margin-left: 10px; font-weight:bold;">${itemTotal} ل.س</span>
                    <i class="fa-solid fa-trash" style="color:red; cursor:pointer;" onclick="window.removeFromCart('${item.id}')"></i>
                </div>
            </div>
        `;
    }).join('');
    totalEl.innerText = `${total} ل.س`;
}

// ===== إرسال الطلب =====
export function initCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (isSubmitting) return;
        if (cart.length === 0) {
            alert('السلة فارغة!');
            return;
        }
        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;
        isSubmitting = true;
        submitBtn.innerText = 'جاري إرسال الطلب...';
        submitBtn.disabled = true;

        const phone = document.getElementById('userPhone')?.value.trim() || '';
        const address = document.getElementById('userAddress')?.value.trim() || '';
        const itemsSummary = cart.map(i => `${escapeHTML(i.name)} (العدد: ${i.qty})`).join(' - ');
        const totalSum = cart.reduce((sum, i) => sum + ((Number(i.price) || 0) * i.qty), 0);

        const newOrder = {
            phone: String(phone),
            address: String(address),
            items: String(itemsSummary),
            total: Number(totalSum),
            date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "orders"), newOrder);
            alert(`تم إرسال طلبك بنجاح! وسوف نتواصل معك عبر رقم الهاتف: ${phone}`);
            cart = [];
            updateCartBadge();
            toggleCartModal();
            form.reset();
        } catch (error) {
            console.error("Error adding order: ", error);
            alert('حدث خطأ أثناء إرسال الطلب: ' + error.message);
        } finally {
            isSubmitting = false;
            submitBtn.innerText = 'تأكيد الطلب';
            submitBtn.disabled = false;
        }
    });
}

// ===== تهيئة الصفحة الرئيسية (index.html) =====
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
                }).catch(() => {});
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

    // ربط أزرار المظهر الداكن
    document.querySelectorAll('.dark-toggle').forEach(btn => {
        btn.addEventListener('click', toggleDarkMode);
    });

    // تهيئة الاستماع للمنتجات
    initProductsListener();

    // تهيئة نموذج الطلب
    initCheckoutForm();

    // جعل الدوال العامة متاحة في window
    window.toggleFavorite = toggleFavorite;
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.toggleCartModal = toggleCartModal;
    window.filterByCategory = filterByCategory;
    window.filterBySearch = filterBySearch;
}
