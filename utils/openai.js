// utils/openai.js

require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const { type } = require('os');
const { threadId } = require('worker_threads');
const { User } = require('../models/userModel');
const { Resume } = require('../models/ResumeModel');
const { v4: uuidv4 } = require('uuid');
const { Analysis } = require('../models/AnalysisModel');
const { Summary } = require('../models/SummaryModel');
const { checkAndResetExpiredCredits } = require('./creditUtils');

const openai = new OpenAI(
    {
        apiKey: process.env['OPENAI_API_KEY']
    }
);

const assistantId = process.env['OPENAI_ASSISTANT_ID'];

// Configurable timeout settings (in milliseconds)
const TIMEOUT_CONFIG = {
    DEFAULT: parseInt(process.env.OPENAI_TIMEOUT_DEFAULT) || 120000, // 2 minutes default
    RESUME_GENERATION: parseInt(process.env.OPENAI_TIMEOUT_RESUME) || 180000, // 3 minutes for resume generation
    ANALYSIS: parseInt(process.env.OPENAI_TIMEOUT_ANALYSIS) || 150000, // 2.5 minutes for analysis
    COUNSELLING: parseInt(process.env.OPENAI_TIMEOUT_COUNSELLING) || 120000, // 2 minutes for counselling
    POLL_INTERVAL: parseInt(process.env.OPENAI_POLL_INTERVAL) || 2000, // 2 seconds
    MAX_RETRIES: parseInt(process.env.OPENAI_MAX_RETRIES) || 3
};

// Helper function to check OpenAI run status with timeout and proper error handling
async function checkStatusAndGenerateResponse(threadId, runId, maxWaitTime = TIMEOUT_CONFIG.DEFAULT) {
    const startTime = Date.now();
    const pollInterval = TIMEOUT_CONFIG.POLL_INTERVAL;
    let retryCount = 0;
    const maxRetries = TIMEOUT_CONFIG.MAX_RETRIES;

    while (Date.now() - startTime < maxWaitTime) {
        try {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);

            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');
                if (response && response.content) {
                    return response.content;
                } else {
                    throw new Error('No valid response content found from assistant');
                }
            } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
                const errorMsg = run.last_error?.message || 'Unknown error';
                console.error(`OpenAI run ${run.status}:`, errorMsg);
                throw new Error(`OpenAI run ${run.status}: ${errorMsg}`);
            } else if (run.status === 'requires_action') {
                console.log('Run requires action, waiting...');
                await new Promise(resolve => setTimeout(resolve, pollInterval * 2));
                continue;
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        } catch (error) {
            console.error('Error checking run status:', error);
            retryCount++;

            if (retryCount >= maxRetries) {
                throw new Error(`Failed to check run status after ${maxRetries} retries: ${error.message}`);
            }

            // Wait longer before retry
            await new Promise(resolve => setTimeout(resolve, pollInterval * 2));
        }
    }

    throw new Error(`OpenAI run timed out after ${maxWaitTime}ms (${Math.round(maxWaitTime / 1000)} seconds)`);
}

// Fallback function to create a basic resume when OpenAI fails
async function createFallbackResume(userId, message, fullname) {
    try {
        const count = await Resume.countDocuments({ userId });
        const username = fullname.split(" ")[0];
        const title = `${username}_resume_fallback_${Date.now()}`;

        const fallbackResume = new Resume({
            userId,
            title,
            data: {
                basics: {
                    name: username,
                    email: "",
                    phone: "",
                    location: "",
                    website: "",
                    summary: "Professional resume created with AI assistance"
                },
                sections: {
                    work: [],
                    education: [],
                    skills: [],
                    projects: [],
                    awards: [],
                    publications: [],
                    languages: [],
                    interests: [],
                    references: [],
                    volunteer: []
                }
            }
        });

        await fallbackResume.save();
        return fallbackResume;
    } catch (error) {
        console.error("Error creating fallback resume:", error);
        return null;
    }
}

// Helper function to safely parse OpenAI JSON responses
function safeParseOpenAIResponse(response) {
    // Validate response structure
    if (!response || !response[0] || !response[0].text || !response[0].text.value) {
        throw new Error('Invalid response structure from OpenAI');
    }

    // Clean the response text to remove undefined values
    let responseText = response[0].text.value;

    // Replace undefined values with null to make it valid JSON
    responseText = responseText.replace(/undefined/g, 'null');

    // Remove any trailing commas that might cause JSON parsing issues
    responseText = responseText.replace(/,(\s*[}\]])/g, '$1');

    try {
        return JSON.parse(responseText);
    } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text:', responseText);
        throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }
}

