const { Booking } = require("../models/BookingModel");
const { Coach } = require("../models/CoachModel");
const { User } = require("../models/userModel");
const moment = require('moment')

const BookSlot = async (req, res) => {
    const userId = req.user._id;
    const { coachId } = req.params;
    const { date, startTime, endTime, timezone } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({
                status: "FAILURE",
                message: "User not found"
            });
        }
        const coach = await Coach.findById(coachId)
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }

        const existingBooking = await Booking.findOne({
            coachId,
            date,
            $or: [
                { "slotTime.startTime": { $lt: endTime, $gte: startTime } },
                { "slotTime.endTime": { $gt: startTime, $lte: endTime } },
                {
                    $and: [
                        { "slotTime.startTime": { $lte: startTime } },
                        { "slotTime.endTime": { $gte: endTime } }
                    ]
                }
            ]
        });

        if (existingBooking) {
            return res.status(409).send({
                status: "FAILURE",
                message: "Time slot is already booked"
            });
        }

        const startTimeUTC = moment.tz(`${date} ${startTime}`, timezone).utc();
        const endTimeUTC = moment.tz(`${date} ${endTime}`, timezone).utc();

        const booking = new Booking({
            coachId,
            userId,
            date: startTimeUTC.toDate(),
            slotTime: {
                startTime: startTimeUTC.format('HH:mm'),
                endTime: endTimeUTC.format('HH:mm')
            }
        });
        return res.status(201).send({
            status: "SUCCESS",
            message: "Booking confirmed",
            booking
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while booking the slot"
        });
    }
}

const checkSlotAvailability = async (req, res) => {
    const { coachId, date, startTime, endTime, timezone } = req.body;
    try {
        const startTimeUTC = moment.tz(`${date} ${startTime}`, timezone).utc();
        const endTimeUTC = moment.tz(`${date} ${endTime}`, timezone).utc();

        if (endTimeUTC.isBefore(startTimeUTC) || endTimeUTC.isSame(startTimeUTC)) {
            return res.status(400).send({
                status: "FAILURE",
                message: "End time must be after start time"
            });
        }

        const conflictingBooking = await Booking.findOne({
            coachId,
            date: startTimeUTC.toDate(),
            $or: [

                {
                    "slotTime.startTime": { $lt: endTimeUTC.format('HH:mm'), $gte: startTimeUTC.format('HH:mm') }
                },
                {
                    "slotTime.endTime": { $gt: startTimeUTC.format('HH:mm'), $lte: endTimeUTC.format('HH:mm') }
                },
                {
                    $and: [
                        { "slotTime.startTime": { $lte: startTimeUTC.format('HH:mm') } },
                        { "slotTime.endTime": { $gte: endTimeUTC.format('HH:mm') } }
                    ]
                }
            ]
        });

        if (conflictingBooking) {
            return res.status(409).send({
                status: "FAILURE",
                message: "The time slot is already booked"
            });
        }

        return res.status(200).send({
            status: "SUCCESS",
            message: "The time slot is available"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while checking slot availability"
        });
    }
}

const getCoachSlots = async (req, res) => {
    const { coachId } = req.params;
    const { date, timezone } = req.query; 
    try {
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found"
            });
        }
        const dayOfWeek = moment(date).tz(timezone).format('dddd'); 
        const availability = coach.availability.dayOfWeek.includes(dayOfWeek)
            ? {
                startTime: coach.availability.startTime,
                endTime: coach.availability.endTime,
                unavailableDates: coach.availability.unavailableDates
            }
            : null;

        if (!availability) {
            return res.status(200).send({
                status: "SUCCESS",
                message: "Coach is not available on this date"
            });
        }

        // Check if the date is within unavailable dates
        if (availability.unavailableDates.some(unavailableDate => moment(unavailableDate).isSame(date, 'day'))) {
            return res.status(200).send({
                status: "SUCCESS",
                message: "Coach is unavailable on this date"
            });
        }

        // Get Booked Slots for the Date
        const bookedSlots = await Booking.find({
            coachId,
            date: moment(date).tz(timezone).toDate()
        }).select('slotTime');

        // Prepare available slots
        const availableSlots = [];
        const startTime = moment.tz(`${date} ${availability.startTime}`, timezone);
        const endTime = moment.tz(`${date} ${availability.endTime}`, timezone);
        let currentSlot = startTime.clone();

        while (currentSlot.isBefore(endTime)) {
            const slotEndTime = currentSlot.clone().add(1, 'hour'); // Assume 1-hour slots

            // Check if this slot is booked
            const isBooked = bookedSlots.some(slot =>
                moment.tz(`${date} ${slot.slotTime.startTime}`, timezone).isSameOrBefore(slotEndTime) &&
                moment.tz(`${date} ${slot.slotTime.endTime}`, timezone).isAfter(currentSlot)
            );

            if (!isBooked) {
                availableSlots.push({
                    startTime: currentSlot.format('HH:mm'),
                    endTime: slotEndTime.format('HH:mm')
                });
            }

            currentSlot = slotEndTime;
        }

        return res.status(200).send({
            status: "SUCCESS",
            data: {
                availability: {
                    startTime: availability.startTime,
                    endTime: availability.endTime,
                    unavailableDates: availability.unavailableDates
                },
                availableSlots,
                bookedSlots: bookedSlots.map(slot => ({
                    startTime: moment.tz(`${date} ${slot.slotTime.startTime}`, timezone).format('HH:mm'),
                    endTime: moment.tz(`${date} ${slot.slotTime.endTime}`, timezone).format('HH:mm')
                }))
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while fetching coach slots"
        });
    }
};

module.exports = {
    BookSlot,
    checkSlotAvailability
}