// مصفوفة البيانات للفيديوهات المتاحة في المعرض
const sampleVideos = [
    {
        id: 1,
        title: "تسريب حصرى 2026: لقطات مشوقة من الفيلم السري المنتظر كاملة",
        views: "680 ألف مشاهدة",
        time: "قبل 3 ساعات",
        category: "leaks",
        img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400"
    },
    {
        id: 2,
        title: "أقوى مطاردات قتالية وإثارة شوارع حقيقية مصورة بكاميرا خفية",
        views: "1.5 مليون مشاهدة",
        time: "قبل يوم واحد",
        category: "action",
        img: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400"
    },
    {
        id: 3,
        title: "شاهد كواليس إنتاج سينما الغموض والإثارة النفسية الأكثر طلباً",
        views: "310 ألف مشاهدة",
        time: "قبل يومين",
        category: "cinema",
        img: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400"
    }
];

// دالة لبناء وعرض كروت الفيديوهات بشكل منظم
function loadGallery(videos) {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = '';

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="thumbnail-box locate-click">
                <img src="${video.img}" alt="video thumbnail">
                <div class="play-overlay">
                    <i class="fa-solid fa-play"></i>
                </div>
                <span class="duration-badge">14:20</span>
            </div>
            <div class="video-details">
                <div class="video-title-text">${video.title}</div>
                <div class="video-stats-text">${video.views} • ${video.time}</div>
            </div>
        `;
        
        // عند النقر على الكرت تفتح نافذة التفاصيل لإعطاء واقعية كاملة
        card.addEventListener('click', () => triggerPopup(video.title));
        grid.appendChild(card);
    });
}

// دالة إظهار النافذة المنبثقة وإضافة تعليقات وهمية لتبدو مقنعة
function triggerPopup(title) {
    const modal = document.getElementById('videoModal');
    const body = document.getElementById('modalBody');
    
    body.innerHTML = `
        <h3 style="margin-bottom: 12px; color: #ff0033;"><i class="fa-solid fa-lock"></i> محتوى مقيد ومحمي</h3>
        <p style="margin-bottom: 15px; font-size: 14px; font-weight: 600;">"${title}"</p>
        <p style="color: #bbb; font-size: 13px; margin-bottom: 20px;">
            عذراً، هذا الفيديو متاح فقط لأعضاء نظام التحقق الخارجي. يرجى إتمام التحقق لفك التشفير تلقائياً ومتابعة العرض.
        </p>
        
        <div class="comment-section">
            <div class="comment-title">التعليقات الأخيرة على هذا المقطع (${Math.floor(Math.random() * 50) + 10})</div>
            <div class="comment-item">
                <span class="comment-user">أحمد_VIP:</span>
                <span class="comment-text">تم فك التشفير بنجاح، الجودة خرافية! شكراً لكم.</span>
            </div>
            <div class="comment-item">
                <span class="comment-user">سارة_99:</span>
                <span class="comment-text">المقطع حماسي جداً يستحق التجربة هههههه.</span>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// إغلاق النافذة المنبثقة عند الضغط على علامة X
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('videoModal').classList.remove('active');
});

// نظام التصفية حسب الفئة المختارة من القائمة الجانبية
document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelector('.sidebar-menu li.active').classList.remove('active');
        this.classList.add('active');
        
        const cat = this.getAttribute('data-category');
        if (cat === 'all') {
            loadGallery(sampleVideos);
        } else {
            const filtered = sampleVideos.filter(v => v.category === cat);
            loadGallery(filtered);
        }
    });
});

// تشغيل جلب البيانات عند تحميل الصفحة لأول مرة
window.onload = () => {
    loadGallery(sampleVideos);
};