// Wrapper function to handle OpenAI operations with better error handling
async function handleOpenAIOperation(operation, operationName, timeoutMs = 120000) {
    try {
        console.log(`Starting ${operationName}...`);
        const result = await operation();
        console.log(`${operationName} completed successfully`);
        return result;
    } catch (error) {
        console.error(`Error in ${operationName}:`, error);

        // Provide more specific error messages based on error type
        if (error.message.includes('timed out')) {
            throw new Error(`The ${operationName} operation is taking longer than expected. Please try again or contact support if the issue persists.`);
        } else if (error.message.includes('rate limit')) {
            throw new Error('OpenAI service is currently busy. Please try again in a few moments.');
        } else if (error.message.includes('insufficient_quota')) {
            throw new Error('OpenAI service quota exceeded. Please contact support.');
        } else if (error.message.includes('invalid_api_key')) {
            throw new Error('OpenAI service configuration error. Please contact support.');
        } else {
            throw new Error(`${operationName} failed: ${error.message}`);
        }
    }
}

async function createAssistant() {
    try {
        const instructions = "You are a professional career expert tasked with analyzing resumes to identify areas for improvement and generating enhanced versions. The assistant should be capable of thoroughly examining each resume, highlighting any weaknesses or inconsistencies, and providing constructive feedback and suggestions for enhancement. Additionally, it should possess the capability to generate polished versions of the resumes, improving their overall effectiveness and presentation to increase the likelihood of securing job opportunities for the candidates."
        const name = "Career Genie"
        const model = "gpt-3.5-turbo"

        const response = await openai.beta.assistants.create({
            name,
            instructions,
            model
        });
        return response;
    } catch (error) {
        console.error('Error creating AI assistant:', error);
        throw error;
    }
}



async function createMessage(req, reply) {
    try {

        // const message = await openai.beta.threads.messages.create(req.body.threadId, {
        //     role: 'user',
        //     content: req.body.message
        // });

        // console.log(message);
        // const run = await openai.beta.threads.runs.create(req.body.threadId, {
        //     assistant_id : req.body.assistantId,
        //     instructions : req.body.instructions,
        // });


        // const run = await openai.beta.threads.runs.retrieve(req.body.threadId, "run_ddp23mVwTGj4WkYpxz6vRXNO");

        // console.log(run);
        const messages = await openai.beta.threads.messages.list(req.body.threadId);
        console.log(messages);
        messages.body.data.forEach(message => {
            console.log(message.content);
        });

    } catch (error) {
        console.error('Error creating message:', error);
        throw error;
    }
}

async function communicateWithAgent(req, reply) {
    try {
        const { message, instructions } = req.body;

        // Create a message in the thread

        const thread = await createThread()

        const msg = {
            "profile": {
                "name": "Kuluru Vineeth",
                "email": "vineeth@startup.com",
                "phone": "123-456-7890",
                "location": "",
                "url": "",
                "summary": "Software engineer obsessed with building exceptional products that people love"
            },
            "educations": [
                {
                    "school": "XYZ University",
                    "degree": "Bachelor of Science in Computer Science - 8.55 GPA",
                    "gpa": "",
                    "date": "Sep 2018 - Aug 2022",
                    "descriptions": [
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences",
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences",
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences"
                    ]
                }
            ],
            "workExperiences": [
                {
                    "company": "ABC Company",
                    "jobTitle": "",
                    "date": "May 2023 - Present",
                    "descriptions": [
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences",
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences",
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences"
                    ]
                },
                {
                    "company": "DEF Organization",
                    "jobTitle": "",
                    "date": "May 2022 - May 2023",
                    "descriptions": [
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences",
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences"
                    ]
                },
                {
                    "company": "XYZ Company",
                    "jobTitle": "",
                    "date": "May 2021 - May 2022",
                    "descriptions": [
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences",
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences"
                    ]
                }
            ],
            "projects": [
                {
                    "project": "Project1",
                    "date": "Fall 2021",
                    "descriptions": []
                },
                {
                    "project": "",
                    "date": "",
                    "descriptions": [
                        "Contributed and Collaborated with cross functional teams to build the scalable product consumned by larger audiences"
                    ]
                }
            ],
            "skills": {
                "featuredSkills": [
                    {
                        "skill": "Python",
                        "rating": 4
                    },
                    {
                        "skill": "TypeScript",
                        "rating": 4
                    },
                    {
                        "skill": "React",
                        "rating": 4
                    },
                    {
                        "skill": "",
                        "rating": 4
                    },
                    {
                        "skill": "",
                        "rating": 4
                    },
                    {
                        "skill": "",
                        "rating": 4
                    }
                ],
                "descriptions": [
                    "Tech: React Hooks, GraphQL, Node.js, SQL, Postgres, NoSql, Redis, REST API, Git",
                    "Soft: Teamwork, Creative Problem Solving, Communication, Learning Mindset, Agile"
                ]
            },
            "custom": {
                "descriptions": []
            }
        }

        const msg2 = JSON.stringify(msg);

        const createMessageResponse = await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: msg2
        });

        // Start processing the run
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantId,
            instructions: instructions
        });

        // Check status and generate the response

        // Get the JSON response and send it
        const response = await checkStatusAndGenerateResponse(thread.id, run.id);
        reply.send(response); // Sending a genuine JSON object

    } catch (error) {
        console.error('Error analysing resume:', error);
        reply.status(500).send({ error: 'Failed to analyze resume', details: error.toString() });
    }
}

