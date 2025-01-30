const recruiterController = require('../controllers/recruiterController');
const jobController = require('../controllers/jobController');

async function routes(fastify, options) {
    // Auth routes (public)
    fastify.post('/signup', recruiterController.signup);
    fastify.post('/login', recruiterController.login);

    // Protected routes
    fastify.register(async function (fastify, opts) {
        // Use your existing JWT verification middleware
        // fastify.addHook('preHandler', fastify.verifyJWT);

        // Get logged-in recruiter profile
        fastify.get('/me', recruiterController.getRecruiterProfile);
        
        // Get all recruiters (optional - you might want to add admin middleware)
        fastify.get('/all', recruiterController.getAllRecruiters);

        // Job routes with query parameters
        fastify.get('/jobs', {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', default: 1 },
                        limit: { type: 'integer', default: 10 },
                        sortBy: { type: 'string', default: 'createdAt' },
                        order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
                        search: { type: 'string', default: '' },
                        type: { type: 'string', default: '' },
                        location: { type: 'string', default: '' },
                        salary: { type: 'string', default: '' }
                    }
                }
            },
            handler: jobController.getAllJobs
        });

        // New route to get all jobs without recruiter filter
        fastify.get('/alljobs', {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', default: 1 },
                        limit: { type: 'integer', default: 10 },
                        sortBy: { type: 'string', default: 'createdAt' },
                        order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
                        search: { type: 'string', default: '' },
                        type: { type: 'string', default: '' },
                        location: { type: 'string', default: '' },
                        salary: { type: 'string', default: '' },
                        status: { type: 'string', default: '' },
                        token: { type: 'string', default: '' }
                    }
                }
            },
            handler: jobController.getAllJobsPublic
        });

        fastify.post('/jobs', jobController.createJob);
        fastify.post('/jobs/:jobId/apply', {
            config: {
                // Enable multipart support for this route
                multipart: true,
            },
            handler: jobController.applyForJob
        });

        fastify.get('/applications', {
            schema: {
                querystring: {
                    type: 'object',
                    required: ['userId'],  // Required fields must be in an array
                    properties: {
                        userId: { type: 'string' },
                        page: { type: 'integer', default: 1 },
                        limit: { type: 'integer', default: 10 }
                    }
                }
            },
            handler: jobController.getUserApplications
        });

        fastify.get('/jobs/:jobId/applications', {
            schema: {
                params: {
                    type: 'object',
                    required: ['jobId'],
                    properties: {
                        jobId: { type: 'string' }
                    }
                },
                querystring: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', default: 1 },
                        limit: { type: 'integer', default: 10 }
                    }
                }
            },
            handler: jobController.getJobApplications
        });

        fastify.put('/jobs/:jobId', {
            schema: {
                params: {
                    type: 'object',
                    required: ['jobId'],
                    properties: {
                        jobId: { type: 'string' }
                    }
                },
                body: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'object',
                            oneOf: [
                                {
                                    // Application status update schema
                                    required: ['applicationId', 'status'],
                                    properties: {
                                        applicationId: { type: 'string' },
                                        status: { 
                                            type: 'string', 
                                            enum: ['pending', 'reviewed', 'accepted', 'rejected'] 
                                        }
                                    },
                                    additionalProperties: false
                                },
                                {
                                    // Job update schema
                                    required: ['title', 'company', 'workType', 'type', 'description', 'requirements', 'salary'],
                                    properties: {
                                        title: { type: 'string' },
                                        company: { type: 'string' },
                                        workType: { type: 'string', enum: ['remote', 'hybrid', 'onsite'] },
                                        location: { type: 'string' },
                                        type: { type: 'string', enum: ['Full-time', 'Part-time', 'Contract', 'Internship'] },
                                        description: { type: 'string' },
                                        requirements: { type: 'array', items: { type: 'string' } },
                                        status: { type: 'string', enum: ['active', 'closed'] },
                                        candidateFound: { type: 'boolean' },
                                        closureReason: { 
                                            type: 'string', 
                                            enum: ['hired', 'cancelled', 'position_filled', 'other'] 
                                        },
                                        closureNote: { type: 'string' },
                                        salary: {
                                            type: 'object',
                                            properties: {
                                                min: { type: 'number' },
                                                max: { type: 'number' },
                                                currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'] }
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    required: ['data']
                }
            },
            handler: jobController.updateJob
        });

        fastify.post('/verify-email', {
            schema: {
                body: {
                    type: 'object',
                    required: ['token'],
                    properties: {
                        token: { type: 'string' }
                    }
                }
            },
            handler: recruiterController.verifyEmail
        });

        fastify.post('/resend-verification', {
            schema: {
                body: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: { type: 'string' }
                    }
                }
            },
            handler: recruiterController.resendVerificationEmail
        });

        fastify.post('/forgot-password', {
            schema: {
                body: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                        email: { type: 'string' }
                    }
                }
            },
            handler: recruiterController.forgotPassword
        });

        fastify.post('/reset-password', {
            schema: {
                body: {
                    type: 'object',
                    required: ['token', 'newPassword'],
                    properties: {
                        token: { type: 'string' },
                        newPassword: { type: 'string' }
                    }
                }
            },
            handler: recruiterController.resetPassword
        });
    });
}

module.exports = routes; 