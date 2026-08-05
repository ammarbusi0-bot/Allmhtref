<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>المتجر الأخوي - Pro Max Ultimate</title>
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
    <style>
        /* ===== CSS Variables & Reset ===== */
        :root {
            --primary: #2a7f6e;
            --primary-light: #3ba08c;
            --secondary: #ff6b6b;
            --bg: #f8f9fa;
            --card-bg: #ffffff;
            --text: #212529;
            --text-light: #6c757d;
            --input-bg: #f1f3f5;
            --border: #dee2e6;
            --shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            --radius: 14px;
            --transition: 0.25s ease;
        }
        body.dark {
            --bg: #121212;
            --card-bg: #1e1e1e;
            --text: #e9ecef;
            --text-light: #adb5bd;
            --input-bg: #2d2d2d;
            --border: #343a40;
            --shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        body {
            background: var(--bg);
            color: var(--text);
            transition: background var(--transition), color var(--transition);
            padding-bottom: 80px;
        }
        a {
            color: var(--primary);
            text-decoration: none;
        }
        button {
            cursor: pointer;
            border: none;
            outline: none;
            font-size: 0.9rem;
            border-radius: 8px;
            transition: var(--transition);
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 16px;
        }

        /* ===== Welcome Overlay ===== */
        #welcomeOverlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(6px);
        }
        #welcomeOverlay .card {
            background: var(--card-bg);
            padding: 40px 30px;
            border-radius: var(--radius);
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        #welcomeOverlay h1 {
            font-size: 2.2rem;
            color: var(--primary);
            margin-bottom: 8px;
        }
        #welcomeOverlay p {
            color: var(--text-light);
            margin-bottom: 20px;
        }
        #enterBtn {
            background: var(--primary);
            color: #fff;
            padding: 12px 28px;
            font-size: 1.1rem;
            border-radius: 30px;
            transition: 0.2s;
        }
        #enterBtn:hover {
            background: var(--primary-light);
            transform: scale(1.03);
        }

        /* ===== Header ===== */
        .header {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            padding: 14px 0;
            gap: 12px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 18px;
        }
        .logo {
            font-size: 1.6rem;
            font-weight: 700;
            color: var(--primary);
        }
        .logo i {
            margin-left: 6px;
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .header-actions button {
            background: var(--input-bg);
            color: var(--text);
            padding: 8px 14px;
            border-radius: 30px;
            font-size: 0.9rem;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .header-actions button i {
            font-size: 1rem;
        }
        .header-actions .cart-btn {
            background: var(--primary);
            color: #fff;
            position: relative;
        }
        .cart-btn #cartCount {
            background: var(--secondary);
            color: #fff;
            border-radius: 50%;
            padding: 0 7px;
            font-size: 0.7rem;
            position: absolute;
            top: -6px;
            right: -6px;
            min-width: 20px;
            text-align: center;
        }
        #userInfo {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
        }
        #userInfo .btn-secondary {
            background: var(--secondary);
            color: #fff;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
        }

        /* ===== Promotions Banner ===== */
        #promotionsContainer {
            background: linear-gradient(135deg, #ffecd2, #fcb69f);
            color: #333;
            padding: 12px 18px;
            border-radius: var(--radius);
            margin-bottom: 18px;
            display: none;
            border-right: 6px solid var(--secondary);
            font-weight: 500;
        }
        body.dark #promotionsContainer {
            background: linear-gradient(135deg, #2d1b0e, #4a2c1a);
            color: #f0e6d3;
        }
        #promotionsContainer .promo-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        #promotionsContainer .promo-badge {
            background: var(--secondary);
            color: #fff;
            padding: 2px 14px;
            border-radius: 30px;
            font-size: 0.75rem;
        }

        /* ===== Search & Filters ===== */
        .search-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .search-bar input {
            flex: 1;
            padding: 12px 18px;
            border: 1px solid var(--border);
            border-radius: 30px;
            background: var(--input-bg);
            color: var(--text);
            font-size: 0.95rem;
            min-width: 180px;
        }
        .search-bar input:focus {
            border-color: var(--primary);
            outline: none;
        }
        .categories {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 20px;
        }
        .cat-chip {
            padding: 8px 18px;
            border-radius: 30px;
            background: var(--input-bg);
            color: var(--text);
            font-size: 0.85rem;
            border: 1px solid transparent;
            transition: 0.2s;
        }
        .cat-chip.active {
            background: var(--primary);
            color: #fff;
            border-color: var(--primary);
        }
        .cat-chip:hover {
            border-color: var(--primary);
        }

        /* ===== Product Grid ===== */
        #productsGrid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 18px;
            margin-bottom: 24px;
        }
        .product-card {
            background: var(--card-bg);
            border-radius: var(--radius);
            padding: 14px;
            box-shadow: var(--shadow);
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--border);
        }
        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }
        .product-card .discount-badge {
            position: absolute;
            top: 10px;
            left: 10px;
            background: var(--secondary);
            color: #fff;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: bold;
            z-index: 2;
        }
        .product-card .fav-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            color: #aaa;
            transition: 0.2s;
            z-index: 2;
            cursor: pointer;
            border: none;
        }
        .product-card .fav-btn.active {
            color: #e0245e;
            background: rgba(224, 36, 94, 0.15);
        }
        .product-card .fav-btn:hover {
            transform: scale(1.15);
        }
        .product-img {
            width: 100%;
            height: 150px;
            background: var(--input-bg);
            border-radius: 10px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
            position: relative;
        }
        .product-img img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .product-img .no-img-fallback {
            font-size: 2.5rem;
            color: var(--text-light);
        }
        .product-title {
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 4px;
            flex: 1;
        }
        .product-price {
            font-weight: 700;
            color: var(--primary);
            font-size: 1.1rem;
            margin: 6px 0;
        }
        .product-price .old-price {
            text-decoration: line-through;
            font-weight: 400;
            color: var(--text-light);
            font-size: 0.8rem;
            margin-left: 8px;
        }
        .share-buttons button {
            background: none !important;
            padding: 0 !important;
            font-size: 1.2rem;
        }
        .btn-add-cart {
            background: var(--primary);
            color: #fff;
            padding: 8px 0;
            border-radius: 30px;
            font-weight: 600;
            margin-top: 8px;
            transition: 0.2s;
            width: 100%;
        }
        .btn-add-cart:hover {
            background: var(--primary-light);
        }
        .availability-badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: bold;
            margin-top: 6px;
            text-align: center;
        }
        .available {
            background: #28a745;
            color: #fff;
        }
        .unavailable {
            background: #dc3545;
            color: #fff;
        }
        .toggle-availability {
            background: var(--input-bg);
            border: 1px solid var(--border);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.7rem;
            margin-top: 4px;
            color: var(--text);
            transition: 0.2s;
            width: 100%;
        }
        .toggle-availability:hover {
            background: var(--primary);
            color: #fff;
        }

        /* ===== Load More ===== */
        #loadMoreBtn {
            display: none;
            margin: 10px auto 30px;
            padding: 12px 30px;
            background: var(--primary);
            color: #fff;
            border-radius: 30px;
            font-size: 1rem;
        }
        #loadMoreBtn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* ===== Cart Modal ===== */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .modal-overlay.open {
            display: flex;
        }
        .modal-content {
            background: var(--card-bg);
            max-width: 600px;
            width: 100%;
            border-radius: var(--radius);
            padding: 24px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .modal-content h2 {
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-content .close-btn {
            background: none;
            font-size: 1.6rem;
            color: var(--text-light);
        }
        .cart-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--border);
            gap: 8px;
            flex-wrap: wrap;
        }
        .qty-btn {
            background: var(--input-bg);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 1rem;
            font-weight: bold;
            color: var(--text);
        }
        .summary-line {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 0.95rem;
            border-bottom: 1px dashed var(--border);
        }
        .summary-line.total {
            font-weight: 700;
            font-size: 1.2rem;
            border-bottom: 2px solid var(--primary);
            padding-top: 10px;
            margin-top: 6px;
        }
        .discount-text {
            color: var(--secondary);
        }
        #checkoutForm input,
        #checkoutForm select {
            width: 100%;
            padding: 10px 14px;
            margin-top: 6px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--input-bg);
            color: var(--text);
        }
        #checkoutForm .form-group {
            margin-top: 12px;
        }
        #submitBtn {
            width: 100%;
            padding: 14px;
            background: var(--primary);
            color: #fff;
            font-weight: bold;
            font-size: 1rem;
            border-radius: 30px;
            margin-top: 16px;
        }
        #submitBtn:disabled {
            opacity: 0.6;
        }

        /* ===== Referral ===== */
        #referralContainer {
            background: var(--card-bg);
            padding: 12px 16px;
            border-radius: var(--radius);
            margin: 16px 0;
            border: 1px solid var(--border);
        }

        /* ===== Admin Promo Modal ===== */
        #adminPromoModal .modal-content {
            max-width: 500px;
        }
        #adminPromoModal input {
            width: 100%;
            padding: 10px;
            margin: 6px 0 12px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--input-bg);
            color: var(--text);
        }
        #adminPromoModal .admin-btn {
            background: var(--primary);
            color: #fff;
            padding: 10px;
            border-radius: 30px;
            width: 100%;
            font-weight: bold;
        }

        /* ===== Info Modal ===== */
        #infoModal .modal-content {
            max-width: 500px;
        }

        /* ===== Toast ===== */
        #customToast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            left: 20px;
            max-width: 380px;
            margin: 0 auto;
            padding: 14px 20px;
            border-radius: 12px;
            background: var(--card-bg);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
            display: none;
            align-items: center;
            gap: 10px;
            z-index: 99999;
            border-right: 5px solid var(--primary);
            color: var(--text);
        }
        #customToast.success {
            border-right-color: #28a745;
        }
        #customToast.error {
            border-right-color: #dc3545;
        }
        #customToast.info {
            border-right-color: #17a2b8;
        }

        /* ===== Responsive ===== */
        @media (max-width: 600px) {
            #productsGrid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 12px;
            }
            .header {
                flex-direction: column;
                align-items: stretch;
            }
            .header-actions {
                justify-content: space-between;
            }
            .modal-content {
                padding: 16px;
            }
        }
    </style>
