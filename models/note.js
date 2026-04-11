const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Công việc', 'Cá nhân', 'Ý tưởng'], 
        default: 'Cá nhân' 
    },
    color: { type: String, default: '#3b82f6' },
    isPinned: { type: Boolean, default: false }, // Trường mới để ghim
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', noteSchema);