const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();
const Note = require('./models/Note');

// ── MIDDLEWARE ──────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Cấu hình Session
app.set('trust proxy', 1);

app.use(session({
    secret: 'ghi-chu-bi-mat',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 3600000
    }
}));
// Middleware kiểm tra quyền truy cập
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
};


// ── KẾT NỐI MONGODB ───────────────────────────────────
const uri = 'mongodb://tiendth235781:tien123@ac-xqexej9-shard-00-01.ozqyrc3.mongodb.net:27017/app?ssl=true&authSource=admin';
mongoose.connect(uri)
    .then(() => console.log('✅ Đã kết nối thành công tới MongoDB.'))
    .catch(err => console.log('❌ Lỗi kết nối:', err));

// Hàm đếm số lượng ghi chú cho Sidebar

// ── ROUTES ĐĂNG NHẬP ────────────────────────────────────

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.render('login', { error: 'Sai tài khoản hoặc mật khẩu!' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ── ROUTES GHI CHÚ ───────────────────────────────────────

// Trang chủ (Có tìm kiếm & Lọc)
// TRANG CHỦ: Đã bỏ hoàn toàn phần đếm số lượng
app.get('/', requireLogin, async (req, res) => {
    try {
        const cat = (req.query.cat || 'Tất cả').trim();
        const search = (req.query.search || '').trim();
        
        // Gửi object counts rỗng để file EJS không bị lỗi biến
        const counts = {}; 
        
        let query = {};
        if (cat === 'Đã ghim') query.pinned = true;
        else if (cat !== 'Tất cả') query.category = cat;

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } }, 
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // Chỉ tập trung lấy danh sách ghi chú
        const notes = await Note.find(query).sort({ pinned: -1, createdAt: -1 });
        
        res.render('index', { notes, counts, currentCat: cat, searchQuery: search });
    } catch (err) { 
        res.status(500).send('Lỗi Server: ' + err.message); 
    }
});
// Thêm ghi chú 
app.post('/add', requireLogin, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        if (!title || !content) return res.status(400).send('Thiếu tiêu đề hoặc nội dung');

        const newNote = new Note({
            title: title.trim(),
            content: content.trim(),
            category: category || 'Cá nhân',
            pinned: false,
            createdAt: new Date()
        });

        await newNote.save();
        res.redirect('/?added=1');
    } catch (err) {
        res.status(500).send('Lỗi khi thêm ghi chú: ' + err.message);
    }
});

// Trang sửa 
app.get('/edit/:id', requireLogin, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id.trim());
        const counts = { 'Tất cả': 0, 'Công việc': 0, 'Cá nhân': 0, 'Ý tưởng': 0, 'Đã ghim': 0 };
        if (!note) return res.redirect('/');
        res.render('edit', { note, counts, currentCat: 'Tất cả', searchQuery: '' });
    } catch (err) { res.redirect('/'); }
});

// Lưu dữ liệu sửa (Giữ nguyên logic của bạn)
app.post('/edit/:id', requireLogin, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        await Note.findByIdAndUpdate(req.params.id.trim(), { title, content, category });
        res.redirect('/?edited=1');
    } catch (err) { res.status(500).send('Lỗi cập nhật'); }
});

// Bật/Tắt ghim 
app.get('/pin/:id', requireLogin, async (req, res) => {
    try {
        const id = req.params.id.trim();
        const note = await Note.findById(id);
        if (note) {
            note.pinned = !note.pinned;
            await note.save();
        }
        res.redirect('/?pinned=1'); 
    } catch (err) {
        res.status(500).send('Lỗi ghim');
    }
});

// Xóa ghi chú 
app.get('/delete/:id', requireLogin, async (req, res) => {
    try {
        const id = req.params.id.trim();
        if (mongoose.Types.ObjectId.isValid(id)) {
            await Note.findByIdAndDelete(id);
        }
        res.redirect('/?deleted=1');
    } catch (err) {
        res.status(500).send('Lỗi khi xóa');
    }
});
// KHỞI CHẠY SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://127.0.0.1:${PORT}`);
});