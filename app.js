<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ماركت الأخوة - المتجر الإلكتروني</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #f27a1a;
            --primary-hover: #d96812;
            --bg: #f9f9f9;
            --card-bg: #ffffff;
            --text: #333333;
            --border: #e6e6e6;
            --shadow: rgba(0,0,0,0.06);
            --input-bg: #f0f0f0;
            --badge-bg: #ffeee2;
        }
        body.dark {
            --bg: #121212;
            --card-bg: #1e1e1e;
            --text: #e0e0e0;
            --border: #333333;
            --shadow: rgba(0,0,0,0.4);
            --input-bg: #2a2a2a;
            --badge-bg: #3a2211;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: var(--bg); color: var(--text); padding-bottom: 90px; }
        
        header {
            background: var(--card-bg);
            border-bottom: 1px solid var(--border);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .logo { font-size: 20px; font-weight: bold; color: var(--primary); display: flex; align-items: center; gap: 8px; }
        .header-actions { display: flex; gap: 12px; align-items: center; }
        .icon-btn {
            background: var(--input-bg);
            border: 1px solid var(--border);
            border-radius: 50%;
            width: 40px; height: 40px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; cursor: pointer; color: var(--text);
            position: relative;
        }
        
        .search-container {
            padding: 15px 20px;
            background: var(--card-bg);
            border-bottom: 1px solid var(--border);
        }
        .search-box {
            display: flex;
            align-items: center;
            background: var(--input-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 8px 12px;
        }
        .search-box input {
            border: none; background: none; outline: none; width: 100%;
            padding-right: 8px; font-size: 15px; color: var(--text);
        }

        .categories-bar {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            padding: 15px 20px;
            background: var(--card-bg);
            border-bottom: 1px solid var(--border);
            scrollbar-width: none;
        }
        .categories-bar::-webkit-scrollbar { display: none; }
        .cat-chip {
            background: var(--input-bg);
            border: 1px solid var(--border);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
            white-space: nowrap;
            color: var(--text);
            transition: all 0.2s;
        }
        .cat-chip.active { background: var(--primary); color: white; border-color: var(--primary); }

        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: var(--text); }
        
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 15px;
        }
        .product-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 2px 5px var(--shadow);
        }
        .product-img {
            width: 100%; height: 130px; object-fit: cover; border-radius: 8px;
            background: var(--input-bg); margin-bottom: 10px;
            display: flex; align-items: center; justify-content: center; color: #888; font-size: 24px;
        }
        .product-name { font-size: 14px; font-weight: bold; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .product-price { font-size: 14px; color: var(--primary); font-weight: bold; margin-bottom: 10px; }
        .add-to-cart-btn {
            background: var(--primary); color: white; border: none; padding: 8px;
            border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; width: 100%;
            transition: background 0.2s;
        }
        .add-to-cart-btn:hover { background: var(--primary-hover); }

        .cart-drawer {
            position: fixed; top: 0; left: -100%; width: 100%; max-width: 380px; height: 100%;
            background: var(--card-bg); z-index: 1000; box-shadow: 5px 0 15px var(--shadow);
            transition: left 0.3s ease; display: flex; flex-direction: column;
        }
        .cart-drawer.open { left: 0; }
        .cart-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .cart-body { padding: 20px; flex: 1; overflow-y: auto; }
        .cart-footer { padding: 20px; border-top: 1px solid var(--border); background: var(--bg); }
        
        .cart-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        .cart-item-info h4 { font-size: 13px; margin-bottom: 4px; }
        .cart-item-info p { font-size: 12px; color: var(--primary); }
        .qty-controls { display: flex; align-items: center; gap: 8px; }
        .qty-btn { background: var(--input-bg); border: 1px solid var(--border); width: 25px; height: 25px; border-radius: 4px; cursor: pointer; font-weight: bold; color: var(--text); }

        .checkout-form input, .checkout-form select {
            width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid var(--border);
            border-radius: 6px; background: var(--input-bg); color: var(--text); font-size: 14px;
        }
        .btn-main { background: var(--primary); color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; }
        
        .cart-badge {
            position: absolute; top: -5px; right: -5px; background: var(--primary); color: white;
            font-size: 11px; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 900; display: none; }
        .overlay.open { display: block; }
    </style>
</head>
<body>

    <header>
        <div class="logo"><i class="fa-solid fa-store"></i> ماركت الأخوة</div>
        <div class="header-actions">
            <button class="icon-btn" id="storeDarkToggle" title="تبديل المظهر">
                <i class="fa-solid fa-moon" id="storeDarkIcon"></i>
            </button>
            <button class="icon-btn" id="cartToggleBtn" title="سلة التسوق">
                <i class="fa-solid fa-cart-shopping"></i>
                <span class="cart-badge" id="cartBadge">0</span>
            </button>
        </div>
    </header>

    <div class="search-container">
        <div class="search-box">
            <i class="fa-solid fa-magnifying-glass" style="color: #888;"></i>
            <input type="text" id="searchInput" placeholder="ابحث عن منتج، متة، شحن ألعاب...">
        </div>
    </div>

    <div class="categories-bar" id="categoriesBar">
        <div class="cat-chip active" data-cat="الكل">الكل</div>
        <div class="cat-chip" data-cat="مؤن">مؤن أساسية</div>
        <div class="cat-chip" data-cat="ألبان">ألبان وأجبان</div>
        <div class="cat-chip" data-cat="زيوت">زيوت وسمن</div>
        <div class="cat-chip" data-cat="مشروبات">مشروبات</div>
        <div class="cat-chip" data-cat="بهارات">بهارات</div>
        <div class="cat-chip" data-cat="شبسات">شبسات</div>
        <div class="cat-chip" data-cat="حلويات">حلويات</div>
        <div class="cat-chip" data-cat="منظفات">منظفات</div>
        <div class="cat-chip" data-cat="عروض">🔥 العروض</div>
        <div class="cat-chip" data-cat="ألعاب">🎮 شحن الألعاب</div>
    </div>

    <div class="container">
        <div class="section-title" id="currentCategoryTitle">المنتجات المتوفرة</div>
        <div class="products-grid" id="productsGrid">
            <p style="grid-column: 1/-1; text-align: center; color: #888;">جاري تحميل المنتجات...</p>
        </div>
    </div>

    <div class="overlay" id="cartOverlay"></div>
    <div class="cart-drawer" id="cartDrawer">
        <div class="cart-header">
            <h3><i class="fa-solid fa-cart-shopping"></i> سلة المشتريات</h3>
            <button class="icon-btn" id="closeCartBtn" style="border:none;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="cart-body" id="cartBody">
            <p style="text-align:center; color:#888;">السلة فارغة حالياً.</p>
        </div>
        <div class="cart-footer">
            <div style="margin-bottom: 12px; display:flex; justify-content:space-between; font-weight:bold;">
                <span>المجموع الكلي:</span>
                <span id="cartTotalPrice">0 ل.س</span>
            </div>
            <div class="checkout-form">
                <input type="text" id="clientPhone" placeholder="رقم الهاتف الأساسي" required>
                <input type="text" id="clientAddress" placeholder="عنوان التوصيل (المنطقة / الشارع)" required>
                <select id="deliveryTime">
                    <option value="أسرع وقت ممكن">أسرع وقت ممكن (توصيل فوري)</option>
                    <option value="الفترة الصباحية">الفترة الصباحية</option>
                    <option value="الفترة المسائية">الفترة المسائية</option>
                </select>
                <button class="btn-main" id="submitOrderBtn">إتمام الطلب وإرساله</button>
            </div>
        </div>
    </div>

    <script type="module">
        import { 
            db, collection, addDoc, onSnapshot, query, orderBy, 
            serverTimestamp, escapeHTML, toggleDarkMode, loadDarkModePreference 
        } from './app.js';

        loadDarkModePreference();
        document.getElementById('storeDarkToggle')?.addEventListener('click', toggleDarkMode);

        let allProducts = [];
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        let currentCategory = 'الكل';
        let searchQuery = '';

        const cartDrawer = document.getElementById('cartDrawer');
        const cartOverlay = document.getElementById('cartOverlay');

        document.getElementById('cartToggleBtn')?.addEventListener('click', () => {
            cartDrawer.classList.add('open');
            cartOverlay.classList.add('open');
        });
        document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
        cartOverlay?.addEventListener('click', closeCart);

        function closeCart() {
            cartDrawer.classList.remove('open');
            cartOverlay.classList.remove('open');
        }

        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProducts();
        });

        function renderProducts() {
            const grid = document.getElementById('productsGrid');
            let filtered = allProducts;

            if (currentCategory !== 'الكل') {
                filtered = filtered.filter(p => p.category === currentCategory);
            }

            if (searchQuery.trim() !== '') {
                filtered = filtered.filter(p => String(p.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
            }

            if (filtered.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">لا توجد منتجات مطابقة للبحث أو القسم.</p>';
                return;
            }

            grid.innerHTML = filtered.map(p => {
                const imgUrl = String(p.imageUrl || '').trim();
                const hasImg = imgUrl !== '' && imgUrl !== 'null' && imgUrl !== 'undefined';
                const imgTag = hasImg ? 
                    `<img src="${escapeHTML(imgUrl)}" class="product-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` +
                    `<div class="product-img" style="display:none;"><i class="fa-solid fa-basket-shopping"></i></div>` :
                    `<div class="product-img"><i class="fa-solid fa-basket-shopping"></i></div>`;

                return `
                    <div class="product-card">
                        <div>
                            ${imgTag}
                            <div class="product-name">${escapeHTML(p.name)}</div>
                            <div class="product-price">${escapeHTML(p.price)} ل.س</div>
                        </div>
                        <button class="add-to-cart-btn" onclick="window.addToCart('${p.id}')">إضافة للسلة</button>
                    </div>
                `;
            }).join('');
        }

        document.querySelectorAll('.cat-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.getAttribute('data-cat');
                document.getElementById('currentCategoryTitle').innerText = currentCategory === 'الكل' ? 'المنتجات المتوفرة' : `قسم: ${currentCategory}`;
                renderProducts();
            });
        });

        document.getElementById('searchInput')?.addEventListener('input', function(e) {
            searchQuery = e.target.value;
            renderProducts();
        });

        window.addToCart = function(productId) {
            const product = allProducts.find(p => p.id === productId);
            if (!product) return;

            const existing = cart.find(item => item.id === productId);
            if (existing) {
                existing.qty += 1;
            } else {
                cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
            }
            saveAndRenderCart();
            alert('✅ تم إضافة المنتج إلى السلة');
        };

        window.changeQty = function(productId, delta) {
            const item = cart.find(i => i.id === productId);
            if (!item) return;
            item.qty += delta;
            if (item.qty <= 0) {
                cart = cart.filter(i => i.id !== productId);
            }
            saveAndRenderCart();
        };

        function saveAndRenderCart() {
            localStorage.setItem('cart', JSON.stringify(cart));
            const badge = document.getElementById('cartBadge');
            const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
            badge.innerText = totalCount;

            const cartBody = document.getElementById('cartBody');
            const cartTotalPrice = document.getElementById('cartTotalPrice');

            if (cart.length === 0) {
                cartBody.innerHTML = '<p style="text-align:center; color:#888;">السلة فارغة حالياً.</p>';
                cartTotalPrice.innerText = '0 ل.س';
                return;
            }

            let totalSum = 0;
            cartBody.innerHTML = cart.map(item => {
                const itemTotal = item.price * item.qty;
                totalSum += itemTotal;
                return `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <h4>${escapeHTML(item.name)}</h4>
                            <p>${item.price} ل.س × ${item.qty} = <strong>${itemTotal} ل.س</strong></p>
                        </div>
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button>
                            <span>${item.qty}</span>
                            <button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button>
                        </div>
                    </div>
                `;
            }).join('');

            cartTotalPrice.innerText = `${totalSum} ل.س`;
        }

        document.getElementById('submitOrderBtn')?.addEventListener('click', async function() {
            if (cart.length === 0) {
                alert('سلة المشتريات فارغة!');
                return;
            }

            const phone = document.getElementById('clientPhone').value.trim();
            const address = document.getElementById('clientAddress').value.trim();
            const deliveryTime = document.getElementById('deliveryTime').value;

            if (!phone || !address) {
                alert('يرجى إدخال رقم الهاتف وعنوان التوصيل لإتمام الطلب.');
                return;
            }

            const orderBtn = this;
            orderBtn.innerText = 'جاري إرسال الطلب...';
            orderBtn.disabled = true;

            let totalSum = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
            let itemsSummary = cart.map(i => `${i.name} (×${i.qty})`).join('، ');

            try {
                await addDoc(collection(db, "orders"), {
                    phone: String(phone),
                    address: String(address),
                    deliveryTime: String(deliveryTime),
                    items: String(itemsSummary),
                    total: Number(totalSum),
                    date: new Date().toLocaleString('ar-SY'),
                    createdAt: serverTimestamp()
                });

                alert('🎉 تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً.');
                cart = [];
                saveAndRenderCart();
                document.getElementById('clientPhone').value = '';
                document.getElementById('clientAddress').value = '';
                closeCart();
            } catch (error) {
                alert('❌ حدث خطأ أثناء إرسال الطلب: ' + error.message);
            } finally {
                orderBtn.innerText = 'إتمام الطلب وإرساله';
                orderBtn.disabled = false;
            }
        });

        saveAndRenderCart();
    </script>
</body>
</html>
