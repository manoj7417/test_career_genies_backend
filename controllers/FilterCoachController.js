const { FilterCoach } = require("../models/FilterCoachModel")

const addFilterCoach = async (req, res) => {
    try {
        const { step_1, step_2, step_3, step_4, step_5 } = req.body
        const filterCoach = new FilterCoach({ step_1, step_2, step_3, step_4, step_5 })
        await filterCoach.save()
        res.status(201).send({ message: "FilterCoach Added" })
    } catch (error) {
        console.log(error)
        res.status(500).send({ message: "Internal Server Error" })
    }
}


module.exports = { addFilterCoach }