async function createThread() {
    try {
        const response = await openai.beta.threads.create();
        return response;
    } catch (error) {
        console.error('Error creating thread:', error);
        throw error;
    }
}

async function aiAgent(req, reply) {
    try {
        const { resumeText } = req.body;
        console.log(resumeText);
        // const user = req.user;

        // const userthread = user.threadId;

        // if(!userthread){

        //     const thread = await createThread();
        //     const threadId = thread.id;
        //     await User.findOneAndUpdate({ _id: user._id }, { $set: { threadId: threadId } });
        // }
        // else{
        //     const threadId = userthread;
        // }

        const thread = await createThread();
        const threadId = thread.id;

        // console.log(req.file.path);
        // const resume = await openai.files.create({
        //     file: fs.createReadStream(req.file.path),
        //     purpose: "assistants",
        // });

        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: `${resumeText}` + `You need to analyse the resume (provided in text) and understand  and provide feedback on the resume what can be added and how can be improved and what is missing.and send back the the feedback to improve the resume as a json object and also provide me the resume score out of 10`,
            // attachments: [{
            //     file_id: resume.id,
            //     tools: [{ type: 'code_interpreter' }]
            // }]
        });


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
        });


        const response = await checkStatusAndGenerateResponse(threadId, run.id);

        reply.send(response);

    }
    catch (error) {
        reply.status(500).send(error);
    }
}

async function analyzeResume(req, reply) {
    try {

        // const user = req.user;

        // const userthread = user.threadId;

        // if(!userthread){

        //     const thread = await createThread();
        //     const threadId = thread.id;
        //     await User.findOneAndUpdate({ _id: user._id }, { $set: { threadId: threadId } });
        // }
        // else{
        //     const threadId = userthread;
        // }

        const thread = await createThread();
        const threadId = thread.id;

        // const resume = await openai.files.create({
        //     file: fs.createReadStream(req.file.path),
        //     purpose: "assistants",
        // });

        const data = {
            personalInfo: {
                firstName: '',
                lastName: "",
                jobTitle: '',
                email: '',
                phone: '',
                City: '',
                Country: ""
            },
            profile: {
                label: "Profile",
                description: "",
                isEditing: false
            },
            education: {
                label: "Education",
                isEditing: false,
                sections: [{
                    institute: "XYZ",
                    degree: '',
                    startDate: "",
                    endDate: '',
                    city: '',
                    description: ""
                }
                ]
            },
            experience: {
                label: "Experience",
                isEditing: false,
                sections: [{
                    jobTitle: "XYZ",
                    Employer: '',
                    startDate: '',
                    endDate: '',
                    city: '',
                    description: ''
                },
                ]
            }
        }

        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: `You need to analyse the resume(From the attached pdf with message) and understand and provide feedback on the resume what can be added and how can be improved and what is missing.`,
            // attachments: [{
            //     file_id: resume.id,
            //     tools: [{ type: 'code_interpreter' }]
            // }]
        });


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: "asst_4nff27JgCzKYTEFUFBOjcghp",
        });


        const response = await checkStatusAndGenerateResponse(threadId, run.id);
        reply.send(response);

    }
    catch (error) {
        reply.status(500).send(error);
    }
}

