require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Kết nối thành công!');
        process.exit(0);
    })
    .catch(err => {
        console.log('❌ Lỗi:', err.message);
        process.exit(1);
    });