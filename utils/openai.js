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

const openai = new OpenAI(
    {
        apiKey: process.env['OPENAI_API_KEY']
    }
);

const assistantId = process.env['OPENAI_ASSISTANT_ID'];

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
        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');

                // Try to parse the JSON content from the assistant's response
                return response.content;
            } else {
                // Recursive call to check again until completion
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');

                // Try to parse the JSON content from the assistant's response
                return response.content;
            } else {
                // Recursive call to check again until completion
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');

                // Try to parse the JSON content from the assistant's response
                return response.content;
            } else {
                // Recursive call to check again until completion
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');

                // Try to parse the JSON content from the assistant's response
                return response.content;
            } else {
                // Recursive call to check again until completion
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

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
        const user = await User.findById(userId);

        if (!user) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            });
        }


        const currentDate = new Date();

        if (user.subscription.analyserTokens.expiry <= currentDate) {
            return reply.code(403).send({
                status: 'FAILURE',
                message: 'Your analyser tokens have expired'
            });
        }
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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');

                // Try to parse the JSON content from the assistant's response
                return response.content;
            } else {
                // Recursive call to check again until completion
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };
        const response = await checkStatusAndGenerateResponse(threadId, run.id);
        const feedback = JSON.parse(response[0].text.value)
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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');
                return response.content;
            } else {
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');

                // Try to parse the JSON content from the assistant's response
                return response.content;
            } else {
                // Recursive call to check again until completion
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

        const response = await checkStatusAndGenerateResponse(threadId, run.id);

        reply.send(response);



    } catch (error) {
        reply.status(500).send(error);
    }
}

async function generateResumeOnFeeback(req, reply) {
    const userId = req.user._id
    let { analysisId, type, message } = await req.body;
    try {
        const user = await User.findById(userId);
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

        const currentDate = new Date();

        if (type === 'JobCV' && user.subscription.JobCVTokens.expiry < currentDate) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "Service expired , please renue service and try again"
            });
        }

        if (type === 'optimizer' && user.subscription.optimizerTokens.expiry < currentDate) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "Service expired , please renue service and try again"
            });
        }


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

        // messag = message + "applying for job of software developer"
        const createMessage = await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message
        });


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id:
                "asst_cgWXfKTsqbR4jrujm9XOpzVO"
            // "asst_4NjhiyQFZIrgiOc4u49M0Ocq"

        });

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');
                // Try to parse the JSON content from the assistant's response
                return response.content;
            } else {

                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

        const response = await checkStatusAndGenerateResponse(threadId, run.id);
        let value = JSON.parse(response[0]?.text?.value)
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
                message: "Resume created succesfully",
                data: resume,
                userdata
            })
        }
        reply.code(400).send({
            status: "FAILURE",
            message: "Feedback not generated"
        })
    } catch (error) {
        console.log(error)
        reply.status(500).send(error);
    }
}

async function generateFreshResume(req, reply) {
    const userId = req.user._id
    let { message, type } = await req.body;
    try {
        const user = await User.findById(userId);

        if (!user) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            });
        }

        const currentDate = new Date();

        if (!type) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Type of resume not provided"
            });
        }

        if (type === 'JobCV' && user.subscription.JobCVTokens.expiry < currentDate) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "Service expired , please renue service and try again"
            });
        }

        if (type === 'optimizer' && user.subscription.optimizerTokens.expiry < currentDate) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "Service expired , please renue service and try again"
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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');
                return response.content;
            } else {

                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

        const response = await checkStatusAndGenerateResponse(threadId, run.id);
        let value = JSON.parse(response[0]?.text?.value)
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
                message: "Resume created succesfully",
                data: resume,
                userdata
            })
        }
        reply.code(400).send({
            status: "FAILURE",
            message: "Feedback not generated"
        })
    } catch (error) {
        console.log(error)
        reply.status(500).send(error);
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

        if (user.subscription.status !== 'Active') {
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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');
                return response.content;
            } else {
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };

        const response = await checkStatusAndGenerateResponse(threadId, run.id);
        const test = JSON.parse(response[0].text.value);

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
        const user = await User.findById(userId);

        if (!user) {
            return reply.status(404).send({ error: "User not found" });
        }

        if (user.subscription.status !== 'Active') {
            return reply.status(403).send({ error: "Subscription is not active" });
        }

        if (user.subscription.careerCounsellingTokens <= 0) {
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

        const checkStatusAndGenerateResponse = async (threadId, runId) => {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);
            if (run.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                const response = messages.body.data.find(message => message.role === 'assistant');

                // Try to parse the JSON content from the assistant's response
                return response.content;
            } else {
                // Recursive call to check again until completion
                return checkStatusAndGenerateResponse(threadId, runId);
            }
        };
        const response = await checkStatusAndGenerateResponse(threadId, run.id);

        const personalisedSummary = JSON.parse(response[0].text.value)
        const userSummary = new Summary({ userId, ...personalisedSummary })
        await userSummary.save();

        await User.findByIdAndUpdate(userId, {
            $inc: { 'subscription.careerCounsellingTokens': -1 }
        });
        reply.send(response);

    } catch (error) {
        reply.status(500).send(error);
    }

}

module.exports = { createAssistant, createMessage, createThread, communicateWithAgent, aiAgent, atsCheck, askBot, analyseResume, analyzeResume, generateBetterResume, generateResumeOnFeeback, generateCounsellingTest, generateCareerAdvice, generateFreshResume };
