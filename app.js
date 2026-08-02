// Import the functions you need from the SDKs you need
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

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBfJthCuyCOQtyjUFtGOqDD5MhAlAKmBJU",
  authDomain: "market-30cd6.firebaseapp.com",
  projectId: "market-30cd6",
  storageBucket: "market-30cd6.firebasestorage.app",
  messagingSenderId: "339341925839",
  appId: "1:339341925839:web:c6395a82c9b88d494ec6ba",
  measurementId: "G-F7ZK7JFWHZ"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// التصدير للاستخدام في admin.html
export { db, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy, serverTimestamp };

let globalProducts = [];
let cart = [];

// جلب المنتجات الحية من Firestore (Real-time)
if (document.getElementById('productsGrid')) {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        globalProducts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        displayProducts(globalProducts);
    }, (error) => {
        console.error("خطأ جلب المنتجات من Firestore:", error);
    });
}

// جلب المفضلة المخزنة موقتاً
function getFavorites() {
    return JSON.parse(localStorage.getItem('alukhowah_favs') || '[]');
}

// إدارة المفضلة
window.toggleFavorite = function(id) {
    let favs = getFavorites();
    const strId = String(id);
    if (favs.includes(strId)) {
        favs = favs.filter(fId => fId !== strId);
    } else {
        favs.push(strId);
    }
    localStorage.setItem('alukhowah_favs', JSON.stringify(favs));
    filterProducts();
};

// عرض المنتجات
function displayProducts(items) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 20px;">لا توجد منتجات متوفرة حالياً.</p>';
        return;
    }

    const favs = getFavorites();

    grid.innerHTML = items.map(p => {
        const isFav = favs.includes(String(p.id));
        return `
            <div class="product-card">
                <div class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${p.id}')">
                    <i class="fa-solid fa-heart"></i>
                </div>
                <div class="product-img"><i class="fa-solid ${p.icon || 'fa-basket-shopping'}"></i></div>
                <div class="product-info">
                    <div class="product-title">${p.name}</div>
                    <div class="product-price">${Number(p.price)} ل.س</div>
                </div>
                <button class="btn-add-cart" onclick="addToCart('${p.id}')">+ أضف للسلة</button>
            </div>
        `;
    }).join('');
}

// الفلترة والبحث
window.filterProducts = function() {
    const queryStr = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const filtered = globalProducts.filter(p => p.name.toLowerCase().includes(queryStr));
    displayProducts(filtered);
};

window.filterCat = function(cat, element) {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');

    if (cat === 'all') {
        displayProducts(globalProducts);
    } else {
        displayProducts(globalProducts.filter(p => p.category === cat));
    }
};

window.resetToHome = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const firstChip = document.querySelector('.cat-chip');
    window.filterCat('all', firstChip);
};

// إدارة السلة
window.addToCart = function(id) {
    const product = globalProducts.find(p => String(p.id) === String(id));
    if (!product) return;

    const existingIndex = cart.findIndex(item => String(item.id) === String(id));
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({ ...product, price: Number(product.price), qty: 1 });
    }
    updateCartBadge();
};

window.removeFromCart = function(id) {
    cart = cart.filter(item => String(item.id) !== String(id));
    updateCartBadge();
    renderCartItems();
};

function updateCartBadge() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.innerText = totalCount;
}

window.toggleCartModal = function() {
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    modal.classList.toggle('open');
    if (modal.classList.contains('open')) {
        renderCartItems();
    }
};

function renderCartItems() {
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
                    <strong>${item.name}</strong>
                    <div style="font-size:12px; color:#666;">العدد: ${item.qty} × ${itemPrice} ل.س</div>
                </div>
                <div>
                    <span style="margin-left: 10px; font-weight:bold;">${itemTotal} ل.س</span>
                    <i class="fa-solid fa-trash" style="color:red; cursor:pointer;" onclick="removeFromCart('${item.id}')"></i>
                </div>
            </div>
        `;
    }).join('');

    totalEl.innerText = `${total} ل.س`;
}

// إرسال الطلب مباشرة لـ Firestore
document.getElementById('checkoutForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (cart.length === 0) {
        alert('السلة فارغة!');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerText = 'جاري إرسال الطلب...';
    submitBtn.disabled = true;

    const phone = document.getElementById('userPhone').value.trim();
    const address = document.getElementById('userAddress').value.trim();
    const itemsSummary = cart.map(i => `${i.name} (${i.qty})`).join(' ، ');
    const totalSum = cart.reduce((sum, i) => sum + ((Number(i.price) || 0) * i.qty), 0);

    const newOrder = {
        phone: phone,
        address: address,
        items: itemsSummary,
        total: totalSum,
        date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "orders"), newOrder);
        alert(`تم إرسال طلبك بنجاح وسوف نتواصل معك عبر رقم الهاتف: ${phone}`);
        cart = [];
        updateCartBadge();
        window.toggleCartModal();
        this.reset();
    } catch (error) {
        alert('حدث خطأ أثناء إرسال الطلب: ' + error.message);
    } finally {
        submitBtn.innerText = 'تأكيد الطلب';
        submitBtn.disabled = false;
    }
});
