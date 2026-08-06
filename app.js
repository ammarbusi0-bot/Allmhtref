<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم - ماركت الأخوة</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #f27a1a;
            --bg: #f5f5f5;
            --card-bg: #ffffff;
            --text: #333333;
            --border: #e6e6e6;
            --danger: #e63946;
            --success: #2ecc71;
            --warning: #f39c12;
            --info: #3498db;
            --input-bg: #f0f0f0;
            --shadow: rgba(0,0,0,0.05);
        }
        body.dark {
            --bg: #1a1a1a;
            --card-bg: #2d2d2d;
            --text: #e0e0e0;
            --border: #444;
            --input-bg: #3a3a3a;
            --shadow: rgba(0,0,0,0.3);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: var(--bg); color: var(--text); padding: 20px 10px 80px 10px; }

        #loginOverlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .login-box {
            background: var(--card-bg);
            padding: 30px;
            border-radius: 12px;
            width: 100%;
            max-width: 400px;
            text-align: center;
        }
        .login-box h2 { margin-bottom: 15px; color: var(--primary); }
        .login-box input {
            width: 100%;
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--input-bg);
            color: var(--text);
        }

        .admin-container { max-width: 1400px; margin: 0 auto; display: none; }
        h1, h2, h3 { margin-bottom: 15px; color: var(--primary); }
        .card {
            background: var(--card-bg);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 25px;
            border: 1px solid var(--border);
            box-shadow: 0 2px 8px var(--shadow);
        }

        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-size: 14px; font-weight: bold; margin-bottom: 5px; }
        .form-group input, .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--input-bg);
            color: var(--text);
        }

        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 15px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: opacity 0.2s;
        }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn:hover:not(:disabled) { opacity: 0.9; }
        .btn-secondary { background: #6c757d; }
        .btn-success { background: var(--success); }
        .btn-danger { background: var(--danger); }
        .btn-warning { background: var(--warning); }
        .btn-info { background: var(--info); }
        .btn-small { padding: 5px 10px; font-size: 12px; }
        .btn-block { width: 100%; }

        .table-responsive { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: right; border-bottom: 1px solid var(--border); font-size: 14px; }
        th { background: var(--input-bg); }

        .order-card {
            border-right: 4px solid var(--primary);
            padding: 15px;
            margin-bottom: 15px;
            background: var(--card-bg);
            border-radius: 4px;
            border: 1px solid var(--border);
        }

        .product-img-preview { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }

        .badge { background: var(--primary); color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
        .badge-discount { background: var(--danger); }
        .badge-available { background: var(--success); }
        .badge-unavailable { background: var(--danger); }
        .badge-status-new { background: var(--warning); }
        .badge-status-processing { background: var(--info); }
        .badge-status-delivered { background: var(--success); }
        .badge-status-canceled { background: var(--danger); }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: var(--card-bg);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border);
            text-align: center;
        }
        .stat-card .number { font-size: 28px; font-weight: bold; color: var(--primary); }
        .stat-card .label { font-size: 13px; color: #888; }

        .modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .modal-box {
            background: var(--card-bg);
            padding: 25px;
            border-radius: 10px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
        }
        .modal-box .close-btn {
            float: left;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text);
        }

        .filter-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
            align-items: center;
        }
        .filter-bar input, .filter-bar select {
            padding: 8px 12px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--input-bg);
            color: var(--text);
        }
        .filter-bar .btn { padding: 8px 16px; }

        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            margin-top: 15px;
        }
        .pagination button { padding: 5px 15px; }

        .dark-toggle {
            position: fixed;
            top: 15px; left: 15px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 50%;
            width: 40px; height: 40px;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; cursor: pointer; z-index: 999;
            color: var(--text);
        }

        .toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--card-bg);
            color: var(--text);
            padding: 12px 24px;
            border-radius: 8px;
            border: 1px solid var(--border);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 99999;
            display: none;
            font-size: 14px;
            max-width: 90%;
        }
        .toast.success { border-right: 4px solid var(--success); }
        .toast.error { border-right: 4px solid var(--danger); }
        .toast.info { border-right: 4px solid var(--info); }

        .status-select { padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border); background: var(--input-bg); color: var(--text); }

        @media (max-width: 600px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .filter-bar { flex-direction: column; }
            .filter-bar input, .filter-bar select { width: 100%; }
        }
    </style>