async function analyseResume(req, reply) {
    try {
        const user = req.user;

        const userthread = user?.threadId;
        if (!userthread) {

            const thread = await createThread();
            const threadId = thread.id;
            await User.findOneAndUpdate({ _id: user._id }, { $set: { threadId: threadId } });
        }
        else {
            const threadId = userthread;
        }

        const resume = await openai.files.create({
            file: fs.createReadStream(req.file.path),
            purpose: "assistants",
        });

        const data = {
            personalInfo: {
                firstName: '',
                lastName: "",
                jobTitle: '',
                email: '',
                phone: '',
                City: '',
                Country: ""
            },
            profile: {
                label: "Profile",
                description: "",
                isEditing: false
            },
            education: {
                label: "Education",
                isEditing: false,
                sections: [{
                    institute: "XYZ",
                    degree: '',
                    startDate: "",
                    endDate: '',
                    city: '',
                    description: ""
                }
                ]
            },
            experience: {
                label: "Experience",
                isEditing: false,
                sections: [{
                    jobTitle: "XYZ",
                    Employer: '',
                    startDate: '',
                    endDate: '',
                    city: '',
                    description: ''
                },
                ]
            }
        }

        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: `1.Analyse the resume(From the pdf) and provide a score out of 10:  You need to analyse the resume and see what data is mising in it as per the industry standard and after checking that you can rate that resume out of 10.  In response you should only reply with score nothing else  example : score:score according to assitant. 2. You need to analyse the resume(From the pdf) and understand and provide feedback on the resume what can be added and how can be improved and what is missing. 3.Analyse the resume(From the pdf) and provide a better resume : You need to analyse the gaps in resume and make a better version of it and provide it in json format example: ${JSON.stringify(data)}`,
            attachments: [{
                file_id: resume.id,
                tools: [{ type: 'code_interpreter' }]
            }]
        });


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
        });


        const response = await checkStatusAndGenerateResponse(threadId, run.id);
        const removepdf = await fs.unlinkSync(req.file.path);
        reply.send(response);

    }
    catch (error) {
        reply.status(500).send(error);
    }
}

async function atsCheck(req, reply) {
    const userId = req.user._id;
    try {
        let user = await User.findById(userId);

        if (!user) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            });
        }

        // Check and reset expired credits before proceeding
        user = await checkAndResetExpiredCredits(user);

        if (user.subscription.analyserTokens.credits <= 0) {
            return reply.code(403).send({ status: 'FAILURE', message: 'You have no analyser tokens' });
        }


        const thread = await createThread();
        const threadId = thread.id;

        const { message } = await req.body;

        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message
        });


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: "asst_4nff27JgCzKYTEFUFBOjcghp",
        });

        const response = await handleOpenAIOperation(
            () => checkStatusAndGenerateResponse(threadId, run.id, TIMEOUT_CONFIG.ANALYSIS),
            'resume analysis',
            TIMEOUT_CONFIG.ANALYSIS
        );
        const feedback = safeParseOpenAIResponse(response)
        const newAnalyserFeedback = new Analysis({ userId, ...feedback, resumeContent: message })
        await newAnalyserFeedback.save();
        user.subscription.analyserTokens.credits -= 1
        await user.save();
        reply.status(201).send({
            status: "SUCCESS",
            message: "Analysis completed successfully",
            analysisId: newAnalyserFeedback._id
        });
    }
    catch (error) {
        console.log("Error analysing resume", error)
        reply.status(500).send(error);
    }
}

async function askBot(req, reply) {
    try {
        // const thread = await createThread();
        const threadId = "thread_RJSXp1st6LrR6D9okApOyS07";
        const { message } = await req.body;
        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message
        });
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: "asst_59D0873JevaZMUSOMPLun1KV",
        });
        const response = await checkStatusAndGenerateResponse(threadId, run.id);
        reply.send(response);

    }
    catch (error) {
        reply.status(500).send(error);
    }
}

