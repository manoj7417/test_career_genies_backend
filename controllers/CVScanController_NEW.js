const OpenAI = require('openai');
const path = require('path');
const { validateResumeContent } = require('../utils/resumeValidator');
const { User } = require('../models/userModel');
const { checkAndResetExpiredCredits } = require('../utils/creditUtils');

require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Import pdf-parse v2 - exports PDFParse class
const { PDFParse } = require('pdf-parse');
console.log('pdf-parse loaded successfully, PDFParse type:', typeof PDFParse);

const scanCV = async (request, reply) => {
    console.log("=== CV Scan API Called ===");

    try {
        // Get user from JWT token (set by verifyJWT middleware)
        const userId = request.user._id;

        // Fetch user from database
        let user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({
                status: "FAILURE",
                error: "User not found"
            });
        }

        // Check and reset expired credits before proceeding
        user = await checkAndResetExpiredCredits(user);

        // Check if user has CV scan tokens
        if (!user.subscription.cvScanTokens || user.subscription.cvScanTokens.credits <= 0) {
            return reply.code(403).send({
                status: "FAILURE",
                error: "You have no CV scan tokens. Please purchase credits to use this feature."
            });
        }

        // Debug environment variables
        console.log("Environment check:", {
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            nodeEnv: process.env.NODE_ENV,
            keyLength: process.env.OPENAI_API_KEY?.length
        });

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
            console.error("OpenAI API key not configured properly");
            return reply.code(500).send({
                status: "FAILURE",
                error: "OpenAI API key not configured. Please add a valid OPENAI_API_KEY to your .env file.",
                debug: {
                    hasKey: !!process.env.OPENAI_API_KEY,
                    isPlaceholder: process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
                }
            });
        }

        console.log("OpenAI API key is configured, length:", process.env.OPENAI_API_KEY?.length);

        // Check if request is multipart
        if (!request.isMultipart()) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Invalid content type. Expected multipart/form-data."
            });
        }

        // Process multipart form data
        const parts = request.parts();
        let file = null;
        let jobRole = null;
        let jobDescription = null;

        for await (const part of parts) {
            if (part.file) {
                // Handle file
                if (part.fieldname === 'resume') {
                    const buffer = await part.toBuffer();
                    file = {
                        filename: part.filename,
                        mimetype: part.mimetype,
                        buffer: buffer,
                        size: buffer.length
                    };
                }
            } else {
                // Handle form fields
                if (part.fieldname === 'jobRole') {
                    jobRole = part.value;
                } else if (part.fieldname === 'jobDescription') {
                    jobDescription = part.value;
                }
            }
        }

        console.log("Form data received:", {
            hasFile: !!file,
            fileName: file?.filename,
            fileType: file?.mimetype,
            fileSize: file?.size,
            hasJobRole: !!jobRole,
            hasJobDescription: !!jobDescription
        });

        // Validate required fields
        if (!file || !jobRole || !jobDescription) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Missing required fields. Please provide resume file, job role, and job description."
            });
        }

        // Validate file type
        if (file.mimetype !== "application/pdf" && !file.filename.toLowerCase().endsWith('.pdf')) {
            console.log("File type validation failed:", {
                type: file.mimetype,
                name: file.filename
            });
            return reply.code(400).send({
                status: "FAILURE",
                error: "Invalid file type. Please upload a PDF file."
            });
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "File too large. Please upload a file smaller than 10MB."
            });
        }

        // Extract text from PDF using pdf-parse v2
        let resumeText;
        console.log("Parsing PDF using pdf-parse v2...");

        try {
            // Create parser instance with data parameter (not buffer)
            const parser = new PDFParse({ data: file.buffer });
            
            // Extract text using getText method
            const result = await parser.getText();
            
            // Clean up parser
            await parser.destroy();
            
            resumeText = (result.text || '').trim();

            console.log("PDF parsed successfully:", {
                textLength: resumeText.length,
                pages: result.pages?.length || 'unknown'
            });

            if (!resumeText || resumeText.length < 50) {
                console.error("Insufficient text extracted from PDF:", {
                    textLength: resumeText.length,
                    preview: resumeText.substring(0, 100)
                });
                return reply.code(400).send({
                    status: "FAILURE",
                    error: "Unable to extract sufficient text from the PDF. The PDF may be image-based or corrupted. Please ensure your PDF contains selectable text."
                });
            }

        } catch (pdfError) {
            console.error("PDF parsing error:", {
                name: pdfError.name,
                message: pdfError.message,
                stack: pdfError.stack
            });
            return reply.code(400).send({
                status: "FAILURE",
                error: "Failed to parse PDF file. Please ensure it's a valid PDF with selectable text (not an image-based PDF).",
                details: pdfError.message
            });
        }

        // Validate if the content is actually a resume/CV
        console.log("Validating resume content...");
        const validation = validateResumeContent(resumeText);

        if (!validation.isValid || validation.confidence < 60) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Please provide a valid PDF file containing resume or CV content.",
                validationDetails: validation
            });
        }

        console.log(`Resume validation passed. Confidence: ${validation.confidence}%`);

        // Truncate text for API efficiency
        const maxResumeLength = 4000;
        const maxJDLength = 1500;
        const truncatedResume = resumeText.length > maxResumeLength 
            ? resumeText.substring(0, maxResumeLength) + "\n...[truncated for length]"
            : resumeText;
        const truncatedJD = jobDescription.length > maxJDLength 
            ? jobDescription.substring(0, maxJDLength) + "\n...[truncated for length]"
            : jobDescription;

        // Simplified prompt focusing on actual scoring
        const prompt = `Analyze this resume for the job role and provide realistic ATS scores.

RESUME:
${truncatedResume}

JOB ROLE: ${jobRole}

JOB DESCRIPTION:
${truncatedJD}

IMPORTANT INSTRUCTIONS:
1. Provide REALISTIC scores between 20-100 (avoid 0 scores)
2. Match scoring: Same role (75-90), Related role (60-80), Different field (25-50)
3. Analyze actual skills, experience, and keywords present
4. Return ONLY valid JSON with this EXACT structure (no extra text):

{
  "candidateName": "extracted from resume",
  "overallScore": 75,
  "parseRate": 85,
  "atsCompatibility": {
    "score": 80,
    "rating": "Good",
    "description": "Brief ATS assessment"
  },
  "scoreBreakdown": {
    "keywordScore": 70,
    "formatScore": 85
  },
  "keywordAnalysis": {
    "exactMatches": [{"keyword": "JavaScript", "count": 5}],
    "synonyms": [],
    "relatedTerms": [],
    "contextRelevance": [],
    "keywordDensity": {"current": "2.5%", "recommended": "3%", "status": "OPTIMAL"}
  },
  "industryAlignment": {
    "score": 75,
    "matchedTerms": ["skill1", "skill2"],
    "missingTerms": ["skill3", "skill4"]
  },
  "skillAlignment": {
    "gapScore": 70,
    "rating": "Good",
    "description": "Brief skill assessment",
    "missingSkills": [{"skill": "Docker", "priority": "High", "category": "Missing Critical Skills"}],
    "niceToHaveSkills": []
  },
  "recruiterTips": {
    "jobLevelMatch": {"status": "good", "message": "Experience level matches"},
    "measurableResults": {"status": "warning", "message": "Add more metrics"},
    "resumeTone": {"status": "good", "message": "Professional tone"},
    "webPresence": {"status": "warning", "message": "Add LinkedIn"},
    "wordCount": {"status": "good", "message": "Appropriate length"}
  },
  "recommendations": [
    "Add quantifiable achievements",
    "Include more relevant keywords"
  ],
  "videoSuggestions": {
    "criticalSkills": [],
    "moderateSkills": [],
    "enhancementSkills": []
  },
  "extractedData": {
    "experience": "Brief summary",
    "education": "Brief summary",
    "skills": "Brief summary",
    "contact": "Brief summary"
  }
}`;

        // Call OpenAI API with simplified approach
        console.log("Calling OpenAI API with gpt-4-turbo...");
        let completion;

        try {
            completion = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an ATS expert. Always provide realistic non-zero scores (minimum 20) unless content is completely unrelated. Analyze the actual resume content thoroughly and return ONLY valid JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 2500,
                response_format: { type: "json_object" }
            });
        } catch (openaiError) {
            console.error("OpenAI API error:", openaiError);

            if (openaiError.status === 401) {
                return reply.code(401).send({
                    status: "FAILURE",
                    error: "Invalid OpenAI API key.",
                    errorType: "invalid_key"
                });
            } else if (openaiError.status === 429) {
                return reply.code(429).send({
                    status: "FAILURE",
                    error: "OpenAI API quota exceeded.",
                    errorType: "quota_exceeded"
                });
            } else {
                return reply.code(500).send({
                    status: "FAILURE",
                    error: `OpenAI API error: ${openaiError.message}`,
                    errorType: "api_error"
                });
            }
        }

        // Parse the response
        let analysisResult;
        try {
            const responseText = completion.choices[0].message.content.trim();
            console.log("Analysis completed");
            console.log("Response length:", responseText.length);

            analysisResult = JSON.parse(responseText);
            
            // Log the scores
            console.log("Parsed scores:", {
                overallScore: analysisResult.overallScore,
                parseRate: analysisResult.parseRate,
                atsScore: analysisResult.atsCompatibility?.score,
                keywordScore: analysisResult.scoreBreakdown?.keywordScore
            });

            // Validate scores are not 0 - apply minimum if needed
            if (analysisResult.overallScore === 0) analysisResult.overallScore = 25;
            if (analysisResult.parseRate === 0) analysisResult.parseRate = 50;
            if (analysisResult.atsCompatibility?.score === 0) analysisResult.atsCompatibility.score = 40;
            if (analysisResult.scoreBreakdown?.keywordScore === 0) analysisResult.scoreBreakdown.keywordScore = 30;
            if (analysisResult.scoreBreakdown?.formatScore === 0) analysisResult.scoreBreakdown.formatScore = 60;

        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            console.error("Raw response:", completion.choices[0].message.content);
            return reply.code(500).send({
                status: "FAILURE",
                error: "Failed to parse AI response. Please try again."
            });
        }

        // Add job role to the result
        analysisResult.jobRole = jobRole;

        // Deduct credit after successful processing
        user.subscription.cvScanTokens.credits -= 1;
        await user.save();
        console.log(`CV scan credit deducted. Remaining credits: ${user.subscription.cvScanTokens.credits}`);

        return reply.code(200).send({
            status: "SUCCESS",
            data: analysisResult
        });

    } catch (error) {
        console.error("=== CRITICAL ERROR ===");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        return reply.code(500).send({
            status: "FAILURE",
            error: `Server error: ${error.message}`,
            errorDetails: {
                name: error.name,
                message: error.message
            }
        });
    }
};

module.exports = { scanCV };

