const { Booking } = require("../models/BookingModel");
const { Coach } = require("../models/CoachModel");
const { authorize, createSpace } = require("../utils/googleMeet");
const { sendEmail } = require("../utils/nodemailer");
const { OAuth2Client } = require("google-auth-library");
const { google } = require('googleapis');
const { v4: uuid } = require('uuid');
const path = require('path');
const userAppointmentTemp = path.resolve(__dirname, ".." , 'emailTemplates' , 'userAppointmentTemp.html');
const coachAppointmentTemplate = path.resolve(__dirname, ".." , 'emailTemplates' , 'coachAppointmentTemp.html');

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

        let meetingLink
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

        if (coach.googleAuth.refreshToken) {
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
                const hourString = hourIn24.toString().padStart(2, "0"); 
                return `${date}T${hourString}:${minutes.padStart(2, "0")}:00`;
            };
            

            const startDateTime = convertToISO8601(date, slotTime.startTime);
            const endDateTime = convertToISO8601(date, slotTime.endTime);

            const event = {
                summary: "Career Coaching Session",
                description: `Notes: ${notes}`,
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
                    createRequest: {
                        requestId: uuid(),
                    }
                },
            };
            const eventResponse = await calendar.events.insert({
                calendarId: coach.googleAuth.calendarId || "primary",
                resource: event,
                conferenceDataVersion: 1,
                sendUpdates: "all",
            });
            meetingLink = eventResponse.data.hangoutLink
            newBooking.meetingLink = meetingLink
            await newBooking.save()

            return res.status(201).send({
                status: "SUCCESS",
                message: "Slot booked successfully",
                data: newBooking,
            });
        }
        meetingLink = await createSpace(authorize() , coach.email);
        newBooking.meetingLink = meetingLink;
        
        const userAppointmentTempHtml = userAppointmentTemp.replaceAll("{username}", user.email).replace('{coachname}', coach.name).replace('{date}', date).replace('{slot}' , `${slotTime.startTime} - ${slotTime.endTime}`).replace('{timezone}' , timezone)
        await sendEmail(user.email, "Career Coaching Session", userAppointmentTempHtml);

        const coachAppointmentTempHtml = coachAppointmentTemplate.replaceAll("{username}", user.fullname).replace('{coachname}', coach.name).replace('{date}', date).replace('{slot}' , `${slotTime.startTime} - ${slotTime.endTime}`).replace('{timezone}' , timezone)
        await sendEmail(coach.email, "Career Coaching Session", coachAppointmentTempHtml);
        
        await newBooking.save();
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