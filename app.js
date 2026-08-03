// استيراد مكتبات فايربيس (Firebase v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, 
    onSnapshot, query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// إعدادات مشروع فايربيس (قم باستبدالها بمعلومات مشروعك الفعلي)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// تهيئة فايربيس
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// دالة حماية النصوص من هجمات XSS
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(ضغط الحالات الشاذة / /g, '&#039;');
}

// دالة رفع الصور إلى موقع ImgBB مجاناً
async function uploadImageToImgBB(file) {
    const apiKey = 'YOUR_IMGBB_API_KEY'; // ضع مفتاح ImgBB الخاص بك هنا
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data && data.success) {
            return data.data.url;
        } else {
            throw new Error('فشل رفع الصورة عبر خدمة ImgBB');
        }
    } catch (error) {
        console.error('خطأ في رفع الصورة:', error);
        throw error;
    }
}

// وظائف تبديل المظهر (الليلي / النهاري)
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateDarkIcon(isDark);
}

function loadDarkModePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        updateDarkIcon(true);
    } else {
        updateDarkIcon(false);
    }
}

function updateDarkIcon(isDark) {
    const icon1 = document.getElementById('adminDarkIcon');
    const icon2 = document.getElementById('storeDarkIcon');
    if (icon1) {
        icon1.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    if (icon2) {
        icon2.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
}

// تصدير الأدوات للاستخدام في باقي الملفات
export {
    db,
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    escapeHTML,
    uploadImageToImgBB,
    toggleDarkMode,
    loadDarkModePreference
};
