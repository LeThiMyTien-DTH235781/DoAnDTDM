require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const Note = require('./models/Note'); 
const index = require('./routers/index');

// 1. Kết nối MongoDB
const uri = process.env.MONGO_URI; 
mongoose.connect(uri)
    .then(() => console.log('Đã kết nối thành công tới MongoDB.'))
    .catch(err => console.log(err));

// 2. Cấu hình ứng dụng
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'NoteCuteSecret',
    resave: false,
    saveUninitialized: true
}));

// Middleware kiểm tra đăng nhập
function checkLogin(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/login');
}

// 3. Hàm lấy số liệu thống kê (Sửa lỗi stats is not defined)
async function getNoteStats() {
    const allNotes = await Note.find();
    return {
        total: allNotes.length,
        work: allNotes.filter(n => n.category === 'Công việc').length,
        personal: allNotes.filter(n => n.category === 'Cá nhân').length,
        idea: allNotes.filter(n => n.category === 'Ý tưởng').length
    };
}

// --- ROUTES HỆ THỐNG ---
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '12345') { 
        req.session.user = username;
        return res.redirect('/');
    }
    res.send('Sai tài khoản hoặc mật khẩu!');
});
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- ROUTES CHỨC NĂNG ---

// Trang chủ & Tìm kiếm
app.get('/', checkLogin, async (req, res) => {
    try {
        let search = req.query.search || "";
        const notes = await Note.find({
            title: { $regex: search, $options: 'i' }
        }).sort({ isPinned: -1, createdAt: -1 });

        const stats = await getNoteStats(); // Đảm bảo luôn gửi stats sang view
        res.render('index', { notes, searchKey: search, stats });
    } catch (err) { res.status(500).send("Lỗi hệ thống"); }
});

// Lọc theo danh mục (Sửa lỗi Cannot GET /category/...)
app.get('/category/:name', checkLogin, async (req, res) => {
    try {
        const categorySlug = req.params.name;
        const categoryMap = { 'work': 'Công việc', 'personal': 'Cá nhân', 'idea': 'Ý tưởng' };
        const dbCategory = categoryMap[categorySlug] || categorySlug;

        const notes = await Note.find({ category: dbCategory }).sort({ isPinned: -1, createdAt: -1 });
        const stats = await getNoteStats();
        res.render('index', { notes, stats, searchKey: dbCategory });
    } catch (err) { res.redirect('/'); }
});

// Lọc ghi chú đã ghim
app.get('/pinned', checkLogin, async (req, res) => {
    try {
        const notes = await Note.find({ isPinned: true }).sort({ createdAt: -1 });
        const stats = await getNoteStats();
        res.render('index', { notes, stats, searchKey: 'Ghi chú đã ghim' });
    } catch (err) { res.redirect('/'); }
});

// Thao tác với ghi chú
app.post('/add-note', checkLogin, async (req, res) => {
    const { title, content, category } = req.body;
    await Note.create({ title, content, category, isPinned: false });
    res.redirect('/');
});

app.get('/pin/:id', checkLogin, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (note) { note.isPinned = !note.isPinned; await note.save(); }
        res.redirect('back');
    } catch (err) { res.redirect('/'); }
});

app.get('/delete/:id', checkLogin, async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.redirect('back');
    } catch (err) { res.redirect('/'); }
});

app.post('/edit/:id', checkLogin, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        await Note.findByIdAndUpdate(req.params.id, { title, content, category });
        res.redirect('/'); // Ép buộc quay về trang chủ để cập nhật dữ liệu mới
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server đang chạy trên máy chủ ${port}`);
});