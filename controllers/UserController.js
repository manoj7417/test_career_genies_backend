require('dotenv').config();
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../utils/nodemailer");
const resetPasswordTemplatePath = path.join(
  __dirname,
  "..",
  "emailTemplates",
  "resetPassword.html"
);
const welcomeTemplatePath = path.join(__dirname, '..', 'emailTemplates', 'WelcomeTemplate.html');
const VerfiyEmailPath = path.join(__dirname, '..', 'emailTemplates', 'VerifyEmail.html');
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const { Resume } = require("../models/ResumeModel");
const { Transaction } = require("../models/TransactionModel");
const produrl = process.env.NODE_ENV !== 'development' ? process.env.PROD_URL : process.env.LOCAL_URL
const axios = require('axios');
const { uploadfile } = require('../utils/s3Client');
const { Booking } = require('../models/BookingModel');

function getFilenameFromUrl(url) {
  const parts = url.split('uploads/');
  let endpoint = parts.length > 1 ? parts[1] : ''
  endpoint = 'uploads/' + endpoint
  return endpoint
}
//generate access token and refresh token for the user
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const getVerificationToken = (userId) => {
  const token = jwt.sign({ _id: userId }, process.env.EMAIL_VERIFICATION_SECRET, {
    expiresIn: process.env.EMAIL_VERIFICATION_EXPIRY
  })
  return token;
}

// register the user 
const register = async (request, reply) => {
  const { email, fullname, password } = request.body;
  try {
    const findExistingUser = await User.findOne({ email });
    if (findExistingUser) {
      return reply
        .code(409)
        .send({ status: "FAILURE", error: "Account already exists" });
    }
    const user = new User({ email, fullname, password });
    await user.save();
    const verificationToken = await getVerificationToken(user._id);
    const verificationLink = `https://geniescareerhub.com/verify-email?token=${verificationToken}`;
    const VerifyEmail = fs.readFileSync(VerfiyEmailPath, "utf-8");
    const VerfiyEmailBody = VerifyEmail.replace("{username}", fullname).replace("{verify-link}", verificationLink)
    const welcomeTemplate = fs.readFileSync(welcomeTemplatePath, "utf-8");
    const welcomeEmailBody = welcomeTemplate.replace("{fullname}", fullname)
    await sendEmail(
      email,
      "Genies Career Hub: Email verification",
      VerfiyEmailBody,
    );
    setTimeout(async () => {
      await sendEmail(email, "Welcome to Genies Career Hub", welcomeEmailBody);
    }, 100000)
    return reply.code(201).send({
      status: "SUCCESS",
      message: "Registration successful",
    });
  } catch (error) {
    console.log(error);
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
};


const templatepurchase = async (request, reply) => {
  try {
    const { templateName, userId, amount } = await request.body;
    if (!templateName) {
      return reply.code(400).send({ status: "FAILURE", error: "Template name not found" });
    }
    const transaction = new Transaction({
      userId: userId,
      templateName: templateName,
      amount: amount,
      status: "completed"
    })

    await transaction.save()

    const user = await User.findById(userId);
    user.premiumTemplates.push(templateName);
    await user.save();

    reply.code(200).send({ status: "SUCCESS", message: "Purchase successful", transactionId: transaction._id, userdata: user, redirectTo: "/builder" });
  }
  catch (error) {
    console.log(error)
    reply.code(500).send({ status: "FAILURE", message: "Purchase failed", error: error.message });
  }
}

const analyserCreditsPurchase = async (request, reply) => {
  const userId = request.user._id
  try {
    const user = await User.findById(userId)
    if (!user) {
      return reply.code(404).send({ status: "FAILURE", error: "User not found" })
    }
    user.tokens = user.tokens + 10
    await user.save()
    reply.code(200).send({ status: "SUCCESS", message: "Purchase successful", userdata: user })
  } catch (error) {
    console.log(error)
    reply.code(500).send({ status: "FAILURE", message: "Purchase failed", error: error.message });
  }
}

const UploadProfilePic = async (request, reply) => {
  const userId = request.user._id
  try {
    const file = request.file;
    if (!file) {
      reply.code(404).send({
        status: "FAILURE",
        error: "File not found"
      })
    }
    const user = await User.findById(userId)
    if (!user) {
      reply.code(404).send({
        status: "FAILURE",
        error: "User not found"
      })
    }
    if (user.profilePicture) {
      const filename = getFilenameFromUrl(user.profilePicture);
      try {
        await fs.promises.unlink(filename);
      } catch (error) {
        console.error(`Error deleting existing profile picture: ${error.message}`);
      }
    }
    const imgDest = produrl + file.destination + file.filename
    user.profilePicture = imgDest;

    await user.save()
    reply.code(200).send({
      status: "SUCCESS",
      message: "Profile picture uploaded successfully",
      userdata: user
    })
  } catch (error) {
    console.log("Error uploading user profile picture", error)
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error"
    })
  }
}