async function generateBetterResume(req, reply) {
    try {

        const thread = await createThread();
        const threadId = thread.id;

        const { message } = await req.body;

        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message
        });


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: "asst_cgWXfKTsqbR4jrujm9XOpzVO",
        });


        const response = await checkStatusAndGenerateResponse(threadId, run.id);

        reply.send(response);



    } catch (error) {
        reply.status(500).send(error);
    }
}

async function generateResumeOnFeedback(req, reply) {
    const userId = req.user._id;
    let { analysisId, type, message } = await req.body;

    console.log(`Starting generateResumeOnFeedback for user ${userId}, type: ${type}`);

    try {
        let user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            });
        }

        if (analysisId) {
            const analysis = await Analysis.findById(analysisId);
            if (!analysis) {
                return reply.code(404).send({
                    status: "FAILURE",
                    error: "Analysis not found"
                });
            }
            message = analysis?.resumeContent;
        }

        // Check and reset expired credits before proceeding
        user = await checkAndResetExpiredCredits(user);

        if (!type) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Type of resume not provided"
            });
        }

        if (type === 'JobCV' && user.subscription.JobCVTokens.credits <= 0) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "Insufficient JobCV tokens"
            });
        }

        if (type === 'optimizer' && user.subscription.optimizerTokens.credits <= 0) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "Insufficient optimizer tokens"
            });
        }

        // Try OpenAI with timeout and fallback
        let resumeData = null;
        let isFallback = false;

        try {
            console.log("Attempting OpenAI call...");
            const openaiResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional resume generator. Create a JSON response with this exact structure: {\"basics\": {\"name\": \"John Doe\", \"email\": \"john@email.com\", \"phone\": \"+1234567890\", \"location\": \"City, Country\", \"website\": \"https://website.com\", \"summary\": \"Professional summary here\"}, \"sections\": {\"experience\": [{\"company\": \"Company Name\", \"position\": \"Job Title\", \"startDate\": \"2020\", \"endDate\": \"2023\", \"summary\": \"Job description\"}], \"education\": [{\"institution\": \"University Name\", \"area\": \"Degree Field\", \"studyType\": \"Bachelor's\", \"startDate\": \"2016\", \"endDate\": \"2020\"}], \"skills\": [{\"name\": \"Skill Name\", \"level\": \"Expert\"}], \"projects\": [{\"name\": \"Project Name\", \"description\": \"Project description\", \"url\": \"https://project.com\"}]}}. Return ONLY valid JSON, no additional text."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            });

            // Get the response content
            const responseContent = openaiResponse.choices[0].message.content;
            console.log("OpenAI response content:", responseContent.substring(0, 200) + "...");

            // Try to parse the response
            try {
                // Clean the response - remove any markdown formatting
                let cleanResponse = responseContent.trim();
                if (cleanResponse.startsWith('```json')) {
                    cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                }
                if (cleanResponse.startsWith('```')) {
                    cleanResponse = cleanResponse.replace(/```\n?/g, '').replace(/```\n?/g, '');
                }

                resumeData = JSON.parse(cleanResponse);
                console.log("OpenAI response parsed successfully");
            } catch (parseError) {
                console.log("Failed to parse OpenAI response:", parseError.message);
                console.log("Raw response:", responseContent);
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.log("OpenAI failed, using fallback:", error.message);
            isFallback = true;
        }

        // Create resume
        const count = await Resume.countDocuments({ userId });
        const username = req.user.fullname.split(" ")[0];
        const title = `${username}_resume_${Date.now()}`;
        const resume = new Resume({ userId, title });

        if (resumeData && !isFallback) {
            // Use OpenAI data
            if (resumeData.basics) {
                // Map basics data
                if (resumeData.basics.name) resume.data.basics.name = resumeData.basics.name;
                if (resumeData.basics.email) resume.data.basics.email = resumeData.basics.email;
                if (resumeData.basics.phone) resume.data.basics.phone = resumeData.basics.phone;
                if (resumeData.basics.location) resume.data.basics.location = resumeData.basics.location;
                if (resumeData.basics.website) resume.data.basics.website = resumeData.basics.website;
                if (resumeData.basics.summary) resume.data.sections.summary.content = resumeData.basics.summary;
            }

            if (resumeData.sections) {
                // Map sections data
                if (resumeData.sections.experience && Array.isArray(resumeData.sections.experience)) {
                    resume.data.sections.experience.items = resumeData.sections.experience;
                }
                if (resumeData.sections.education && Array.isArray(resumeData.sections.education)) {
                    resume.data.sections.education.items = resumeData.sections.education;
                }
                if (resumeData.sections.skills && Array.isArray(resumeData.sections.skills)) {
                    resume.data.sections.skills.items = resumeData.sections.skills;
                }
                if (resumeData.sections.projects && Array.isArray(resumeData.sections.projects)) {
                    resume.data.sections.projects.items = resumeData.sections.projects;
                }
                if (resumeData.sections.awards && Array.isArray(resumeData.sections.awards)) {
                    resume.data.sections.awards.items = resumeData.sections.awards;
                }
                if (resumeData.sections.certificates && Array.isArray(resumeData.sections.certificates)) {
                    resume.data.sections.certificates.items = resumeData.sections.certificates;
                }
                if (resumeData.sections.language && Array.isArray(resumeData.sections.language)) {
                    resume.data.sections.language.items = resumeData.sections.language;
                }
                if (resumeData.sections.hobbies && Array.isArray(resumeData.sections.hobbies)) {
                    resume.data.sections.hobbies.items = resumeData.sections.hobbies;
                }
                if (resumeData.sections.reference && Array.isArray(resumeData.sections.reference)) {
                    resume.data.sections.reference.items = resumeData.sections.reference;
                }
                if (resumeData.sections.profiles && Array.isArray(resumeData.sections.profiles)) {
                    resume.data.sections.profiles.items = resumeData.sections.profiles;
                }
            }
        } else {
            // Use fallback data - create a more complete basic resume
            resume.data.basics.name = username;
            resume.data.basics.summary = "Professional resume created with AI assistance. Please update with your specific details.";
            resume.data.basics.email = "";
            resume.data.basics.phone = "";
            resume.data.basics.location = "";
            resume.data.basics.website = "";

            // Add some basic sections with placeholder data
            resume.data.sections.experience.items = [{
                company: "Your Company Name",
                position: "Your Position",
                startDate: "2020",
                endDate: "Present",
                summary: "Describe your role and achievements here"
            }];

            resume.data.sections.education.items = [{
                institution: "Your University",
                area: "Your Degree",
                studyType: "Bachelor's",
                startDate: "2016",
                endDate: "2020"
            }];

            resume.data.sections.skills.items = [{
                name: "Your Skills",
                level: "Expert"
            }];

            resume.data.sections.summary.content = "Professional resume created with AI assistance. Please update with your specific details.";
        }

        await resume.save();

        // Deduct credits
        if (type === 'JobCV') {
            user.subscription.JobCVTokens.credits -= 1;
        } else if (type === 'optimizer') {
            user.subscription.optimizerTokens.credits -= 1;
        }

        await user.save();
        const userdata = await user.toSafeObject();

        reply.code(201).send({
            status: "SUCCESS",
            message: isFallback ? "Resume created with fallback method" : "Resume created successfully",
            data: resume,
            userdata,
            fallback: isFallback
        });

    } catch (error) {
        console.log("Error in generateResumeOnFeedback:", error);

        reply.status(500).send({
            error: "Error generating feedback",
            details: error.message || "An unexpected error occurred",
            statusCode: 500
        });
    }
}

