const express = require('express');
const router = express.Router();
const Note = require('../models/note');

// Hàm bổ trợ để lấy số lượng thống kê (tránh lặp code)
async function getNoteStats() {
    return {
        total: await Note.countDocuments(),
        work: await Note.countDocuments({ category: 'Công việc' }),
        personal: await Note.countDocuments({ category: 'Cá nhân' }),
        idea: await Note.countDocuments({ category: 'Ý tưởng' })
    };
}

// Route Trang chủ & Tìm kiếm
router.get('/', async (req, res) => {
    try {
        let query = {};
        const searchKey = req.query.search || '';
        if (searchKey) {
            query.title = { $regex: searchKey, $options: 'i' };
        }

        const notes = await Note.find(query).sort({ isPinned: -1, createdAt: -1 });
        const stats = await getNoteStats(); // Đảm bảo lấy stats

        res.render('index', { notes, searchKey, stats });
    } catch (err) {
        res.status(500).send("Lỗi hệ thống");
    }
});

// Route Lọc theo danh mục (Sửa lỗi thiếu stats khi bấm vào menu bên trái)
app.get('/category/:name', checkLogin, async (req, res) => {
    try {
        const categorySlug = req.params.name;
        
        // Chuyển đổi slug từ URL sang tên danh mục có dấu trong Database
        const categoryMap = {
            'work': 'Công việc',
            'personal': 'Cá nhân',
            'idea': 'Ý tưởng'
        };
        
        const dbCategory = categoryMap[categorySlug] || categorySlug;

        // Tìm các ghi chú thuộc danh mục này
        const notes = await Note.find({ category: dbCategory }).sort({ isPinned: -1, createdAt: -1 });
        const stats = await getNoteStats(); // Đảm bảo luôn gửi stats để không lỗi

        res.render('index', { 
            notes, 
            stats, 
            searchKey: dbCategory // Hiển thị tên danh mục lên thanh tìm kiếm
        });
    } catch (err) {
        res.redirect('/');
    }
});

// Route Danh sách đã ghim
router.get('/pinned', async (req, res) => {
    try {
        const notes = await Note.find({ isPinned: true }).sort({ createdAt: -1 });
        const stats = await getNoteStats();
        res.render('index', { notes, searchKey: 'Danh sách đã ghim', stats });
    } catch (err) {
        res.status(500).send("Lỗi tải");
    }
});

// 4. CÁC THAO TÁC (Giữ nguyên logic redirect 'back')
router.post('/add-note', async (req, res) => {
    try {
        const { title, content, category } = req.body;
        await new Note({ title, content, category }).save();
        res.redirect('back');
    } catch (err) { res.status(500).send("Lỗi"); }
});

router.get('/pin/:id', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        note.isPinned = !note.isPinned;
        await note.save();
        res.redirect('back');
    } catch (err) { res.status(500).send("Lỗi"); }
});

router.get('/delete/:id', async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.redirect('back');
    } catch (err) { res.status(500).send("Lỗi"); }
});

router.post('/edit/:id', async (req, res) => {
    try {
        const { title, content, category } = req.body;
        await Note.findByIdAndUpdate(req.params.id, { title, content, category });
        res.redirect('back');
    } catch (err) { res.status(500).send("Lỗi"); }
});

module.exports = router;