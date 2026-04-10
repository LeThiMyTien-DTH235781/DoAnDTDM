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
    saveUninitialized: true, // 🔥 QUAN TRỌNG
    cookie: {
        secure: false,       // 🔥 chạy được cả local + Render
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
async function getCounts() {
    const all = await Note.find();
    return {
        'Tất cả':    all.length,
        'Công việc': all.filter(n => n.category === 'Công việc').length,
        'Cá nhân':   all.filter(n => n.category === 'Cá nhân').length,
        'Ý tưởng':   all.filter(n => n.category === 'Ý tưởng').length,
        'Đã ghim':   all.filter(n => n.pinned).length,
    };
}

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
app.get('/', requireLogin, async (req, res) => {
    try {
        const cat = (req.query.cat || 'Tất cả').trim();
        const search = (req.query.search || '').trim();
        const counts = await getCounts();
        
        let query = {};
        if (cat === 'Đã ghim') query.pinned = true;
        else if (cat !== 'Tất cả') query.category = cat;

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } }, 
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const notes = await Note.find(query).sort({ pinned: -1, createdAt: -1 });
        // Đã sửa lỗi "a'index'" ở đây:
        res.render('index', { notes, counts, currentCat: cat, searchQuery: search });
    } catch (err) { 
        res.status(500).send('Lỗi Server: ' + err.message); 
    }
});

// Thêm ghi chú
app.post('/add', requireLogin, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        await new Note({ title, content, category }).save();
        res.redirect('/?added=1');
    } catch (err) {
        res.status(500).send('Lỗi khi thêm: ' + err.message);
    }
});

// Trang sửa
app.get('/edit/:id', requireLogin, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id.trim());
        const counts = await getCounts();
        if (!note) return res.redirect('/');
        res.render('edit', { note, counts, currentCat: 'Tất cả', searchQuery: '' });
    } catch (err) { res.redirect('/'); }
});

// Lưu dữ liệu sửa
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