</head>
<body>

    <!-- ===== Welcome Overlay ===== -->
    <div id="welcomeOverlay">
        <div class="card">
            <h1>🛍️ المتجر الأخوي</h1>
            <p>اكتشف أفضل العروض والمنتجات مع خصومات حصرية</p>
            <button id="enterBtn">دخول <i class="fa-solid fa-arrow-left"></i></button>
            <div style="margin-top:12px;font-size:0.8rem;color:var(--text-light);">
                <i class="fa-solid fa-volume-high" id="musicIcon"></i>
                <button id="toggleMusicBtn" style="background:none;color:var(--primary);font-size:0.8rem;">🔊 تشغيل الموسيقى</button>
            </div>
        </div>
    </div>

    <!-- ===== Background Music ===== -->
    <audio id="bgMusic" loop preload="auto">
        <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" type="audio/mpeg">
    </audio>

    <!-- ===== Main Container ===== -->
    <div class="container">

        <!-- Header -->
        <header class="header">
            <div class="logo"><i class="fa-solid fa-handshake"></i> ماركت الأخوة</div>
            <div class="header-actions">
                <button class="dark-toggle"><i class="fa-solid fa-moon" id="darkModeIcon"></i></button>
                <button onclick="window.toggleInfoModal()"><i class="fa-solid fa-circle-info"></i></button>
                <button onclick="window.toggleAdminPromo()" style="background:var(--secondary);color:#fff;"><i class="fa-solid fa-gear"></i></button>
                <div id="userInfo"><button onclick="window.showLoginModal()" class="btn-primary">تسجيل الدخول</button></div>
                <button class="cart-btn" onclick="window.toggleCartModal()">
                    <i class="fa-solid fa-cart-shopping"></i>
                    <span id="cartCount">0</span>
                </button>
            </div>
        </header>

        <!-- Promotions Banner -->
        <div id="promotionsContainer"></div>

        <!-- Search & Filters -->
        <div class="search-bar">
            <input type="text" id="searchInput" placeholder="🔍 ابحث عن منتج..." oninput="window.filterBySearch(this.value)" />
        </div>
        <div class="categories" id="categoryContainer">
            <button class="cat-chip active" data-cat="all" onclick="window.filterByCategory('all', this)">الكل</button>
            <button class="cat-chip" data-cat="طعام" onclick="window.filterByCategory('طعام', this)">🥘 طعام</button>
            <button class="cat-chip" data-cat="ملابس" onclick="window.filterByCategory('ملابس', this)">👕 ملابس</button>
            <button class="cat-chip" data-cat="إلكترونيات" onclick="window.filterByCategory('إلكترونيات', this)">📱 إلكترونيات</button>
            <button class="cat-chip" data-cat="شحن ألعاب" onclick="window.filterByCategory('شحن ألعاب', this)">🎮 شحن ألعاب</button>
            <button class="cat-chip" data-cat="أخرى" onclick="window.filterByCategory('أخرى', this)">📦 أخرى</button>
        </div>

        <!-- Referral Code -->
        <div id="referralContainer"></div>

        <!-- Products Grid -->
        <div id="productsGrid"></div>

        <!-- Load More -->
        <button id="loadMoreBtn">📦 تحميل المزيد</button>

    </div>

    <!-- ===== Cart Modal ===== -->
    <div id="cartModal" class="modal-overlay">
        <div class="modal-content">
            <h2>
                🛒 سلة المشتريات
                <button class="close-btn" onclick="window.toggleCartModal()">&times;</button>
            </h2>
            <div id="cartItemsContainer"></div>
            <div id="cartSummary" style="display:none;margin-top:16px;"></div>

            <div style="margin-top:16px;">
                <div class="form-group">
                    <label>نوع التوصيل:</label>
                    <select id="deliveryType" onchange="window.updateDelivery()">
                        <option value="inside">داخل عمرانيا (100 ل.س)</option>
                        <option value="outside">خارج عمرانيا</option>
                    </select>
                </div>
                <div id="kmInputContainer" style="display:none;" class="form-group">
                    <label>المسافة (كم):</label>
                    <input type="number" id="deliveryKm" value="1" min="1" onchange="window.updateDelivery()" />
                </div>
            </div>

            <form id="checkoutForm">
                <div class="form-group">
                    <label>رقم الهاتف:</label>
                    <input type="tel" id="userPhone" placeholder="09xxxxxxxx" required />
                </div>
                <div class="form-group">
                    <label>العنوان:</label>
                    <input type="text" id="userAddress" placeholder="العنوان التفصيلي" required />
                </div>
                <input type="hidden" id="finalTotal" />
                <button type="submit" id="submitBtn">🚀 تأكيد الطلب</button>
            </form>
        </div>
    </div>

    <!-- ===== Admin Promo Modal ===== -->
    <div id="adminPromoModal" class="modal-overlay">
        <div class="modal-content">
            <h2>
                ⚙️ إدارة الفعاليات (عروض الادمن)
                <button class="close-btn" onclick="window.toggleAdminPromo()">&times;</button>
            </h2>
            <form id="promoForm">
                <div class="form-group">
                    <label>عنوان العرض (مثال: خصم العيد)</label>
                    <input type="text" id="promoTitle" placeholder="عنوان العرض" required />
                </div>
                <div class="form-group">
                    <label>وصف العرض (مثال: خصم 15% لأول 5 مشترين)</label>
                    <input type="text" id="promoDesc" placeholder="وصف العرض" required />
                </div>
                <div class="form-group">
                    <label>نسبة الخصم (%)</label>
                    <input type="number" id="promoDiscount" placeholder="15" min="1" max="100" required />
                </div>
                <div class="form-group">
                    <label>الحد الأقصى لعدد المستخدمين</label>
                    <input type="number" id="promoMaxUses" placeholder="5" min="1" required />
                </div>
                <button type="submit" class="admin-btn">➕ إضافة العرض</button>
            </form>
            <hr style="margin:20px 0;border-color:var(--border);" />
            <div id="adminPromoList" style="font-size:0.9rem;max-height:200px;overflow-y:auto;"></div>
        </div>
    </div>

    <!-- ===== Info Modal ===== -->
    <div id="infoModal" class="modal-overlay">
        <div class="modal-content">
            <h2>
                ℹ️ معلومات المتجر
                <button class="close-btn" onclick="window.toggleInfoModal()">&times;</button>
            </h2>
            <p style="line-height:1.8;">
                <strong>ماركت الأخوة</strong> – متجر إلكتروني يقدم منتجات متنوعة بأسعار تنافسية.<br />
                ✔️ خصم ذكي تلقائي عند تجاوز 500 ل.س.<br />
                ✔️ كود دعوة يمنح خصم 10% (بدون حد أقصى).<br />
                ✔️ عروض الادمن محدودة العدد تظهر للجميع.<br />
                ✔️ توصيل داخل عمرانيا 100 ل.س، وخارجها 35 ل.س/كم.
            </p>
        </div>
    </div>

    <!-- ===== Toast ===== -->
    <div id="customToast">
        <span id="toastMessage"></span>
    </div>

    <!-- ============================================================ -->
    <!-- ================ JavaScript (ES Module) ======================= -->
    <!-- ============================================================ -->
    <script type="module">
        // استيراد Firebase
        import {
            initializeApp
        } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
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
            arrayRemove
        } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

        // ---------- Firebase Config ----------
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

        // ============================================================
        //  الحالة العامة
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
            referralPoints: {},
            promotions: [], // الفعاليات النشطة
            usedPromoIds: [] // لتتبع العروض المستخدمة محلياً
        };

        // ============================================================
        //  أدوات مساعدة
        // ============================================================
        function escapeHTML(str) {
            if (str == null) return '';
            return String(str).replace(/[&<>'"]/g, tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            })[tag] || tag);
        }

        function validatePhone(phone) {
            return /^[0-9]{7,15}$/.test(phone.trim());
        }

        function validateAddress(address) {
            return address.trim().length >= 5;
        }

        function showToast(message, type = 'info', duration = 3500) {
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

        // ============================================================
        //  نظام المستخدمين (موجود)
        // ============================================================
        function getUser() {
            try {
                const data = localStorage.getItem('alukhowah_user');
                return data ? JSON.parse(data) : null;
            } catch { return null; }
        }

        function setUser(userData) {
            localStorage.setItem('alukhowah_user', JSON.stringify(userData));
            state.user = userData;
            updateUserUI();
        }

        function logoutUser() {
            localStorage.removeItem('alukhowah_user');
            state.user = null;
            updateUserUI();
            showToast('تم تسجيل الخروج', 'info');
        }

        function updateUserUI() {
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

        function showLoginModal() {
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
        //  نظام الدعوة والخصم (تم تعديله: 10% بدون حد أقصى)
        // ============================================================
        function getMyReferralCode() {
            let code = localStorage.getItem('myReferralCode');
            if (!code) {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                localStorage.setItem('myReferralCode', code);
            }
            return code;
        }

        function handleReferral() {
            const params = new URLSearchParams(window.location.search);
            const ref = params.get('ref');
            const myCode = getMyReferralCode();
            if (ref && ref !== myCode && !localStorage.getItem('referralUsed')) {
                localStorage.setItem('invitedBy', ref);
                localStorage.setItem('referralUsed', 'true');
                state.invitedBy = ref;
                let points = JSON.parse(localStorage.getItem('referralPoints') || '{}');
                points[ref] = (points[ref] || 0) + 1;
                localStorage.setItem('referralPoints', JSON.stringify(points));
                state.referralPoints = points;
                setTimeout(() => {
                    showToast('🎉 تم تفعيل كود الخصم 10% على طلبك الأول', 'success', 5000);
                }, 500);
            }
        }

        // 🔥 التعديل المطلوب: إزالة الحد الأقصى 50 وجعلها 10% ثابتة
        function getReferralDiscount(total) {
            if (total < 100) return 0;
            if (!localStorage.getItem('invitedBy')) return 0;
            if (localStorage.getItem('discountApplied') === 'true') return 0;
            return total * 0.10; // 10% بدون حد أقصى
        }

        function applyReferralDiscount(total) {
            const discount = getReferralDiscount(total);
            if (discount > 0) {
                localStorage.setItem('discountApplied', 'true');
                state.discountApplied = true;
            }
            return discount;
        }

        function showReferralCode() {
            const container = document.getElementById('referralContainer');
            if (!container) return;
            const code = getMyReferralCode();
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                    <div>
                        <span style="font-weight:bold;">🎁 كود الخصم: </span>
                        <strong style="font-size:20px;color:#ff6b6b;letter-spacing:2px;background:var(--input-bg);padding:4px 12px;border-radius:6px;">${code}</strong>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button onclick="window.copyReferralCode()" class="btn-secondary">📋 نسخ</button>
                        <button onclick="window.shareReferral()" class="btn-primary">📱 مشاركة</button>
                    </div>
                </div>
                <p style="font-size:12px;color:#888;margin-top:5px;">شارك الكود واحصل على خصم 10% على أول طلب فوق 100 ل.س</p>
            `;
        }

        function copyReferralCode() {
            const code = getMyReferralCode();
            navigator.clipboard.writeText(code)
                .then(() => showToast('✅ تم نسخ الكود: ' + code, 'success'))
                .catch(() => showToast('فشل النسخ، حاول يدوياً', 'error'));
        }

        function shareReferral() {
            const code = getMyReferralCode();
            const message = `🎁 استخدم كود الخصم هذا في متجر ماركت الأخوة واحصل على خصم 10%: ${code}\n📱 ${window.location.href}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        }

        // ============================================================
        //  نظام الفعاليات (العروض الجديدة)
        // ============================================================
        function listenPromotions() {
            const q = query(collection(db, "promotions"), orderBy("createdAt", "desc"));
            onSnapshot(q, (snapshot) => {
                const allPromos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // فلترة النشطة والتي لم تصل للحد الأقصى
                state.promotions = allPromos.filter(p => p.active !== false && (p.usedCount || 0) < (p.maxUses || 999));
                renderPromotions();
                renderAdminPromoList(allPromos);
            }, (error) => {
                console.warn("خطأ في جلب الفعاليات", error);
            });
        }

        function renderPromotions() {
            const container = document.getElementById('promotionsContainer');
            if (!container) return;
            if (state.promotions.length === 0) {
                container.style.display = 'none';
                return;
            }
            container.style.display = 'block';
            container.innerHTML = state.promotions.map(p => `
                <div class="promo-item">
                    <span><strong>🎯 ${escapeHTML(p.title)}</strong> - ${escapeHTML(p.description)}</span>
                    <span class="promo-badge">${p.discountPercent}% خصم | متبقي ${(p.maxUses || 0) - (p.usedCount || 0)}</span>
                </div>
            `).join('');
        }

        // حساب خصم الفعاليات (يُطبق تلقائياً على الإجمالي)
        function getActivePromotionDiscount(total) {
            if (state.promotions.length === 0) return 0;
            // نأخذ أول عرض فعال (يمكن تعديله لأفضل عرض)
            const promo = state.promotions[0];
            // نتأكد أن المستخدم لم يستخدم هذا العرض سابقاً (نمنع التكرار)
            if (state.usedPromoIds.includes(promo.id)) return 0;
            // إذا كان المبلغ مؤهلاً (نطبق على أي مبلغ)
            const discount = total * (promo.discountPercent / 100);
            return Math.min(discount, total); // لا يتجاوز قيمة الفاتورة
        }

        // استهلاك العرض (تسجيل استخدامه)
        async function consumePromotion(promoId) {
            try {
                const promoRef = doc(db, "promotions", promoId);
                await updateDoc(promoRef, {
                    usedCount: (state.promotions.find(p => p.id === promoId)?.usedCount || 0) + 1
                });
                state.usedPromoIds.push(promoId);
                localStorage.setItem('usedPromoIds', JSON.stringify(state.usedPromoIds));
            } catch (e) {
                console.warn("فشل تحديث استخدام العرض", e);
            }
        }

        // واجهة الادمن: إضافة عرض
        async function createPromotion(e) {
            e.preventDefault();
            const title = document.getElementById('promoTitle').value.trim();
            const desc = document.getElementById('promoDesc').value.trim();
            const discount = parseFloat(document.getElementById('promoDiscount').value);
            const maxUses = parseInt(document.getElementById('promoMaxUses').value);

            if (!title || !desc || !discount || !maxUses) {
                showToast('يرجى ملء جميع الحقول', 'error');
                return;
            }

            try {
                await addDoc(collection(db, "promotions"), {
                    title,
                    description: desc,
                    discountPercent: discount,
                    maxUses: maxUses,
                    usedCount: 0,
                    active: true,
                    createdAt: serverTimestamp()
                });
                showToast('✅ تم إضافة العرض بنجاح', 'success');
                document.getElementById('promoForm').reset();
                // إغلاق المودال اختيارياً
                // toggleAdminPromo();
            } catch (error) {
                showToast('❌ فشل الإضافة: ' + error.message, 'error');
            }
        }

        // عرض قائمة العروض في لوحة الادمن
        function renderAdminPromoList(allPromos) {
            const container = document.getElementById('adminPromoList');
            if (!container) return;
            if (!allPromos || allPromos.length === 0) {
                container.innerHTML = '<p style="color:var(--text-light);">لا توجد عروض مضافة بعد.</p>';
                return;
            }
            container.innerHTML = allPromos.map(p => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                    <span><strong>${escapeHTML(p.title)}</strong> (${p.discountPercent}%)</span>
                    <span style="font-size:0.8rem;">${p.usedCount || 0}/${p.maxUses || 0}</span>
                </div>
            `).join('');
        }

        function toggleAdminPromo() {
            const modal = document.getElementById('adminPromoModal');
            if (modal) modal.classList.toggle('open');
        }

        // ============================================================
        //  السلة (مع دمج خصم الفعاليات)
        // ============================================================
        function loadCart() {
            try {
                const saved = localStorage.getItem('alukhowah_cart');
                if (saved) {
                    state.cart = JSON.parse(saved);
                    state.cart = state.cart.map(item => {
                        const product = state.products.find(p => String(p.id) === String(item.id));
                        if (product) {
                            const discount = product.discount ? Number(product.discount) : 0;
                            const basePrice = Number(product.price) || 0;
                            const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) :
                            basePrice;
                            return { ...item, price: finalPrice, discount };
                        }
                        return item;
                    });
                    saveCart();
                }
                // تحميل العروض المستخدمة
                const used = localStorage.getItem('usedPromoIds');
                if (used) state.usedPromoIds = JSON.parse(used);
            } catch (e) { state.cart = []; }
        }

        function saveCart() {
            try {
                localStorage.setItem('alukhowah_cart', JSON.stringify(state.cart));
            } catch (e) { /* تجاهل */ }
        }

        function addToCart(id) {
            const product = state.products.find(p => String(p.id) === String(id));
            if (!product) {
                showToast('المنتج غير موجود', 'error');
                return;
            }
            if (product.available === false) {
                showToast('⚠️ هذا المنتج غير متوفر حالياً', 'error');
                return;
            }
            if (product.category === 'شحن ألعاب') {
                redirectToWhatsApp(product);
                return;
            }
            const idx = state.cart.findIndex(item => String(item.id) === String(id));
            if (idx > -1) {
                state.cart[idx].qty += 1;
            } else {
                const discount = product.discount ? Number(product.discount) : 0;
                const basePrice = Number(product.price) || 0;
                const finalPrice = discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
                state.cart.push({ ...product, price: finalPrice, discount, qty: 1 });
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

        function changeQty(id, delta) {
            const idx = state.cart.findIndex(item => String(item.id) === String(id));
            if (idx > -1) {
                state.cart[idx].qty += delta;
                if (state.cart[idx].qty <= 0) {
                    state.cart.splice(idx, 1);
                }
                saveCart();
                updateCartBadge();
                renderCartItems();
            }
        }

        function removeFromCart(id) {
            if (!confirm('هل أنت متأكد من حذف هذا المنتج من السلة؟')) return;
            state.cart = state.cart.filter(item => String(item.id) !== String(id));
            saveCart();
            updateCartBadge();
            renderCartItems();
            showToast('تم الحذف', 'info');
        }

        function updateCartBadge() {
            const total = state.cart.reduce((sum, item) => sum + item.qty, 0);
            const badge = document.getElementById('cartCount');
            if (badge) badge.innerText = total;
        }

        // ============================================================
        //  حساب الإجمالي (مع خصم الدعوة + خصم الفعاليات)
        // ============================================================
        function calculateFinalTotal() {
            const itemsTotal = state.cart.reduce((sum, item) => {
                const qty = Math.max(0, item.qty);
                return sum + (item.price * qty);
            }, 0);

            // خصم ذكي
            let smartDiscountPercent = 0;
            if (itemsTotal >= 1000) smartDiscountPercent = 10;
            else if (itemsTotal >= 500) smartDiscountPercent = 5;
            const smartDiscountAmount = itemsTotal * (smartDiscountPercent / 100);
            let discountedItemsTotal = Math.max(0, itemsTotal - smartDiscountAmount);

            // خصم الدعوة (10% بدون حد أقصى)
            const referralDiscount = getReferralDiscount(discountedItemsTotal);
            discountedItemsTotal = Math.max(0, discountedItemsTotal - referralDiscount);

            // خصم الفعاليات (من الادمن)
            const promoDiscount = getActivePromotionDiscount(discountedItemsTotal);
            discountedItemsTotal = Math.max(0, discountedItemsTotal - promoDiscount);

            // التوصيل
            let deliveryCost = 0;
            if (state.deliveryType === 'inside') {
                deliveryCost = 100;
            } else {
                const km = Math.max(1, Number(state.deliveryKm) || 1);
                deliveryCost = km * 35;
            }

            const finalTotal = discountedItemsTotal + deliveryCost;

            return {
                itemsTotal,
                smartDiscountPercent,
                smartDiscountAmount,
                referralDiscount,
                promoDiscount,
                discountedItemsTotal,
                deliveryCost,
                finalTotal
            };
        }

        // ============================================================
        //  عرض السلة
        // ============================================================
        function toggleCartModal() {
            const modal = document.getElementById('cartModal');
            if (!modal) return;
            modal.classList.toggle('open');
            if (modal.classList.contains('open')) {
                updateDelivery();
                renderCartItems();
            }
        }

        function renderCartItems() {
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
                    <div class="cart-item" data-id="${item.id}">
                        <div>
                            <strong>${escapeHTML(item.name)}</strong>
                            <div style="font-size:12px;color:#666;">${item.price} Lt × ${item.qty}</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button class="qty-btn" onclick="window.changeQty('${item.id}', -1)">-</button>
                            <span style="font-weight:bold;">${item.qty}</span>
                            <button class="qty-btn" onclick="window.changeQty('${item.id}', 1)">+</button>
                            <span style="font-weight:bold;color:var(--primary);">${itemTotal} Lt</span>
                            <i class="fa-solid fa-trash" style="color:red;cursor:pointer;" onclick="window.removeFromCart('${item.id}')"></i>
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
                    ${calc.promoDiscount > 0 ? `<div class="summary-line discount-text"><span>🎯 خصم الفعالية:</span><span>-${Math.round(calc.promoDiscount)} Lt</span></div>` : ''}
                    <div class="summary-line"><span>🚚 التوصيل (${state.deliveryType === 'inside' ? 'داخل عمرانيا' : 'خارج ' + state.deliveryKm + ' كم'}):</span><span>${calc.deliveryCost} Lt</span></div>
                    <div class="summary-line total"><span>💰 الإجمالي النهائي:</span><span>${Math.round(calc.finalTotal)} Lt</span></div>
                `;
                const finalTotalInput = document.getElementById('finalTotal');
                if (finalTotalInput) finalTotalInput.value = Math.round(calc.finalTotal);
            }
        }

        function updateDelivery() {
            const typeEl = document.getElementById('deliveryType');
            const kmContainer = document.getElementById('kmInputContainer');
            if (typeEl) {
                state.deliveryType = typeEl.value;
                if (kmContainer) kmContainer.style.display = state.deliveryType === 'outside' ? 'block' : 'none';
            }
            const kmEl = document.getElementById('deliveryKm');
            if (kmEl) state.deliveryKm = Number(kmEl.value) || 1;
            renderCartItems();
        }

        // ============================================================
        //  إرسال الطلب (مع استهلاك العرض)
        // ============================================================
        function initCheckoutForm() {
            const form = document.getElementById('checkoutForm');
            if (!form) return;

            form.addEventListener('submit', async function(e) {
                e.preventDefault();
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
                    showToast('رقم الهاتف غير صحيح (7-15 رقم)', 'error');
                    return;
                }
                if (!validateAddress(address)) {
                    showToast('العنوان قصير جداً (أقل من 5 أحرف)', 'error');
                    return;
                }

                state.isSubmitting = true;
                submitBtn.innerText = 'جاري إرسال الطلب...';
                submitBtn.disabled = true;

                const itemsSummary = state.cart.map(i => `${i.name} (${i.qty})`).join(' - ');
                const calc = calculateFinalTotal();

                try {
                    // استهلاك العرض الترويجي إذا طُبق
                    if (calc.promoDiscount > 0 && state.promotions.length > 0) {
                        const promo = state.promotions[0];
                        await consumePromotion(promo.id);
                    }

                    const orderData = {
                        phone: String(phone),
                        address: String(address),
                        items: String(itemsSummary),
                        total: Math.round(calc.finalTotal),
                        itemsTotal: calc.itemsTotal,
                        smartDiscount: Math.round(calc.smartDiscountAmount),
                        referralDiscount: Math.round(calc.referralDiscount),
                        promoDiscount: Math.round(calc.promoDiscount),
                        deliveryCost: calc.deliveryCost,
                        deliveryType: state.deliveryType === 'inside' ? 'داخل عمرانيا' :
                            `خارج عمرانيا (${state.deliveryKm} كم)`,
                        date: new Date().toLocaleString('ar-EG'),
                        createdAt: serverTimestamp(),
                        userId: state.user?.phone || 'guest'
                    };

                    const docRef = await addDoc(collection(db, "orders"), orderData);

                    if (state.user) {
                        state.user.orders = state.user.orders || [];
                        state.user.orders.push({ id: docRef.id, ...orderData });
                        setUser(state.user);
                    }

                    showToast(`✅ تم إرسال طلبك بنجاح!\nالإجمالي: ${Math.round(calc.finalTotal)} Lt`, 'success', 5000);
                    state.cart = [];
                    saveCart();
                    updateCartBadge();
                    renderCartItems();
                    toggleCartModal();
                    form.reset();
                } catch (error) {
                    showToast('❌ حدث خطأ أثناء إرسال الطلب: ' + error.message, 'error');
                } finally {
                    state.isSubmitting = false;
                    submitBtn.innerText = '🚀 تأكيد الطلب';
                    submitBtn.disabled = false;
                }
            });
        }

        // ============================================================
        //  عرض المنتجات
        // ============================================================
        function displayProducts(items, append = false) {
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
                const available = p.available !== false;

                const card = document.createElement('div');
                card.className = 'product-card';
                card.dataset.id = p.id;

                const discount = p.discount ? Number(p.discount) : 0;
                if (discount > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'discount-badge';
                    badge.textContent = `-${discount}%`;
                    card.appendChild(badge);
                }

                const favBtn = document.createElement('div');
                favBtn.className = `fav-btn ${isFav ? 'active' : ''}`;
                favBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
                favBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.toggleFavorite(p.id);
                };
                card.appendChild(favBtn);

                const imgContainer = document.createElement('div');
                imgContainer.className = 'product-img';
                if (isValid) {
                    const img = document.createElement('img');
                    img.src = imgUrl;
                    img.alt = escapeHTML(p.name);
                    img.loading = 'lazy';
                    img.onerror = () => {
                        img.style.display = 'none';
                        img.nextElementSibling.style.display = 'flex';
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

                const info = document.createElement('div');
                info.className = 'product-info';
                const title = document.createElement('div');
                title.className = 'product-title';
                title.textContent = p.name;
                info.appendChild(title);

                const priceDiv = document.createElement('div');
                priceDiv.className = 'product-price';
                const originalPrice = Number(p.price) || 0;
                const finalPrice = discount > 0 ? Math.round(originalPrice - (originalPrice * discount / 100)) :
                originalPrice;
                if (discount > 0) {
                    const old = document.createElement('span');
                    old.className = 'old-price';
                    old.textContent = `${originalPrice} Lt`;
                    priceDiv.appendChild(old);
                }
                priceDiv.appendChild(document.createTextNode(`${finalPrice} Lt`));
                info.appendChild(priceDiv);

                const availSpan = document.createElement('span');
                availSpan.className = `availability-badge ${available ? 'available' : 'unavailable'}`;
                availSpan.textContent = available ? '✅ متوفر' : '❌ غير متوفر';
                info.appendChild(availSpan);

                card.appendChild(info);

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'toggle-availability';
                toggleBtn.textContent = available ? '🔁 تعيين غير متوفر' : '🔁 تعيين متوفر';
                toggleBtn.onclick = (e) => {
                    e.stopPropagation();
                    window.toggleProductAvailability(p.id, !available);
                };
                card.appendChild(toggleBtn);

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

                const addBtn = document.createElement('button');
                addBtn.className = 'btn-add-cart';
                addBtn.textContent = available ? '+ أضف للسلة' : '🚫 غير متوفر';
                addBtn.disabled = !available;
                addBtn.style.opacity = available ? '1' : '0.6';
                addBtn.onclick = () => {
                    if (available) window.addToCart(p.id);
                    else showToast('هذا المنتج غير متوفر حالياً', 'error');
                };
                card.appendChild(addBtn);

                fragment.appendChild(card);
            });

            grid.appendChild(fragment);
        }

        async function toggleProductAvailability(productId, newAvailability) {
            try {
                const productRef = doc(db, "products", productId);
                await updateDoc(productRef, { available: newAvailability });
                showToast(`✅ تم تحديث الحالة إلى ${newAvailability ? 'متوفر' : 'غير متوفر'}`, 'success');
            } catch (error) {
                showToast('❌ فشل تحديث الحالة: ' + error.message, 'error');
            }
        }

        // ============================================================
        //  التصفية والبحث والترحيل
        // ============================================================
        let searchTimeout = null;

        function filterBySearch(query) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchQuery = query.trim();
                resetPagination();
                applyFilters();
            }, 300);
        }

        function filterByCategory(cat, element) {
            document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            if (element) element.classList.add('active');
            state.currentCategory = cat;
            resetPagination();
            applyFilters();
        }

        function resetPagination() {
            state.lastDoc = null;
            state.hasMore = true;
            state.filteredProducts = [];
            window._displayedCount = 0;
        }

        function applyFilters() {
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

        function loadMoreProducts() {
            if (state.isLoading || !state.hasMore) return;
            state.isLoading = true;
            const btn = document.getElementById('loadMoreBtn');
            if (btn) { btn.disabled = true;
                btn.textContent = 'جاري التحميل...'; }
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
        function getFavorites() {
            try {
                const data = localStorage.getItem('alukhowah_favs');
                return data ? JSON.parse(data) : [];
            } catch { return []; }
        }

        function toggleFavorite(id) {
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
        function toggleDarkMode() {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('alukhowah_dark', isDark ? 'true' : 'false');
            state.isDarkMode = isDark;
            document.querySelectorAll('.dark-toggle i, #adminDarkIcon, #darkModeIcon').forEach(icon => {
                icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            });
        }

        function loadDarkModePreference() {
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
        function shareProduct(platform, productName, productPrice) {
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
                    .then(() => showToast('✅ تم نسخ الرابط، الصقه في انستا', 'success'))
                    .catch(() => showToast('فشل النسخ', 'error'));
            } else {
                window.open(links[platform], '_blank');
            }
        }

        // ============================================================
        //  رفع الصور
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

        async function uploadImageToImgBB(fileOrInput) {
            let file = null;
            if (fileOrInput instanceof File) file = fileOrInput;
            else if (fileOrInput?.files?.[0]) file = fileOrInput.files[0];
            else return '';
            try {
                const compressedBase64 = await compressImage(file, 300, 0.7);
                if (!compressedBase64) return '';
                const blob = await fetch(compressedBase64).then(r => r.blob());
                const formData = new FormData();
                formData.append('image', blob, 'product.jpg');
                const myKey = "42b6820dc31a25d977adefc41f83aa70";
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${myKey}`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.data?.url) return data.data.url;
                }
            } catch (e) {
                console.warn("ImgBB فشل، نستخدم Base64", e);
            }
            return await compressImage(file, 300, 0.7);
        }

        // ============================================================
        //  الاستماع لتغييرات Firebase
        // ============================================================
        function initProductsListener() {
            const grid = document.getElementById('productsGrid');
            if (!grid) return;
            const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
            onSnapshot(q, (snapshot) => {
                const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                state.products = newProducts;
                loadCart();
                resetPagination();
                applyFilters();
                updateCartBadge();
                showToast('تم تحديث المنتجات', 'info', 2000);
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

        // ============================================================
        //  مودال المعلومات
        // ============================================================
        function toggleInfoModal() {
            const modal = document.getElementById('infoModal');
            if (modal) modal.classList.toggle('open');
        }

        // ============================================================
        //  تهيئة الصفحة الرئيسية
        // ============================================================
        function initMainPage() {
            loadDarkModePreference();

            const enterBtn = document.getElementById('enterBtn');
            const welcomeOverlay = document.getElementById('welcomeOverlay');
            const bgMusic = document.getElementById('bgMusic');
            const toggleMusicBtn = document.getElementById('toggleMusicBtn');
            const musicIcon = document.getElementById('musicIcon');

            if (enterBtn && welcomeOverlay) {
                enterBtn.addEventListener('click', () => {
                    if (bgMusic) {
                        bgMusic.play()
                            .then(() => { if (musicIcon) musicIcon.className = 'fa-solid fa-volume-high'; })
                            .catch(() => {});
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

            // تحميل حالة المستخدم والمفضلة والسلة
            state.user = getUser();
            state.favorites = getFavorites();
            loadCart();

            // بدء الاستماع
            initProductsListener();
            listenPromotions(); // استماع الفعاليات

            initCheckoutForm();
            handleReferral();
            showReferralCode();
            updateUserUI();
            updateCartBadge();

            // ربط الدوال بالنافذة
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
            window.toggleProductAvailability = toggleProductAvailability;
            window.toggleAdminPromo = toggleAdminPromo;
            window.createPromotion = createPromotion;

            // ربط نموذج الادمن
            const promoForm = document.getElementById('promoForm');
            if (promoForm) {
                promoForm.addEventListener('submit', createPromotion);
            }

            applyFilters();
        }

        // ============================================================
        //  تصدير العناصر الأساسية
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
            arrayRemove
        };

        // بدء التطبيق
        initMainPage();
    </script>
</body>
</html>
