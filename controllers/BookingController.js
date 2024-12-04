const { Booking } = require("../models/BookingModel");
const { Coach } = require("../models/CoachModel");
const { authorize, createSpace } = require("../utils/googleMeet");
const { sendEmail } = require("../utils/nodemailer");
const { OAuth2Client } = require("google-auth-library");
const { google } = require('googleapis');

const bookSlots = async (req, res) => {
    const user = req.user;
    const userId = req.user._id;
    const { slotTime, coachId, timezone, country, state, city, notes, date, programId } = req.body;

    try {
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).send({
                status: "FAILURE",
                message: "Coach not found",
            });
        }

        const isSlotBooked = await Booking.findOne({ coachId, slotTime, date });
        if (isSlotBooked) {
            return res.status(409).send({
                status: "FAILURE",
                message: "Slot is already booked",
            });
        }

        const meetingLink = await createSpace(authorize());
        const newBooking = new Booking({
            userId,
            coachId,
            slotTime,
            timezone,
            country,
            state,
            city,
            notes,
            date,
            programId,
            meetingLink,
        });
        await newBooking.save();

        await Coach.findByIdAndUpdate(
            coachId,
            { $push: { bookings: newBooking._id } },
            { new: true }
        );
        user.bookings.push(newBooking._id);
        await user.save();

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
            refresh_token: coach.googleAuth.refreshToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const convertToISO8601 = (date, time) => {
            const [hours, minutes] = time
                .replace(" AM", "")
                .replace(" PM", "")
                .split(":");
            const isPM = time.includes("PM");
            const hourIn24 = isPM && hours !== "12" ? +hours + 12 : hours === "12" && !isPM ? "00" : hours;
            return `${date}T${hourIn24.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
        };

        const startDateTime = convertToISO8601(date, slotTime.startTime);
        const endDateTime = convertToISO8601(date, slotTime.endTime);

        const event = {
            summary: "Career Coaching Session",
            description: `Notes: ${notes}\nMeeting Link: ${meetingLink}`,
            start: {
                dateTime: startDateTime,
                timeZone: timezone,
            },
            end: {
                dateTime: endDateTime,
                timeZone: timezone,
            },
            attendees: [
                { email: user.email },
                { email: coach.email },
            ],
            conferenceData: {
                entryPoints: [
                    {
                        entryPointType: "video",
                        uri: meetingLink,
                        label: "Join Meeting",
                    },
                ],
            },
        };
        const eventResponse = await calendar.events.insert({
            calendarId: coach.googleAuth.calendarId || "primary",
            resource: event,
            conferenceDataVersion: 1,
            sendUpdates: "all",
            
        });

        res.status(201).send({
            status: "SUCCESS",
            message: "Slot booked successfully",
            data: newBooking,
        });
    } catch (error) {
        console.error("Error booking slot", error);
        res.status(500).send({
            status: "FAILURE",
            message: "An error occurred while booking slot",
        });
    }
};



const cancelSlot = async (req, res) => {
    try {

    } catch (error) {

    }
}

const getAllBookings = async (req, res) => {
    const userId = req.user._id;
    try {

    } catch (error) {

    }
}

const getCoachBookedSlots = async (req, res) => {
    const { coachId } = req.params;
}


module.exports = {
    bookSlots,
    cancelSlot,
    getCoachBookedSlots
}