async function generateFreshResume(req, reply) {
    const userId = req.user._id
    let { message, type } = await req.body;
    try {
        let user = await User.findById(userId);

        if (!user) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            });
        }

        // Check and reset expired credits before proceeding
        user = await checkAndResetExpiredCredits(user);

        if (!type) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Type of resume not provided"
            });
        }

        if (type === 'JobCV' && user.subscription.JobCVTokens.credits <= 0) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "Insufficient JobCV tokens"
            });
        }

        // Check if user has enough optimizer tokens
        if (type === 'optimizer' && user.subscription.optimizerTokens.credits <= 0) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "Insufficient optimizer tokens"
            });
        }
        const thread = await createThread();
        const threadId = thread.id;


        // message = message + "applying for job of software developer"
        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message
        });


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id:
                "asst_cgWXfKTsqbR4jrujm9XOpzVO"
            // "asst_4NjhiyQFZIrgiOc4u49M0Ocq"

        });


        const response = await handleOpenAIOperation(
            () => checkStatusAndGenerateResponse(threadId, run.id, TIMEOUT_CONFIG.RESUME_GENERATION),
            'resume generation',
            TIMEOUT_CONFIG.RESUME_GENERATION
        );
        let value = safeParseOpenAIResponse(response)
        if (value) {
            const count = await Resume.countDocuments({ userId });
            const username = req.user.fullname.split(" ")[0];
            const title = `${username}_resume` + uuidv4();
            const resume = await new Resume({ userId, title })
            if (value.basics) {
                Object.assign(resume.data.basics, value.basics);
            }

            if (value.sections) {
                Object.keys(value.sections).forEach((section) => {
                    if (resume.data.sections[section]) {
                        Object.assign(resume.data.sections[section], value.sections[section]);
                    } else {
                        resume.data.sections[section] = value.sections[section];
                    }
                });
            }
            await resume.save();

            if (type === 'JobCV') {
                user.subscription.JobCVTokens.credits -= 1;
            } else if (type === 'optimizer') {
                user.subscription.optimizerTokens.credits -= 1;
            }

            await user.save();
            const userdata = await user.toSafeObject()

            reply.code(201).send({
                status: "SUCCESS",
                message: "Resume created successfully",
                data: resume,
                userdata
            })
        } else {
            reply.code(400).send({
                status: "FAILURE",
                message: "Failed to parse OpenAI response"
            })
        }
    } catch (error) {
        console.log("Error in generateFreshResume:", error);
        reply.status(500).send({
            error: "Backend server error",
            details: error.message || "An unexpected error occurred",
            statusCode: 500
        });
    }
}

