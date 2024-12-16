const { FilterCoach } = require("../models/FilterCoachModel")

const addFilterCoach = async (req, res) => {
    try {
        const { step1, step2, step3, step4, step5 } = req.body
        const filterCoach = new FilterCoach({ step1, step2, step3, step4, step5 })
        await filterCoach.save()
        res.status(201).json({ message: "FilterCoach Added" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal Server Error" })
    }
}


module.exports = { addFilterCoach }