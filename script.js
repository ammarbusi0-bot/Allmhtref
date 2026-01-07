// بيانات المستخدمين المسموح لهم
const users = {
    "ammar": "admin123"
};

// بيانات المنشورات (سيتم تخزينها في localStorage)
let posts = JSON.parse(localStorage.getItem('posts')) || [
    {
        id: 1,
        title: "مرحباً بكم في الموقع",
        content: "هذه أول منشور في موقعنا التفاعلي. يمكن للمشرفين إضافة منشورات جديدة تظهر هنا.",
        date: "2023-10-01",
        author: "ammar"
    },
    {
        id: 2,
        title: "كيفية استخدام الموقع",
        content: "يمكن للمستخدمين رؤية جميع المنشورات التي ينشرها المشرفون في هذه الصفحة.",
        date: "2023-10-02",
        author: "ammar"
    }
];

// تهيئة البيانات إذا لم تكن موجودة
if (!localStorage.getItem('posts')) {
    localStorage.setItem('posts', JSON.stringify(posts));
}

// تحقق مما إذا كان المستخدم مسجلاً دخوله
function isLoggedIn() {
    return localStorage.getItem('loggedInUser') !== null;
}

// تسجيل الدخول
function login(username, password) {
    if (users[username] && users[username] === password) {
        localStorage.setItem('loggedInUser', username);
        return true;
    }
    return false;
}

// تسجيل الخروج
function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

// إضافة منشور جديد
function addPost(title, content) {
    const user = localStorage.getItem('loggedInUser');
    if (!user) return false;
    
    const newPost = {
        id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
        title: title || "منشور بدون عنوان",
        content: content,
        date: new Date().toISOString().split('T')[0],
        author: user
    };
    
    posts.unshift(newPost);
    localStorage.setItem('posts', JSON.stringify(posts));
    return true;
}

// عرض المنشورات في الصفحة الرئيسية
function displayPosts() {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;
    
    // إذا لم يكن هناك منشورات
    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="message">
                <i class="fas fa-info-circle"></i>
                <p>لا توجد منشورات حتى الآن. سيتم عرض المنشورات هنا عندما يقوم المشرف بنشرها.</p>
            </div>
        `;
        return;
    }
    
    // عرض المنشورات
    postsContainer.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="post-title">${post.title}</div>
                <div class="post-date">${post.date}</div>
            </div>
            <div class="post-content">${post.content}</div>
        </div>
    `).join('');
}

// عرض المنشورات في لوحة التحكم
function displayAdminPosts() {
    const adminPostsList = document.getElementById('adminPostsList');
    if (!adminPostsList) return;
    
    // إذا لم يكن هناك منشورات
    if (posts.length === 0) {
        adminPostsList.innerHTML = `
            <div class="message">
                <i class="fas fa-info-circle"></i>
                <p>لا توجد منشورات حتى الآن. يمكنك إضافة منشور جديد باستخدام النموذج أعلاه.</p>
            </div>
        `;
        return;
    }
    
    // عرض المنشورات
    adminPostsList.innerHTML = posts.map(post => `
        <div class="post-item">
            <div class="post-item-header">
                <div class="post-item-title">${post.title}</div>
                <div class="post-item-date">${post.date}</div>
            </div>
            <div class="post-item-content">${post.content}</div>
        </div>
    `).join('');
}

// عرض اسم المشرف في لوحة التحكم
function displayAdminName() {
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement) {
        const user = localStorage.getItem('loggedInUser') || 'المشرف';
        adminNameElement.textContent = user;
    }
}

// إظهار رسالة
function showMessage(elementId, message, type = 'error') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = message;
    element.className = `message ${type}`;
    
    // إخفاء الرسالة بعد 5 ثواني
    if (type === 'success') {
        setTimeout(() => {
            element.innerHTML = '';
            element.className = '';
        }, 5000);
    }
}

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // عرض المنشورات في الصفحة الرئيسية
    displayPosts();
    
    // عرض المنشورات في لوحة التحكم
    displayAdminPosts();
    
    // عرض اسم المشرف في لوحة التحكم
    displayAdminName();
    
    // التحقق من صفحة تسجيل الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // إذا كان المستخدم مسجلاً دخوله بالفعل، قم بتوجيهه إلى لوحة التحكم
        if (isLoggedIn()) {
            window.location.href = 'admin.html';
        }
        
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            
            if (login(username, password)) {
                // تسجيل الدخول ناجح
                window.location.href = 'admin.html';
            } else {
                // فشل تسجيل الدخول
                showMessage('errorMessage', 'اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
            }
        });
    }
    
    // التحقق من صفحة لوحة التحكم
    const adminPage = document.querySelector('.admin-main');
    if (adminPage) {
        // إذا لم يكن المستخدم مسجلاً دخوله، قم بتوجيهه إلى صفحة تسجيل الدخول
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }
        
        // زر تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
        
        // زر نشر المنشور
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', function() {
                const title = document.getElementById('postTitle').value.trim();
                const content = document.getElementById('postContent').value.trim();
                
                if (!content) {
                    alert('الرجاء إدخال محتوى للمنشور');
                    return;
                }
                
                if (addPost(title, content)) {
                    // عرض رسالة نجاح
                    showMessage('adminPostsList', 'تم نشر المنشور بنجاح!', 'success');
                    
                    // تحديث قائمة المنشورات
                    displayAdminPosts();
                    
                    // مسح حقلي الإدخال
                    document.getElementById('postTitle').value = '';
                    document.getElementById('postContent').value = '';
                } else {
                    alert('حدث خطأ أثناء نشر المنشور');
                }
            });
        }
        
        // زر مسح النص
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                document.getElementById('postTitle').value = '';
                document.getElementById('postContent').value = '';
            });
        }
    }
    
    // تفعيل القائمة المتنقلة
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const navLinks = document.querySelector('.nav-links');
            navLinks.classList.toggle('active');
        });
    }
});
