const mongoose = require('mongoose')


const FilterCoachSchema = new mongoose.Schema({
    step_1: { type: String, required: true },
    step_2: { type: String, required: true },
    step_3: { type: String, required: true },
    step_4: { type: String, required: true },
    step_5: { type: String, required: true },
},
    {
        timestamps: true
    })

const FilterCoach = mongoose.model('FilterCoach', FilterCoachSchema)

module.exports = { FilterCoach }