const mongoose = require('mongoose');

// Schema for appointment details
const appointmentSchema = new mongoose.Schema({
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },  // Reference to the program
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Reference to the user
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },  // Reference to the coach
    dayId: { type: mongoose.Schema.Types.ObjectId, required: true },  // Reference to the specific day within the program
    scheduledDate: { type: Date, required: true },  // Date and time of the appointment
    status: { 
        type: String, 
        enum: ['scheduled', 'completed', 'canceled'], 
        default: 'scheduled' 
    },  // Status of the appointment
    notes: { type: String, required: false }  // Optional notes for the appointment
}, {
    timestamps: true  // Automatically add createdAt and updatedAt timestamps
});

// Schema for user enrollment in a program
const enrollmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Reference to the user
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },  // Reference to the program
    enrollmentDate: { type: Date, default: Date.now },  // Date when the user enrolled in the program
    status: { 
        type: String, 
        enum: ['active', 'completed', 'canceled'], 
        default: 'active' 
    },  // Enrollment status
    progress: { type: Number, default: 0 },  // User's progress in the program (e.g., percentage complete)
    appointments: [appointmentSchema]  // Array of appointments related to the program
}, {
    timestamps: true  // Automatically add createdAt and updatedAt timestamps
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

module.exports = { Appointment, Enrollment };
