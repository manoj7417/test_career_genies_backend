
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../utils/nodemailer");
const resetPasswordTemplatePath = path.join(
  __dirname,
  "..",
  "emailTemplates",
  "resetPassword.html"
);
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const { Resume } = require("../models/ResumeModel");

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

// register the user 
const register = async (request, reply) => {
  const { email, fullname, password } = request.body;
  console.log(request.body)
  try {
    const findExistingUser = await User.findOne({ email });
    if (findExistingUser) {
      return reply
        .code(409)
        .send({ status: "FAILURE", error: "User already exists" });
    }
    const user = new User({ email, fullname, password });
    await user.save();

    return reply.code(201).send({
      status: "SUCCESS",
      message: "Registration successful",
    });
  } catch (error) {
    console.log(error);
    reply.code(500).json({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
};

// verfiy user password and send access token in cookies
const login = async (request, reply) => {
  const { email, password } = request.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return request.code(404).send({
        status: "FAILURE",
        error: "User not found",
      });
    }
    const isPasswordcorrect = await user.comparePassword(password);
    if (!isPasswordcorrect) {
      return reply.code(401).send({
        status: "FAILURE",
        error: "Invalid credentials",
      });
    }
    const accessToken = await user.generateAccessToken();
    if (accessToken) {
      reply.setCookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: process.env.NODE_ENV !== 'development' ? 'strict' : 'lax',
        path: "/",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        domain: "https://career-genies-frontend.vercel.app/"
      }).code(200).send({
        status: "SUCCESS",
        message: "Login successful",
      });
    }
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
    const url = `${process.env.DOMAINURL}?token=${token}`;
    const emailtemplate = fs.readFileSync(resetPasswordTemplatePath, "utf-8");
    const emailBody = emailtemplate
      .replace("{userName}", user.fullname)
      .replace("{reset-password-link}", url);
    await sendEmail(user.email, "Reset Password", emailBody);
    console.log(token);
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

    const { userId } = await decodeToken(token);
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


// update the user role and subsription status  for the specific user 
const updateUserDetails = async (request, reply) => {
  const { role, isSubscribed } = request.body;
  const { userId } = request.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "User not found",
      });
    }
    if (role) user.role = role;
    if (isSubscribed !== undefined) user.isSubscribed = isSubscribed;
    await user.save();
    return reply.code(200).send({
      status: "SUCCESS",
      message: "User details updated successfully",
    });
  } catch (error) {
    console.log("error", error);
    reply.code(500).send({
      status: "FAILURE",
      error: error.message || "Internal server error",
    });
  }
}


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
async function decodeToken(token) {
  try {
    const decoded = await jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
    return decoded;
  } catch (error) {
    throw new Error(error?.message);
  }
}

module.exports = {
  register,
  login,
  forgetPassword,
  resetPassword,
  updateUserDetails,
  getAllUsers,
  logout
};
