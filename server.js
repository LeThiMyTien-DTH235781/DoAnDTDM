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

// ── KẾT NỐI MONGODB ───────────────────────────────────
// Kết nối MongoDB
var uri = 'mongodb://tiendth235781:tien123@ac-xqexej9-shard-00-01.ozqyrc3.mongodb.net:27017/app?ssl=true&authSource=admin';
mongoose.connect(uri)
    .then(() => console.log('Đã kết nối thành công tới MongoDB.'))
    .catch(err => console.log(err));

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

// ── ROUTES ───────────────────────────────────────────────

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
 
// ── ROUTES ───────────────────────────────────────────────
 //  Cấu hình Session (Để server nhớ đã đăng nhập chưa)
app.use(session({
    secret: 'ghi-chu-bi-mat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // Đăng nhập có hiệu lực trong 1 tiếng
}));

// Hàm Middleware kiểm tra quyền truy cập
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
};

// ── KẾT NỐI MONGODB (Giữ nguyên của bạn) ───────────────
var uri = 'mongodb://tiendth235781:tien123@ac-xqexej9-shard-00-01.ozqyrc3.mongodb.net:27017/app?ssl=true&authSource=admin';
mongoose.connect(uri)
    .then(() => console.log('✅ Đã kết nối thành công tới MongoDB.'))
    .catch(err => console.log('❌ Lỗi kết nối:', err));


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

// Trang Login
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Xử lý Login (Má lưu ý: Pass ở đây đang là 123456)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.render('login', { error: 'Sai tài khoản hoặc mật khẩu!' });
    }
});

// Đăng xuất
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});
// ── CÁC ROUTE GHI CHÚ (Thêm requireLogin vào đầu) ────────

// Trang chủ phải đăng nhập mới xem được
app.get('/', requireLogin, async (req, res) => {
    try {
        const cat = (req.query.cat || 'Tất cả').trim();
        const search = (req.query.search || '').trim();
        const counts = await getCounts();
        let query = {};
        if (cat === 'Đã ghim') query.pinned = true;
        else if (cat !== 'Tất cả') query.category = cat;
        if (search) {
            query.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];
        }
        const notes = await Note.find(query).sort({ pinned: -1, createdAt: -1 });
        res.render(a'index', { notes, counts, currentCat: cat, searchQuery: search });
    } catch (err) { res.status(500).send('Lỗi Server'); }
});
// TRANG CHỦ & TÌM KIẾM
app.get('/', async (req, res) => {
    try {
        const cat = (req.query.cat || 'Tất cả').trim();
        const search = (req.query.search || '').trim();
        const counts = await getCounts();
 
        let query = {};
 
        // Lọc theo danh mục
        if (cat === 'Đã ghim') {
            query.pinned = true;
        } else if (cat !== 'Tất cả') {
            query.category = cat;
        }
 
        // Tìm kiếm
        if (search) {
            query.$or = [
                { title:   { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
 
        const notes = await Note.find(query).sort({ pinned: -1, createdAt: -1 });
        res.render('index', { notes, counts, currentCat: cat, searchQuery: search });
    } catch (err) {
        console.error("Lỗi trang chủ:", err);
        res.status(500).send('Lỗi Server: ' + err.message);
    }
});
 
//  THÊM GHI CHÚ
app.post('/add', async (req, res) => {
    try {
        const { title, content, category } = req.body;
        await new Note({ title, content, category }).save();
        res.redirect('/?added=1');
    } catch (err) {
        console.error("Lỗi thêm ghi chú:", err);
        res.status(500).send('Lỗi khi thêm ghi chú: ' + err.message);
    }
});
app.get('/edit/:id', requireLogin, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id.trim());
        const counts = await getCounts();
        if (!note) return res.redirect('/');
        res.render('edit', { note, counts, currentCat: 'Tất cả', searchQuery: '' });
    } catch (err) { res.redirect('/'); }
});

// ĐÂY LÀ CHỖ LƯU DỮ LIỆU SỬA
app.post('/edit/:id', requireLogin, async (req, res) => {
    try {
        const id = req.params.id.trim();
        const { title, content, category } = req.body;
        await Note.findByIdAndUpdate(id, { title, content, category });
        res.redirect('/?edited=1');
    } catch (err) { res.status(500).send('Lỗi cập nhật'); }
});
// SỬA LẠI ROUTE GHIM (Để nó hiện thông báo đúng)
app.get('/pin/:id', async (req, res) => {
    try {
        const id = req.params.id.trim();
        if (!mongoose.Types.ObjectId.isValid(id)) return res.redirect('/');
        const note = await Note.findById(id);
        if (note) {
            note.pinned = !note.pinned;
            await note.save();
        }
        // Sửa chỗ này để nó hiện Toast "Đã ghim" thay vì "Đã thêm"
        res.redirect('/?pinned=1'); 
    } catch (err) {
        res.status(500).send('Lỗi ghim');
    }
});
 
// BẬT/TẮT GHIM
app.get('/pin/:id', async (req, res) => {
    try {
        const id = req.params.id.trim();
        if (!mongoose.Types.ObjectId.isValid(id)) return res.redirect('/');
 
        const note = await Note.findById(id);
        if (note) {
            note.pinned = !note.pinned;
            await note.save();
        }
        const referer = req.headers.referer || '/';
        res.redirect(referer);
    } catch (err) {
        console.error("Lỗi ghim:", err);
        res.status(500).send('Lỗi khi ghim: ' + err.message);
    }
});
 
//  XÓA GHI CHÚ
app.get('/delete/:id', async (req, res) => {
    try {
        const id = req.params.id.trim();
        if (mongoose.Types.ObjectId.isValid(id)) {
            await Note.findByIdAndDelete(id);
        }
        res.redirect('/?deleted=1');
    } catch (err) {
        res.status(500).send('Lỗi khi xóa: ' + err.message);
    }
});
 
// KHỞI CHẠY SERVER
app.listen(process.env.PORT || 3000, () => {
    console.log('🚀 Server đang chạy tại: http://127.0.0.1:3000');
});