const Job = require('../models/jobModel');
const jwt = require('jsonwebtoken');
const { User } = require('../models/userModel');
const { uploadfile } = require('../utils/s3Client');
const mongoose = require('mongoose');

// Helper function to verify token and get user data
const verifyToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

exports.createJob = async (request, reply) => {
    try {
        // Verify token and get recruiter ID
        const decoded = verifyToken(request.headers.authorization);
        
        const jobData = request.body;

        // Format location based on work type
        let formattedLocation;
        if (jobData.workType === 'remote') {
            formattedLocation = 'Remote';
        } else if (jobData.workType === 'hybrid') {
            // Remove any existing prefixes to avoid duplication
            const cleanLocation = jobData.location.replace(/^(Hybrid|In-Office) - /g, '');
            formattedLocation = `Hybrid - ${cleanLocation}`;
        } else if (jobData.workType === 'onsite') {  // Also fixed 'in-office' to 'onsite' to match schema
            // Remove any existing prefixes to avoid duplication
            const cleanLocation = jobData.location.replace(/^(Hybrid|In-Office) - /g, '');
            formattedLocation = `In-Office - ${cleanLocation}`;
        }

        // Create job with recruiter ID and formatted location
        const job = await Job.create({
            ...jobData,
            location: formattedLocation,
            recruiter: decoded.id
        });

        return reply.code(201).send({
            status: 'success',
            data: {
                job
            }
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return reply.code(401).send({
                status: 'error',
                message: 'Invalid token'
            });
        }
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.getAllJobs = async (request, reply) => {
    try {
        // Verify token and get recruiter ID
        const decoded = verifyToken(request.headers.authorization);
        
        // Get query parameters
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const sortBy = request.query.sortBy || 'createdAt';
        const order = request.query.order === 'asc' ? 1 : -1;
        const search = request.query.search || '';
        const type = request.query.type || '';
        const workType = request.query.location || ''; // Using location filter for workType
        const salary = request.query.salary || '';

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Create sort object
        const sortObject = {};
        sortObject[sortBy] = order;

        // Build filter query with decoded ID
        const filterQuery = { recruiter: decoded.id };

        // Add search filter
        if (search) {
            filterQuery.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } }
            ];
        }

        // Add type filter
        if (type) {
            filterQuery.type = type;
        }

        // Add work type filter
        if (workType) {
            if (workType === 'remote') {
                filterQuery.location = 'Remote';
            } else {
                filterQuery.location = { 
                    $regex: new RegExp(`^${workType}`, 'i') 
                };
            }
        }

        // Add salary filter
        if (salary) {
            const [min, max] = salary.split('-').map(Number);
            if (max) {
                filterQuery['salary.min'] = { $gte: min, $lte: max };
            } else {
                filterQuery['salary.min'] = { $gte: min };
            }
        }

        // Find jobs with filters, pagination and sorting
        const jobs = await Job.find(filterQuery)
            .populate('recruiter', 'name company')
            .sort(sortObject)
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalJobs = await Job.countDocuments(filterQuery);
        const totalPages = Math.ceil(totalJobs / limit);

        return reply.send({
            status: 'success',
            results: jobs.length,
            data: {
                jobs,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalJobs,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return reply.code(401).send({
                status: 'error',
                message: 'Invalid token'
            });
        }
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.applyForJob = async (request, reply) => {
    try {
        const parts = request.parts();
        const fields = {};
        const files = {};

        // Process multipart form data
        for await (const part of parts) {
            if (part.file) {
                // Handle file (CV)
                const buffer = await part.toBuffer();
                files.cv = {
                    filename: part.filename,
                    mimetype: part.mimetype,
                    buffer: buffer
                };
            } else {
                // Handle other fields
                fields[part.fieldname] = part.value;
            }
        }

        const { fullName, email, phone, userId } = fields;
        
        // Find the job
        const job = await Job.findById(request.params.jobId);
        if (!job) {
            return reply.code(404).send({
                status: 'error',
                message: 'No job found with that ID'
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({
                status: 'error',
                message: 'User not found'
            });
        }

        // Check if user has already applied
        const alreadyApplied = job.applications.some(
            application => application.user.toString() === userId
        );

        if (alreadyApplied) {
            return reply.code(400).send({
                status: 'error',
                message: 'You have already applied for this job'
            });
        }

        // Upload CV if provided
        let cvUrl = user.cv; // Use existing CV URL by default
        if (files.cv) {
            try {
                // Generate unique filename
                const timestamp = Date.now();
                const filename = `cvs/${userId}-${timestamp}-${files.cv.filename}`;
                
                // Upload file to S3
                const uploadResult = await uploadfile(filename, files.cv.buffer);
                cvUrl = uploadResult.Location; // Get the URL of uploaded file
                
                // Update user's CV URL
                user.cv = cvUrl;
            } catch (error) {
                console.error('CV upload error:', error);
                return reply.code(400).send({
                    status: 'error',
                    message: 'Failed to upload CV'
                });
            }
        }

        // Update user's phone number if provided
        if (phone && (!user.phoneNumber.number || user.phoneNumber.number !== phone)) {
            user.phoneNumber.number = phone;
        }

        // Save user updates
        await user.save();

        // Add application to job
        job.applications.push({
            user: userId,
            status: 'pending',
            appliedAt: new Date()
        });

        await job.save();

        return reply.send({
            status: 'success',
            message: 'Application submitted successfully',
            data: {
                cvUrl,
                applicationDate: new Date()
            }
        });
    } catch (err) {
        console.error('Application error:', err);
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.getAllJobsPublic = async (request, reply) => {
    try {
        // Get query parameters
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const sortBy = request.query.sortBy || 'createdAt';
        const order = request.query.order === 'asc' ? 1 : -1;
        const search = request.query.search || '';
        const type = request.query.type || '';
        const workType = request.query.location || '';
        const salary = request.query.salary || '';
        const status = request.query.status || '';
        const token = request.query.token || '';

        // Calculate skip value for pagination
        const skip = (page - 1) * limit;

        // Create sort object
        const sortObject = {};
        sortObject[sortBy] = order;

        // Initialize filter query
        let filterQuery = {};

        // If token is provided, get recruiter's jobs only
        if (token) {
            try {
                // Remove 'Bearer ' prefix if it exists
                const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
                const decoded = jwt.verify(cleanToken, process.env.ACCESS_TOKEN_SECRET);
                
                if (!decoded.id) {
                    return reply.code(401).send({
                        status: 'error',
                        message: 'Invalid token format'
                    });
                }

                filterQuery = { recruiter: decoded.id }; // Removed mongoose.Types.ObjectId conversion
                
            } catch (tokenError) {
                console.error('Token verification error:', tokenError);
                return reply.code(401).send({
                    status: 'error',
                    message: 'Invalid token provided'
                });
            }
        } else {
            // If no token, only show active jobs
            filterQuery.status = 'active';
        }

        // Add status filter if provided (only for authenticated recruiters)
        if (status && token) {
            filterQuery.status = status;
        }

        // Add search filter
        if (search) {
            filterQuery.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } }
            ];
        }

        // Add type filter
        if (type) {
            filterQuery.type = type;
        }

        // Add work type filter
        if (workType) {
            if (workType === 'remote') {
                filterQuery.location = 'Remote';
            } else {
                filterQuery.location = { 
                    $regex: new RegExp(`^${workType}`, 'i') 
                };
            }
        }

        // Add salary filter
        if (salary) {
            const [min, max] = salary.split('-').map(Number);
            if (max) {
                filterQuery['salary.min'] = { $gte: min, $lte: max };
            } else {
                filterQuery['salary.min'] = { $gte: min };
            }
        }

        // Find jobs with filters
        const jobs = await Job.find(filterQuery)
            .populate('recruiter', 'name company')
            .sort(sortObject)
            .skip(skip)
            .limit(limit);

        const totalJobs = await Job.countDocuments(filterQuery);
        const totalPages = Math.ceil(totalJobs / limit);

        return reply.send({
            status: 'success',
            results: jobs.length,
            data: {
                jobs,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalJobs,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (err) {
        console.error('Get jobs error:', err);
        reply.code(500).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.getUserApplications = async (request, reply) => {
    try {
        const userId = request.query.userId;
        if (!userId) {
            return reply.code(400).send({
                status: 'error',
                message: 'User ID is required'
            });
        }
        // Get query parameters for pagination
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Find all jobs where user has applied
        const jobs = await Job.find({
            'applications.user': userId
        })
        .populate('recruiter', 'name company email phone')
        .sort({ 'applications.appliedAt': -1 }) // Sort by application date
        .skip(skip)
        .limit(limit);

        // Get application details for each job
        const jobsWithApplicationDetails = jobs.map(job => {
            const application = job.applications.find(
                app => app.user.toString() === userId
            );
            return {
                ...job.toObject(),
                applicationDetails: {
                    status: application.status,
                    appliedAt: application.appliedAt,
                }
            };
        });

        // Get total count for pagination
        const totalApplications = await Job.countDocuments({
            'applications.user': userId
        });
        const totalPages = Math.ceil(totalApplications / limit);

        return reply.send({
            status: 'success',
            results: jobs.length,
            data: {
                applications: jobsWithApplicationDetails,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalApplications,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (err) {
        console.error('Fetch applications error:', err);
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.getJobApplications = async (request, reply) => {
    try {
        const jobId = request.params.jobId;
        
        // Get query parameters for pagination
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Find the job and populate user details
        const job = await Job.findById(jobId)
            .populate({
                path: 'applications.user',
                select: 'fullname email phoneNumber.number cv'
            })
            .populate('recruiter', 'name company');

        if (!job) {
            return reply.code(404).send({
                status: 'error',
                message: 'Job not found'
            });
        }

        // Format applications data
        const applications = job.applications
            .slice(skip, skip + limit)
            .map(application => ({
                applicationId: application._id,
                status: application.status,
                appliedAt: application.appliedAt,
                applicant: {
                    id: application.user._id,
                    name: application.user.fullname,
                    email: application.user.email,
                    phone: application.user.phoneNumber.number,
                    cv: application.user.cv
                }
            }));

        const totalApplications = job.applications.length;
        const totalPages = Math.ceil(totalApplications / limit);

        return reply.send({
            status: 'success',
            results: applications.length,
            data: {
                jobTitle: job.title,
                company: job.company,
                applications,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalApplications,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (err) {
        console.error('Get job applications error:', err);
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
};

exports.updateJob = async (request, reply) => {
    try {
        const jobId = request.params.jobId;
        const updateData = request.body.data;
        
        const decoded = verifyToken(request.headers.authorization);

        // Find the job
        const job = await Job.findById(jobId);
        
        if (!job) {
            return reply.code(404).send({
                status: 'error',
                message: 'Job not found'
            });
        }

        // Check if the recruiter owns this job
        if (job.recruiter.toString() !== decoded.id) {
            return reply.code(403).send({
                status: 'error',
                message: 'You are not authorized to edit this job'
            });
        }

        // Check if this is an application status update
        if (updateData.applicationId && (updateData.applicationStatus || updateData.status)) {
            // Find the application in the job
            const applicationIndex = job.applications.findIndex(
                app => app._id.toString() === updateData.applicationId
            );

            if (applicationIndex === -1) {
                return reply.code(404).send({
                    status: 'error',
                    message: 'Application not found'
                });
            }

            // Update the application status (handle both status and applicationStatus)
            const newStatus = updateData.applicationStatus || updateData.status;
            job.applications[applicationIndex].status = newStatus;
            
            // Save the updated job
            await job.save();

            return reply.send({
                status: 'success',
                message: 'Application status updated successfully',
                data: {
                    applicationId: updateData.applicationId,
                    status: newStatus
                }
            });
        }

        // If not an application update, proceed with job update
        let formattedLocation;
        if (updateData.workType === 'remote') {
            formattedLocation = 'Remote';
        } else if (updateData.workType === 'hybrid') {
            // Remove any existing prefixes to avoid duplication
            const cleanLocation = updateData.location.replace(/^(Hybrid|In-Office) - /g, '');
            formattedLocation = `Hybrid - ${cleanLocation}`;
        } else if (updateData.workType === 'onsite') {
            // Remove any existing prefixes to avoid duplication
            const cleanLocation = updateData.location.replace(/^(Hybrid|In-Office) - /g, '');
            formattedLocation = `In-Office - ${cleanLocation}`;
        }

        // If job status is being changed to 'closed'
        if (updateData.status === 'closed') {
            updateData.closureDetails = {
                candidateFound: updateData.candidateFound || false,
                closureReason: updateData.closureReason || 'other',
                closureNote: updateData.closureNote || '',
                closedAt: new Date()
            };
        }

        // Update the job
        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            {
                title: updateData.title,
                company: updateData.company,
                workType: updateData.workType,
                location: formattedLocation,
                type: updateData.type,
                description: updateData.description,
                requirements: updateData.requirements,
                status: updateData.status,
                ...(updateData.closureDetails && { closureDetails: updateData.closureDetails }),
                salary: {
                    min: updateData.salary.min,
                    max: updateData.salary.max,
                    currency: updateData.salary.currency
                }
            },
            { 
                new: true,
                runValidators: true
            }
        ).populate('recruiter', 'name company');

        return reply.send({
            status: 'success',
            data: {
                job: updatedJob
            }
        });
    } catch (err) {
        console.error('Update job error:', err);
        if (err.name === 'JsonWebTokenError') {
            return reply.code(401).send({
                status: 'error',
                message: 'Invalid token'
            });
        }
        reply.code(400).send({
            status: 'error',
            message: err.message
        });
    }
}; 