const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: { type: String, required: true },
    templateName: { type: 'string', required: true },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    paymentDetails: {
        paymentMethod: [{ type: String }],
        paymentDate: { type: Date, default: Date.now() }
    }
}, { timestamps: true })


OrderSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = { Order };