// verfiy user password and send access token in cookies
const login = async (request, reply) => {
  const { email, password } = request.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "Account with email address doesn't exist",
      });
    }
    if (!user.emailVerified) {
      return reply.code(403).send({
        status: "FAILURE",
        error: "Email verification is required",
      });
    }
    const isPasswordcorrect = await user.comparePassword(password);
    if (!isPasswordcorrect) {
      return reply.code(401).send({
        status: "FAILURE",
        error: "Invalid password",
      });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
    reply.code(200).send({
      status: "SUCCESS",
      message: "Login successful",
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        userdata: user.toSafeObject()
      }
    });
  } catch (error) {
    console.log(error);
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
};

// generate token for the user and email the user  the frontend link with token to reset the password 
const forgetPassword = async (request, reply) => {
  const { email } = request.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        message: "User not found",
      });
    }
    const token = await user.generateResetPassowordToken();
    // const url = `http://localhost:3000/reset-password?token=${token}`;
    const url = `https://geniescareerhub.com/reset-password?token=${token}&type=user`;
    const emailtemplate = fs.readFileSync(resetPasswordTemplatePath, "utf-8");
    const emailBody = emailtemplate
      .replace("{userName}", user.fullname)
      .replace("{reset-password-link}", url);
    await sendEmail(user.email, "Reset Password", emailBody);
    reply.code(201).send({
      status: "SUCCESS",
      message: "Reset password link has been sent to your email",
    });
  } catch (error) {
    console.log(error);
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
};