async function generateCounsellingTest(req, reply) {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            });
        }

        if (user.subscription.status !== 'Completed') {
            return reply.status(403).send({ error: "Subscription is not active" });
        }


        const reqdata = await req.body;
        const thread = await createThread();
        const threadId = thread.id;

        const reqdataString = JSON.stringify(reqdata);

        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: reqdataString
        });

        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: "asst_4NjhiyQFZIrgiOc4u49M0Ocq"
        });


        const response = await checkStatusAndGenerateResponse(threadId, run.id, TIMEOUT_CONFIG.COUNSELLING);
        const test = safeParseOpenAIResponse(response);

        const mapAnswersToQuestions = (testSections) => {
            return Object.keys(testSections).reduce((acc, section) => {
                acc[section] = testSections[section].map((question, index) => ({
                    ...question,
                    answer: ""
                }));
                return acc;
            }, {});
        };
        const testWithAnswers = mapAnswersToQuestions(test);

        reply.status(201).send(testWithAnswers);
    } catch (error) {
        reply.status(500).send(error);
    }
}




async function createThread() {
    try {
        const response = await openai.beta.threads.create();
        return response;
    } catch (error) {
        console.error('Error creating thread:', error);
        throw error;
    }
}

async function generateCareerAdvice(req, reply) {
    const userId = req.user._id;
    try {
        let user = await User.findById(userId);

        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        // Check and reset expired credits before proceeding
        user = await checkAndResetExpiredCredits(user);

        if (user.subscription.status !== 'Completed') {
            return reply.status(403).send({ error: "Subscription is not active" });
        }

        if (user.subscription.careerCounsellingTokens.credits <= 0) {
            return reply.status(400).send({ error: "Insufficient career counselling tokens" });
        }

        const thread = await createThread();
        const threadId = thread.id;
        const message = await req.body;
        const stringMessage = JSON.stringify(message);
        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: stringMessage
        });

        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: "asst_4NjhiyQFZIrgiOc4u49M0Ocq",
        });

        const response = await handleOpenAIOperation(
            () => checkStatusAndGenerateResponse(threadId, run.id, TIMEOUT_CONFIG.COUNSELLING),
            'career advice generation',
            TIMEOUT_CONFIG.COUNSELLING
        );

        const personalisedSummary = safeParseOpenAIResponse(response)
        const userSummary = new Summary({ userId, ...personalisedSummary })

        await userSummary.save();

        await User.findByIdAndUpdate(userId, {
            $inc: { 'subscription.careerCounsellingTokens.credits': -1 }
        });
        reply.send(response);
    } catch (error) {

        reply.status(500).send(error);
    }

}

module.exports = { createAssistant, createMessage, createThread, communicateWithAgent, aiAgent, atsCheck, askBot, analyseResume, analyzeResume, generateBetterResume, generateResumeOnFeedback, generateCounsellingTest, generateCareerAdvice, generateFreshResume };
