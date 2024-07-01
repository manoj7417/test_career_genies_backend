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
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");
const { Resume } = require("../models/ResumeModel");
const { Transaction } = require("../models/TransactionModel");
const { Order } = require('../models/OrderModel');
const produrl = process.env.NODE_ENV !== 'development' ? process.env.PROD_URL : process.env.LOCAL_URL

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

// register the user 
const register = async (request, reply) => {
  const { email, fullname, password } = request.body;
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

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
    reply.code(200).send({
      status: "SUCCESS",
      message: "Login successful",
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        userdata: {
          fullname: user.fullname,
          email: user.email,
          _id: user._id,
          role: user.role,
          isSubscribed: user.isSubscribed,
          createdResumes: user.createdResumes,
          premiumTemplates: user.premiumTemplates,
          profilePicture: user.profilePicture,
          address: user.address,
          occupation: user.occupation,
          phoneNumber: user.phoneNumber,
          tokens: user.tokens
        }
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
    const url = `https://career-genies-frontend.vercel.app/reset-password?token=${token}`;
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


const updateUserDetails = async (req, reply) => {
  const userId = req.user._id;
  const { fullname, email, password, phoneNumber, profilePicture, address, occupation, links, role } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "User not found",
      });
    }

    if (fullname !== undefined) user.fullname = fullname;
    if (email !== undefined) user.email = email;
    if (password !== undefined) user.password = password;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (address !== undefined) user.address = address;
    if (occupation !== undefined) user.occupation = occupation;
    if (links !== undefined) user.links = links;
    if (role !== undefined) user.role = role;

    // Save the updated user
    await user.save();

    return reply.code(200).send({
      status: "SUCCESS",
      message: "User details updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user details:", error);
    return reply.code(500).send({
      status: "FAILURE",
      error: "An error occurred while updating user details",
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



const updateUserProfileDetails = async (req, reply) => {
  const userId = req.user._id;
  const { fullname, email, password, phoneNumber, profilePicture, address, occupation, links, role } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "User not found",
      });
    }

    if (fullname !== undefined) user.fullname = fullname;
    if (email !== undefined) user.email = email;
    if (password !== undefined) user.password = password;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (address !== undefined) user.address = address;
    if (occupation !== undefined) user.occupation = occupation;
    if (links !== undefined) user.links = links;
    if (role !== undefined) user.role = role;

    // Save the updated user
    await user.save();

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
          "Something went wrong while generating refresh and access token"
        );
      }
    };
    // Generate new tokens
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    return reply.code(200).send({
      status: "SUCCESS",
      message: "User details updated successfully",
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        userdata: {
          fullname: user.fullname,
          email: user.email,
          _id: user._id,
          role: user.role,
          isSubscribed: user.isSubscribed,
          createdResumes: user.createdResumes,
          premiumTemplates: user.premiumTemplates,
          profilePicture: user.profilePicture,
          address: user.address,
          occupation: user.occupation,
          phoneNumber: user.phoneNumber,
          tokens: user.tokens
        }
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


const checkUserTemplate = async (req, reply) => {
  const userId = req.user._id
  const { templateName } = req.body;

  try {
    const hasTemplate = await Order.findOne({ userId, templateName })
    if (!hasTemplate) {
      return reply.code(404).send({
        status: "FAILURE",
        error: "User does not have this template",
      });
    }

    if (hasTemplate && hasTemplate.paymentStatus === 'Failed') {
      return reply.code(400).send({
        status: "FAILURE",
        error: "Payment failed for this template"
      })
    }

    if (hasTemplate && hasTemplate.paymentStatus === 'Pending') {
      return reply.code(400).send({
        status: "FAILURE",
        error: "Payment pending for this template"
      })
    }

    return reply.code(200).send({
      status: "SUCCESS",
      message: "User has this template"
    })
  } catch (error) {
    console.error("Error checking user template:", error);
    return reply.code(500).send({
      status: "FAILURE",
      error: "An error occurred while checking user template"
    })
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
  updateUserDetails,
  updateUserProfileDetails,
  checkUserTemplate
};