//decode user token from response token and update the user password accordingly
const resetPassword = async (request, reply) => {
  const { newPassword, token } = request.body;
  try {
    if (!token) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "Token not found",
      });
    }

    const { userId } = await decodeToken(token, process.env.RESET_PASSWORD_SECRET);
    if (!userId) {
      return reply.code(401).send({
        status: "FAILURE",
        error: "Unauthorized",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "User doesn't exist",
      });
    }
    user.password = newPassword;
    await user.save();
    return reply.code(200).send({
      status: "SUCCESS",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.log("error", error);
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
};


const changePassword = async (req, reply) => {
  const userId = req.user._id;
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "User not found",
      });
    }
    const isPasswordCorrect = await user.comparePassword(oldPassword);
    if (!isPasswordCorrect) {
      return reply.code(401).send({
        status: "FAILURE",
        error: "Invalid password",
      });
    }
    user.password = newPassword;
    await user.save();
    return reply.code(200).send({
      status: "SUCCESS",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.log(error);
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
}

// update the user role and subsription status  for the specific user 
//get all users data
const getAllUsers = async (request, reply) => {
  const { startDate, endDate, order, isSubscribed } = request.query;

  try {
    // Validate startDate and endDate
    const isValidDate = (dateString) => {
      return dateString && !isNaN(Date.parse(dateString));
    };

    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return reply.code(400).send({ status: "FAILURE", error: "Invalid startDate or endDate" });
    }

    // Validate order
    const isValidOrder = (order) => {
      return !order || ['asc', 'desc'].includes(order);
    };

    if (order && !isValidOrder(order)) {
      return reply.code(400).send({ status: "FAILURE", error: "Invalid order value. It should be 'asc' or 'desc'." });
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return reply.code(400).send({ status: "FAILURE", error: "startDate should be less than endDate." });
    }

    let pipeline = []

    pipeline.push({
      $match: { role: "user" }
    })
    // Construct filter based on query parameters
    const matchStage = {};
    if (startDate) {
      matchStage.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(endDate) };
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    if (isSubscribed !== undefined) {
      pipeline.push({
        $match: {
          isSubscribed: isSubscribed === 'true' // Convert string to boolean
        }
      });
    }

    // Optional sorting by order
    if (order) {
      pipeline.push({
        $sort: {
          order: order === 'asc' ? 1 : -1
        }
      });
    }

    pipeline.push({
      $lookup: {
        from: 'resumes',
        localField: 'resumes',
        foreignField: '_id',
        as: 'resumes'
      }
    }, {
      $addFields: {
        numberOfResumes: { $size: '$resumes' }
      }
    });

    let users;
    if (pipeline.length > 0) {
      users = await User.aggregate(pipeline);
    } else {
      users = await User.find();
    }

    const totalResumesCount = await Resume.countDocuments();

    const numberOfUsers = users.length;
    reply.code(200).send({
      status: "SUCCESS",
      data: { userData: users, numberOfUsers, totalResumesCount },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
}


// 
const logout = async (request, reply) => {
  try {
    reply.clearCookie('accessToken');
    reply.code(200).send({ status: "SUCCESS", message: "Logout successful" });
  } catch (error) {
    console.log(error.message || "Internal server error")
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
}




//decode the reset password token and return the decode result
async function decodeToken(token, secret) {
  try {
    const decoded = await jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    throw new Error(error?.message);
  }
}

const updateUserProfileDetails = async (req, reply) => {
  const userId = req.user._id;
  const { fullname, phoneNumber, profilePicture, address, occupation, links, role } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "User not found",
      });
    }

    if (fullname !== undefined) user.fullname = fullname;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (address !== undefined) user.address = address;
    if (occupation !== undefined) user.occupation = occupation;
    if (links !== undefined) user.links = links;
    if (role !== undefined) user.role = role;

    // Save the updated user
    await user.save();
    let userdata = await user.toSafeObject()

    return reply.code(200).send({
      status: "SUCCESS",
      message: "User details updated successfully",
      data: {
        userdata
      }
    });
  } catch (error) {
    console.error("Error updating user details:", error);
    return reply.code(500).send({
      status: "FAILURE",
      error: "An error occurred while updating user details",
    });
  }
};

const udpateProfileImage = async (req, reply) => {
  const data = await req.file();
  const user = req.user
  console.log(data)
  try {
    const fileName = `GeniesCareerHub/${Date.now()}_${data.filename}`;
    const response = await uploadfile(fileName, data.file);
    if (!response) {
      return res.status(400).send({
        status: "FAILURE",
        error: "Error uploading profile image"
      })
    }
    user.profilePicture = `${process.env.DO_CDN_URL}/${fileName}`
    return reply.code(200).send({ message: 'File uploaded successfully', url: `${process.env.DO_CDN_URL}/${fileName}`, userdata: user.toSafeObject() });
  } catch (error) {
    console.error('Error uploading file: ', error);
    return reply.code(500).send({ error: 'Failed to upload image' });
  }
}

const GetuserDetails = async (req, reply) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.code(404).send({ status: "FAILURE", message: "User not found" });
    }
    const userData = user.toSafeObject();
    return reply.code(200).send({
      status: "SUCCESS",
      data: userData
    })
  } catch (error) {
    console.error("Error fetching user details:", error);
    reply.code(500).send({
      status: "FAILURE",
      error: "An error occurred while fetching user details",
    })
  }
}


