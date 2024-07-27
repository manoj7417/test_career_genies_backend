const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    mainImage: { type: String, required: true },
    author: { type: String, required: true },
    description: { type: String, required: true },
    sections: [{
        title: { type: String, required: true },
        description: { type: String, required: true },
        images: [{
            type: String , required : false
        }]
    }]
}, {
    timestamps: true
});

const Blog = mongoose.model("Blog", blogSchema);

module.exports = { Blog };
