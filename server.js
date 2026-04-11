const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();
const Note = require('./models/Note');

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SESSION_SECRET || 'ghi-chu-bi-mat',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 3600000
    }
}));

const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
};

const uri = process.env.MONGO_URI || 'mongodb://tiendth235781:tien123@ac-xqexej9-shard-00-01.ozqyrc3.mongodb.net:27017/app?ssl=true&authSource=admin';


async function getCounts() {
    try {
        const [all, congViec, caNhan, yTuong, daGhim] = await Promise.all([
            Note.countDocuments({}),
            Note.countDocuments({ category: 'Công việc' }),
            Note.countDocuments({ category: 'Cá nhân' }),
            Note.countDocuments({ category: 'Ý tưởng' }),
            Note.countDocuments({ pinned: true }),
        ]);
        return {
            'Tất cả':    all,
            'Công việc': congViec,
            'Cá nhân':   caNhan,
            'Ý tưởng':   yTuong,
            'Đã ghim':   daGhim,
        };
    } catch (err) {
        return { 'Tất cả': 0, 'Công việc': 0, 'Cá nhân': 0, 'Ý tưởng': 0, 'Đã ghim': 0 };
    }
}

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === '123456') {
        req.session.loggedIn = true;
        return res.redirect('/');
    } else {
        return res.render('login', { error: 'Sai tài khoản hoặc mật khẩu!' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

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
        res.render('index', { notes, counts, currentCat: cat, searchQuery: search });
    } catch (err) {
        res.status(500).send('Lỗi Server: ' + err.message);
    }
});

app.get('/add', requireLogin, (req, res) => {
    res.render('add'); // tạo file views/add.ejs
});

app.post('/add', requireLogin, async (req, res) => {
    try {
        const { title, content, category } = req.body;

        await new Note({ title, content, category }).save();

        return res.redirect('/?added=1'); // ✅ sửa ở đây
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi khi thêm: ' + err.message);
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

app.post('/edit/:id', requireLogin, async (req, res) => {
    try {
        const { title, content, category } = req.body;

        await Note.findByIdAndUpdate(req.params.id.trim(), {
            title,
            content,
            category
        });

        return res.redirect('/?edited=1'); // ✅ sửa
    } catch (err) {
        res.status(500).send('Lỗi cập nhật');
    }
});

app.get('/pin/:id', requireLogin, async (req, res) => {
    try {
        const id = req.params.id.trim();
        const note = await Note.findById(id);

        if (note) {
            note.pinned = !note.pinned;
            await note.save();
        }

        return res.redirect('/?pinned=1'); // ✅ sửa
    } catch (err) {
        res.status(500).send('Lỗi ghim');
    }
});

app.get('/delete/:id', requireLogin, async (req, res) => {
    try {
        const id = req.params.id.trim();

        if (mongoose.Types.ObjectId.isValid(id)) {
            await Note.findByIdAndDelete(id);
        }

        return res.redirect('/?deleted=1'); // ✅ sửa
    } catch (err) {
        res.status(500).send('Lỗi khi xóa');
    }
});

const PORT = process.env.PORT || 3000;

mongoose.connect(uri)
    .then(() => {
        console.log('✅ Đã kết nối MongoDB');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server chạy cổng: ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB lỗi:', err);
        process.exit(1);
    });