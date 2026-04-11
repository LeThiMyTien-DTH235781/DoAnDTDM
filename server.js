const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const Note = require('./models/Note');

// --- CẤU HÌNH HỆ THỐNG ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.set('trust proxy', 1);

// Cấu hình Session tối ưu cho môi trường Production (Vercel)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        // Tự động bật secure khi chạy trên HTTPS của Vercel
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 3600000 
    }
}));

// --- MIDDLEWARE ---
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) return next();
    res.redirect('/login');
};

async function getCounts() {
    try {
        const [all, work, personal, idea, pinned] = await Promise.all([
            Note.countDocuments({}),
            Note.countDocuments({ category: 'Công việc' }),
            Note.countDocuments({ category: 'Cá nhân' }),
            Note.countDocuments({ category: 'Ý tưởng' }),
            Note.countDocuments({ pinned: true }),
        ]);
        return { 'Tất cả': all, 'Công việc': work, 'Cá nhân': personal, 'Ý tưởng': idea, 'Đã ghim': pinned };
    } catch (e) { return {}; }
}

// --- ROUTES ---
app.get('/login', (req, res) => res.render('login', { error: null }));

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

app.get('/', requireLogin, async (req, res) => {
    try {
        const cat = req.query.cat || 'Tất cả';
        const search = req.query.search || '';
        const counts = await getCounts();
        let query = {};
        if (cat === 'Đã ghim') query.pinned = true;
        else if (cat !== 'Tất cả') query.category = cat;
        if (search) {
            query.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];
        }
        const notes = await Note.find(query).sort({ pinned: -1, createdAt: -1 });
        res.render('index', { notes, counts, currentCat: cat, searchQuery: search });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/add', requireLogin, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        await new Note({ title, content, category }).save();
        res.redirect('/?added=1');
    } catch (err) { res.redirect('/'); }
});

app.get('/edit/:id', requireLogin, async (req, res) => {
    const note = await Note.findById(req.params.id);
    res.render('edit', { note });
});

app.post('/edit/:id', requireLogin, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        await Note.findByIdAndUpdate(req.params.id, { title, content, category });
        res.redirect('/?edited=1');
    } catch (err) { res.redirect('/'); }
});

app.get('/pin/:id', requireLogin, async (req, res) => {
    const note = await Note.findById(req.params.id);
    if (note) { note.pinned = !note.pinned; await note.save(); }
    res.redirect('back');
});

app.get('/delete/:id', requireLogin, async (req, res) => {
    await Note.findByIdAndDelete(req.params.id);
    res.redirect('/?deleted=1');
});

// --- KẾT NỐI DB & KHỞI CHẠY ---
const PORT = process.env.PORT || 3000;

// Kết nối DB (Vercel sẽ tái sử dụng kết nối này)
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Đã kết nối tới MongoDB');
        // Chỉ chạy app.listen nếu KHÔNG phải môi trường Vercel
        if (process.env.NODE_ENV !== 'production') {
            app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
        }
    })
    .catch(err => console.error('❌ DB Error:', err));

// Dòng này cực kỳ quan trọng cho Vercel
module.exports = app;