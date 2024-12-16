const mongoose = require('mongoose')


const FilterCoachSchema = new mongoose.Schema({
    step1: { type: String, required: true },
    step2: { type: String, required: true },
    step3: { type: String, required: true },
    step4: { type: String, required: true },
    step5: { type: String, required: true },
},
    {
        timestamps: true
    })

const FilterCoach = mongoose.model('FilterCoach', FilterCoachSchema)

module.exports = { FilterCoach }