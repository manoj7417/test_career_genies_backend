const mongoose = require('mongoose');

// Schema for prerequisites (such as assignments or study materials) for each day
const prerequisiteSchema = new mongoose.Schema({
    type: { type: String, required: true },  // Type of prerequisite (e.g., "assignment", "reading material", "video")
    description: { type: String, required: false },  // Description of the prerequisite
    attachmentUrl: { type: String, required: false }  // URL to the attachment or material
});

// Schema for sub-modules/topics within a day (if there are sub-modules)
const subModuleSchema = new mongoose.Schema({
    title: { type: String, required: true },  // Title of the sub-module
    description: { type: String, required: true },  // Description of the sub-module
    timeToComplete: { type: Number, required: true }  // Time allocated for this sub-module (e.g., '30 minutes')
});

// Schema for each day in the program
const daySchema = new mongoose.Schema({
    timeToComplete: { type: Number, required: true },  // Total time for the day
    title: { type: String },  // Optional title of the day if no sub-modules
    description: { type: String },  // Optional description if no sub-modules
    prerequisites: [prerequisiteSchema],  // Array of prerequisites for the day
    subModules: [subModuleSchema]  // Optional array of sub-modules/topics covered in the day
});

// Main schema for the program
const programSchema = new mongoose.Schema({
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },  // Reference to the coach
    title: { type: String, required: true },  // Program title
    description: { type: String, required: true },  // Program description
    prerequisites: [prerequisiteSchema],  // Optional program-level prerequisites
    days: [daySchema],  // Array of days in the program
    programImage: {type: String, required: true},  // URL to the program image
    programVideo: {type: String},  // URL to the program video
    isapproved: { type: Boolean, default: false },  // Whether the program has been approved by the coach
}, {
    timestamps: true
});

const Program = mongoose.model("Program", programSchema);

module.exports = { Program };
