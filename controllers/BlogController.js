const { Blog } = require("../models/BlogModel")



const GetAllBlogs = async (req, res) => {
    try {
        const blog = await Blog.find()
        res.status(200).send({
            status: "SUCCESS",
            blog
        })
    } catch (error) {
        res.status(500).send({ status: "FAILURE", error })
    }
}


const GetBlogbyId = async (req, res) => {
    const { id } = req.params;
    try {
        const blog = await Blog.findById(id)
        if (!blog) {
            return res.status(404).send({
                status: "FAILURE",
                error: "Blog not found"
            })
        }
        res.status(200).send({
            status: "SUCCESS",
            blog
        })
    } catch (error) {
        res.status(500).send({ status: "FAILURE", error })
    }
}


const createBlog = async (req, res) => {
    const { slug, meta, header, body, maintitle, mainImage, author, description, sections } = req.body
    try {
        const blog = new Blog({ slug, meta, header, body, maintitle, mainImage, author, description, sections })
        await blog.save()
        res.status(201).send({
            status: "SUCCESS",
            blog
        })
    } catch (error) {
        res.status(500).send({ status: "FAILURE", error })
    }
}


const updateBlog = async (req, res) => {
    try {
        const { id } = req.params
        const { title, mainImage, author, description, sections } = req.body
        const updatedBlog = await Blog.findByIdAndUpdate(id, { title, mainImage, author, description, sections }, { new: true })
        if (!updatedBlog) {
            return res.status(404).send({
                status: "FAILURE",
                error: "Blog not found"
            })
        }
        res.status(200).send({
            status: "SUCCESS",
            blog: updatedBlog
        })
    } catch (error) {
        res.status(500).send({ status: "FAILURE", error })
    }
}


const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params
        const deletedBlog = await Blog.findByIdAndDelete(id)
        if (!deletedBlog) {
            return res.status(404).send({
                status: "FAILURE",
                error: "Blog not found"
            })
        }
        res.status(200).send({
            status: "SUCCESS",
            message: "Blog deleted"
        })
    } catch (error) {
        res.status(500).send({ status: "FAILURE", error })
    }
}


module.exports = {
    GetAllBlogs,
    GetBlogbyId,
    createBlog,
    updateBlog,
    deleteBlog,
}