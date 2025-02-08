const {
    createTestimonial,
    getTestimonialsByCoach,
    getTestimonialById,
    updateTestimonial,
    deleteTestimonial
} = require("../controllers/testimonialController");

async function TestimonialRoute(fastify, options) {

    // Create a new testimonial
    fastify.post("/create", createTestimonial);

    // Get all testimonials
    fastify.get("/coach/:coachId", getTestimonialsByCoach);


    // Update a testimonial
    fastify.put("/update/:id", updateTestimonial);

    // Delete a testimonial
    fastify.delete("/delete/:id", deleteTestimonial);
}

module.exports = TestimonialRoute;
