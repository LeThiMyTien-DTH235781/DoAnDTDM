const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    title:     { type: String, required: true, trim: true },
    content:   { type: String, required: true },
    category:  { type: String, default: 'Công việc', enum: ['Công việc', 'Cá nhân', 'Ý tưởng'] },
    pinned:    { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

NoteSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    
});

module.exports = mongoose.model('Note', NoteSchema);