</head>
<body>

    <button class="dark-toggle" id="adminDarkToggle" title="تبديل المظهر">
        <i class="fa-solid fa-moon" id="adminDarkIcon"></i>
    </button>

    <div id="loginOverlay">
        <div class="login-box">
            <h2><i class="fa-solid fa-lock"></i> دخول المسؤول</h2>
            <p style="font-size: 13px; color: #666; margin-bottom: 15px;">يرجى إدخال كلمة المرور للوصول إلى اللوحة</p>
            <input type="password" id="adminPassInput" placeholder="أدخل كلمة المرور">
            <button class="btn btn-block" id="loginBtn">تسجيل الدخول</button>
        </div>
    </div>

    <div class="admin-container" id="adminMainContent">

        <h1><i class="fa-solid fa-user-gear"></i> لوحة إدارة المتجر</h1>

        <div class="card">
            <h2>📊 الإحصائيات</h2>
            <div class="stats-grid" id="statsGrid">
                <div class="stat-card"><div class="number" id="statTotalOrders">0</div><div class="label">إجمالي الطلبات</div></div>
                <div class="stat-card"><div class="number" id="statTotalSales">0</div><div class="label">إجمالي المبيعات</div></div>
                <div class="stat-card"><div class="number" id="statTotalProducts">0</div><div class="label">إجمالي المنتجات</div></div>
                <div class="stat-card"><div class="number" id="statDailySales">0</div><div class="label">مبيعات اليوم</div></div>
                <div class="stat-card"><div class="number" id="statAvgOrder">0</div><div class="label">متوسط الطلب</div></div>
                <div class="stat-card"><div class="number" id="statCanceled">0</div><div class="label">طلبات ملغاة</div></div>
            </div>
        </div>

        <div class="card">
            <h2>📦 الطلبات الواردة</h2>
            <div class="filter-bar">
                <input type="text" id="adminSearchOrders" placeholder="🔍 بحث في الطلبات...">
                <select id="adminFilterOrderStatus">
                    <option value="all">جميع الحالات</option>
                    <option value="جديد">جديد</option>
                    <option value="قيد المعالجة">قيد المعالجة</option>
                    <option value="تم التوصيل">تم التوصيل</option>
                    <option value="ملغي">ملغي</option>
                </select>
                <button class="btn btn-success btn-small" onclick="window.exportOrdersCSV()">📥 تصدير CSV</button>
            </div>
            <div id="ordersContainer"><p>جاري تحميل الطلبات...</p></div>
            <div class="pagination">
                <button class="btn btn-small" id="adminOrdersPrev">السابق</button>
                <span id="adminOrdersPageInfo">صفحة 1</span>
                <button class="btn btn-small" id="adminOrdersNext">التالي</button>
            </div>
        </div>

        <div class="card">
            <h2>➕ إضافة منتج جديد</h2>
            <form id="addProductForm">
                <div class="form-group">
                    <label>اسم المنتج:</label>
                    <input type="text" id="pName" required placeholder="مثال: متة 250غ">
                </div>
                <div class="form-group">
                    <label>السعر (ل.س):</label>
                    <input type="number" id="pPrice" required placeholder="مثال: 25000" min="1">
                </div>
                <div class="form-group">
                    <label>القسم:</label>
                    <select id="pCategory" required></select>
                </div>
                <div class="form-group">
                    <label>نسبة الخصم % (اختياري):</label>
                    <input type="number" id="pDiscount" placeholder="0" min="0" max="99" value="0">
                </div>
                <div class="form-group">
                    <label>حالة المنتج:</label>
                    <select id="pInStock">
                        <option value="true">متوفر</option>
                        <option value="false">غير متوفر</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>إدارة الأقسام:</label>
                    <button type="button" class