const careerCounsellingEligibility = async (req, reply) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({ status: "FAILURE", message: "User not found" });
    }


    if (user.subscription.status !== 'Active') {
      return reply.code(403).send({
        status: "FAILURE",
        message: "Subscription is not active"
      });
    }

    if (user.subscription.careerCounsellingTokens <= 0) {
      return reply.code(403).send({
        status: "FAILURE",
        message: "Insufficient career counselling tokens"
      });
    }

    reply.send({
      status: "SUCCESS",
      message: "User is eligible for career counselling test"
    });
  } catch (error) {
    console.error("Error fetching career counselling eligibility:", error);
    reply.code(500).send({
      status: "FAILURE",
      error: "An error occurred while fetching career counselling eligibility"
    })
  }
}


const verifyToken = async (res, reply) => {
  const { accessToken, refreshToken } = res.body;
  if (!accessToken || !refreshToken) {
    return reply.code(400).send({ status: "FAILURE", message: "Missing access token or refresh token" });
  }
  try {
    const decodedAccessToken = await jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedAccessToken._id);
    if (!user) {
      return reply.code(401).send({ status: "FAILURE", message: "User not found" });
    }
    return reply.code(200).send({ valid: true, userdata: user.toSafeObject(), accessToken, refreshToken });
  } catch (accessTokenError) {
    if (accessTokenError.name === 'TokenExpiredError') {
      try {
        const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedRefreshToken._id);
        if (!user) {
          return reply.code(401).send({ status: "FAILURE", message: "User not found" });
        }
        const tokens = await generateAccessAndRefereshTokens(decodedRefreshToken._id)

        return reply.code(200).send({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          userdata: user.toSafeObject()
        });
      } catch (refreshTokenError) {
        if (refreshTokenError.name === 'TokenExpiredError') {
          return reply.code(401).send({ status: "FAILURE", message: 'Refresh token expired, please log in again.' });
        } else {
          return reply.code(401).send({ status: "FAILURE", message: 'Invalid refresh token.' });
        }
      }
    } else {
      return reply.code(401).send({ status: "FAILURE", message: "Invalid access token" });
    }
  }
}

const verifyEmail = async (req, res) => {
  const { token } = req.body;
  try {
    if (!token) {
      return res.code(400).send({ status: "FAILURE", message: "Token is missing" });
    }
    const secret = process.env.EMAIL_VERIFICATION_SECRET
    const decoded = await decodeToken(token, secret);
    if (!decoded) {
      return res.code(404).send({ status: "FAILURE", message: "Token not found" });
    }
    const user = await User.findByIdAndUpdate(decoded._id, { emailVerified: true }, { new: true });
    await user.save()
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)
    res.code(200).send({ status: "SUCCESS", message: "Email verified successfully", accessToken, refreshToken, userdata: user?.toSafeObject() });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.code(500).send({ status: "FAILURE", message: "An error occurred while verifying email" });
  }
}


const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        message: "User not found",
      });
    }
    const verificationToken = await getVerificationToken(user._id);
    const verificationLink = `https://geniescareerhub.com/verify-email?token=${verificationToken}`;
    const VerifyEmail = fs.readFileSync(VerfiyEmailPath, "utf-8");
    const VerfiyEmailBody = VerifyEmail.replace("{username}", user.fullname).replace("{verify-link}", verificationLink)
    await sendEmail(
      email,
      "Genie's Career Hub: Email verification",
      VerfiyEmailBody,
    );
    res.status(200).send({ status: "SUCCESS", message: "Verification email sent successfully" });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).send({ status: "FAILURE", message: "An error occurred while sending verification email" });
  }
}

const getUserBookingsDetails = async (req, res) => {
  const userId = req.user._id;
  try {
    const bookings = await Booking.find({ userId }).populate('coachId' , 'name email phone profileImage country city experience typeOfCoaching skills ratesPerHour');
    res.status(200).send({ status: "SUCCESS", bookings });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "FAILURE", message: "An error occurred while fetching bookings" });
  }
}


module.exports = {
  register,
  login,
  forgetPassword,
  UploadProfilePic,
  resetPassword,
  getAllUsers,
  logout,
  templatepurchase,
  analyserCreditsPurchase,
  updateUserProfileDetails,
  GetuserDetails,
  careerCounsellingEligibility,
  changePassword,
  verifyToken,
  verifyEmail,
  resendVerificationEmail,
  udpateProfileImage,
  getUserBookingsDetails
};
