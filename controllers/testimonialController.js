const { Testimonial } = require("../models/TestimonialModel");


exports.createTestimonial = async (req, reply) => {
    try {
        const { coachId, rating, review } = req.body;
        const newTestimonial = new Testimonial({
            coachId,
            rating,
            review,
        });

        await newTestimonial.save();
        reply.code(201).send({ success: true, message: 'Review added successfully', testimonial: newTestimonial });
    } catch (error) {
        reply.code(500).send({ success: false, message: 'Server Error', error: error.message });
    }
};

// Get all testimonials for a specific coach
exports.getTestimonialsByCoach = async (req, reply) => {
    try {
        const { coachId } = req.params;

        const testimonials = await Testimonial.find({ coachId }).populate('userId', 'name email'); // Populate user info

        reply.code(200).send({ success: true, testimonials });
    } catch (error) {
        reply.code(500).send({ success: false, message: 'Server Error', error: error.message });
    }
};


//Update a testimonial (Only by the user who posted it)
exports.updateTestimonial = async (req, reply) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;

        let testimonial = await Testimonial.findById(id);

        if (!testimonial) {
            return reply.code(404).send({ success: false, message: "Testimonial not found" });
        }

        // Update testimonial fields
        testimonial.rating = rating || testimonial.rating;
        testimonial.review = review || testimonial.review;
        testimonial = await testimonial.save();

        reply.code(200).send({ success: true, message: "Review updated successfully", testimonial });
    } catch (error) {
        console.error("Error updating testimonial:", error);
        reply.code(500).send({ success: false, message: "Server Error", error: error.message });
    }
};


//Delete a testimonial (Only by the user who posted it)
exports.deleteTestimonial = async (req, reply) => {
    try {
        const { id } = req.params;

        const testimonial = await Testimonial.findById(id);

        if (!testimonial) {
            return reply.code(404).send({ success: false, message: "Testimonial not found" });
        }

        await Testimonial.findByIdAndDelete(id);
        reply.code(200).send({ success: true, message: "Review deleted successfully" });
    } catch (error) {
        console.error("Error deleting testimonial:", error);
        reply.code(500).send({ success: false, message: "Server Error", error: error.message });
    }
};

