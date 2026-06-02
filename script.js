let activeVideoId = null;

// عند تحميل الصفحة بالكامل
document.addEventListener("DOMContentLoaded", () => {
    updateStats();
    // حساب إجمالي الكروت تلقائياً وتحديث الواجهة
    const total = document.querySelectorAll('.video-card').length;
    document.getElementById('totalVideos').innerText = total;
});

// فتح نافذة الدفع
function openPaywall(id, title, price) {
    activeVideoId = id;
    
    // إذا كان الفيديو تم شراؤه مسبقاً وفك قفله
    if (localStorage.getItem(id) === 'unlocked') {
        showToast("هذا الفيديو مفتوح بالفعل! مشاهدة ممتعة.");
        return;
    }

    document.getElementById('modalVideoTitle').innerText = title;
    document.getElementById('modalVideoPrice').innerText = price;
    document.getElementById('paywallModal').classList.add('active');
}

// إغلاق نافذة الدفع
function closePaywall() {
    document.getElementById('paywallModal').classList.remove('active');
}

// معالجة الدفع الوهمي والتحميل المؤقت
function processPayment() {
    const loader = document.getElementById('loadingOverlay');
    
    closePaywall();
    loader.classList.add('active');

    // محاكاة الاتصال ببوابة الدفع لمدة ثانيتين
    setTimeout(() => {
        loader.classList.remove('active');
        
        // حفظ القفل المفتوح في ذاكرة المتصفح المحلية
        localStorage.setItem(activeVideoId, 'unlocked');
        
        // تحديث كارت الفيديو والإحصائيات فوراً
        unlockVideoUI(activeVideoId);
        updateStats();
        showToast("تمت عملية الدفع بنجاح! تم إلغاء تشويش الفيديو.");
    }, 2000);
}

// تحديث واجهة الفيديو المفتوح (إزالة التشويش والقفل)
function unlockVideoUI(id) {
    const card = document.getElementById(id);
    if (card) {
        card.classList.add('purchased');
        const thumb = card.querySelector('.video-thumbnail');
        thumb.classList.remove('blurred');
        
        const priceTag = card.querySelector('.price-tag');
        if (priceTag) {
            priceTag.innerHTML = '<i class="fa-solid fa-unlock"></i> تم الشراء';
            priceTag.classList.add('purchased');
        }
    }
}

// تحديث شريط الإحصائيات وفحص التخزين المحلي
function updateStats() {
    let unlockedCount = 0;
    const cards = document.querySelectorAll('.video-card');
    
    cards.forEach(card => {
        const id = card.id;
        if (localStorage.getItem(id) === 'unlocked') {
            unlockVideoUI(id);
            unlockedCount++;
        }
    });
    
    document.getElementById('unlockedVideos').innerText = unlockedCount;
}

// إعادة تعيين وقفل كل الفيديوهات من جديد للتجربة والتحقق
function resetAllVideos() {
    if (confirm("هل تريد إعادة تشويش جميع الفيديوهات وإعادة قفلها للتجربة من جديد؟")) {
        localStorage.clear();
        location.reload();
    }
}

// إظهار التنبيه الأسفل المتناسق (Toast)
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// إغلاق النافذة عند النقر خارج المحتوى الداخلي لها
window.onclick = function(event) {
    const modal = document.getElementById('paywallModal');
    if (event.target === modal) {
        closePaywall();
    }
}
