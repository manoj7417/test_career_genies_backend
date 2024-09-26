const { Booking } = require("../models/BookingModel");
const { Coach } = require("../models/CoachModel");
const { sendEmail } = require("../utils/nodemailer");

const bookSlots = async (req, res) => {
    const user = req.user;
    const userId = req.user._id;
    const { slotTime, coachId, timezone, country, state, city, notes, date } = req.body;
    console.log(slotTime)
    try {
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }
        const isSlotBooked = await Booking.findOne({ coachId, slotTime, date });
        if (isSlotBooked) {
            return res.status(409).send({
                status: "FAILURE",
                message: "Slot is already booked"
            });
        }
        const newBooking = new Booking({
            userId,
            coachId,
            slotTime,
            timezone,
            country,
            state,
            city,
            notes,
            date
        });
        await newBooking.save();
        const updatedCoach = await Coach.findByIdAndUpdate(
            coachId,
            { $push: { bookings: newBooking._id } },
            { new: true }
        );
        user.bookings.push(newBooking._id);
        await user.save();
        const startTime = slotTime.startTime;
        const endTime = slotTime.endTime;

        const coachHtml = `<div>
        <h2>Meeting Details</h2>
        <p>User: ${user.fullname}</p>
        <p>Date: ${date}</p>
        <p>Slot Time: ${startTime}-${endTime} , ${timezone}</p>
        <p>Notes: ${notes}</p>
        <p>Please make sure to arrive at the scheduled time to join the meeting.</p>
        <p>To join the meeting, please visit the following link:</p>
        </div>`

        await sendEmail(coach.email, "Career coaching meeting scheduled", coachHtml)

        const userHtml = `<div>
        <h2>Meeting Details</h2>
        <p>Coach: ${coach.name}</p>
        <p>Date: ${date}</p>
        <p>Slot Time: ${startTime}-${endTime} , ${timezone}</p>
        <p>Notes: ${notes}</p>
        <p>To join the meeting, please visit the following link:</p>`

        await sendEmail(user.email, "Career coaching meeting scheduled", userHtml)

        res.status(201).send({
            status: "SUCCESS",
            message: "Slot booked successfully",
            data: newBooking
        });
    } catch (error) {
        console.error("Error booking slot", error);
        res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while booking slot"
        });
    }
}

const cancelSlot = async (req, res) => {
    try {

    } catch (error) {

    }
}


module.exports = {
    bookSlots,
    cancelSlot
}