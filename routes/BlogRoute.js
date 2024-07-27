const { GetAllBlogs, GetBlogbyId, createBlog, updateBlog, deleteBlog } = require("../controllers/BlogController")


async function BlogRoute(fastify, options) {



    fastify.get('/getAll',  GetAllBlogs)

    fastify.get('/get/:id', GetBlogbyId)

    fastify.post('/create', { preHandler: [fastify.verifyJWT,fastify.roleCheck(['admin'])] }, createBlog)

    fastify.patch('/update/:id', { preHandler: [fastify.verifyJWT,fastify.roleCheck(['admin'])] }, updateBlog)

    fastify.delete('/delete/:id', { preHandler: [fastify.verifyJWT,fastify.roleCheck(['admin'])] }, deleteBlog)
}

module.exports = BlogRoute