
const verifyCoach = async (req, res) => {
    const { coachId } = req.params
    try {

    } catch (error) {

    }
}

const auth = async (req, res) => {
    const user = req.user
    try {
        const userInfo = user.toSafeObject()
        res.status(200).send({ data: userInfo })
    } catch (error) {
        console.log("Auth error", error)
        res.status(500).send(error)
    }
}


module.exports = {
    verifyCoach,
    auth
}