const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    slug: { type: String, required: true },
    meta: {
        title: { type: String, default: '' , required: true },
        description: { type: String, default: ''  , required: true },
        keywords: [{ type: String, default: '', required: true }]
    },
    header: { type: String, required: false },
    body: { type: String, required: false },
    maintitle: { type: String, required: true },
    mainImage: {
        url: { type: String, required: true },
        altText: { type: String, required: true },
        caption: { type: String, required: false }
    },
    author: { type: String, required: false },
    description: { type: String, required: false },
    sections: [{
        title: { type: String, required: false },
        description: { type: String, required: true },
        images: [{
            url: { type: String, required: true },
            altText: { type: String, required: true },
            caption: { type: String, required: true }
        }]
    }]
}, {
    timestamps: true
});

const Blog = mongoose.model("Blog", blogSchema);

module.exports = { Blog };
