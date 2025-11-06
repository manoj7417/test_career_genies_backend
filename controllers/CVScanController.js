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

        // Create comprehensive prompt for OpenAI (full format matching original)
        const prompt = `Analyze the following resume against the job requirements and provide a comprehensive ATS-style assessment.

RESUME TEXT:
${resumeText}

JOB ROLE: ${jobRole}

JOB DESCRIPTION:
${jobDescription}

SCORING INSTRUCTIONS:
1. Read the resume and identify the candidate's primary role/background
2. Compare it with the target job role
3. Apply this scoring logic:
   - SAME ROLE: 80-90 (e.g., Sales Analyst → Sales Manager)
   - RELATED ROLE: 65-80 (e.g., Full Stack → Frontend, Business Analyst → Data Analyst)
   - DIFFERENT FIELD: 25-45 (e.g., Sales → Developer, Marketing → Engineer)

IMPORTANT: Be strict about cross-field applications. Provide realistic non-zero scores based on actual content.

Please provide a JSON response with the following comprehensive structure:

{
  "candidateName": "Extracted name from resume",
  "overallScore": number (0-100),
  "parseRate": number (0-100),
  "atsCompatibility": {
    "score": number (0-100),
    "rating": "Excellent/Good/Fair/Poor",
    "description": "Brief description of ATS compatibility"
  },
  "scoreBreakdown": {
    "keywordScore": number (0-100),
    "formatScore": number (0-100)
  },
  "keywordAnalysis": {
    "exactMatches": [{"keyword": "string", "count": number, "weight": "100%"}],
    "synonyms": [{"keyword": "string", "synonym": "string", "weight": "80%"}],
    "relatedTerms": [{"term": "string", "relevance": "high/medium/low", "weight": "60%"}],
    "contextRelevance": [{"context": "string", "relevance": number}],
    "keywordDensity": {"current": "2.5%", "recommended": "2%", "status": "OPTIMAL/HIGH/LOW"}
  },
  "industryAlignment": {
    "score": number (0-100),
    "matchedTerms": ["array of matched industry terms"],
    "missingTerms": ["array of missing important terms"]
  },
  "skillAlignment": {
    "gapScore": number (0-100),
    "rating": "Excellent/Good/Fair/Poor",
    "description": "Brief skill alignment description",
    "missingSkills": [{"skill": "string", "priority": "Medium/High", "category": "Missing Moderate Skills"}],
    "niceToHaveSkills": [{"skill": "string", "priority": "Low", "category": "Nice-to-Have Skills"}]
  },
  "recruiterTips": {
    "jobLevelMatch": {"status": "good/warning/error", "message": "Assessment of experience level match"},
    "measurableResults": {"status": "good/warning/error", "message": "Assessment of quantifiable achievements"},
    "resumeTone": {"status": "good/warning/error", "message": "Assessment of professional tone"},
    "webPresence": {"status": "good/warning/error", "message": "Assessment of online presence"},
    "wordCount": {"status": "good/warning/error", "message": "Assessment of resume length"}
  },
  "recommendations": ["Specific actionable recommendations for improvement"],
  "videoSuggestions": {
    "criticalSkills": [{
      "skill": "string",
      "priority": "High",
      "videos": [{
        "title": "Video title",
        "description": "Brief description of what the video covers",
        "duration": "2h 30m",
        "level": "Beginner/Intermediate/Advanced",
        "platform": "YouTube/Coursera/Udemy",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "rating": "4.5/5"
      }]
    }],
    "moderateSkills": [{
      "skill": "string",
      "priority": "Medium",
      "videos": [{
        "title": "Video title",
        "description": "Brief description",
        "duration": "1h 45m",
        "level": "Intermediate",
        "platform": "YouTube",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "rating": "4.3/5"
      }]
    }],
    "enhancementSkills": [{
      "skill": "string",
      "priority": "Low",
      "videos": [{
        "title": "Video title",
        "description": "Brief description",
        "duration": "45m",
        "level": "Beginner",
        "platform": "YouTube",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "rating": "4.1/5"
      }]
    }]
  },
  "extractedData": {
    "experience": "Summary of work experience",
    "education": "Educational background",
    "skills": "Technical and soft skills",
    "contact": "Contact information"
  }
}

ANALYSIS REQUIREMENTS:
1. Identify the candidate's primary role/background from their resume
2. Compare it with the target job role
3. Extract exact keywords from job description and match against resume
4. Identify synonyms and related terms
5. Calculate keyword density and recommend optimal levels
6. Assess ATS parsing capability based on formatting
7. Provide industry-specific terminology alignment
8. Analyze skill gaps with priority levels
9. Give recruiter-focused feedback on common hiring criteria
10. Ensure all scores are realistic and based on actual content analysis (avoid 0 scores)
11. Generate specific video learning recommendations for identified skill gaps
12. Suggest popular tutorials for each missing skill
13. Use real YouTube URLs (https://www.youtube.com/watch?v=XXXXX format)

IMPORTANT: Respond ONLY with valid JSON, no additional text or formatting.`;

        // Call OpenAI API
        console.log("Calling OpenAI API with gpt-4-turbo...");
        let completion;

        try {
            completion = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert ATS analyst. Provide realistic scores between 20-100 for all fields (avoid 0 scores). Score based on role match: Same role (80-90), Related role (65-80), Different field (25-45). Analyze the actual resume content and provide meaningful non-zero scores. Always respond with valid JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 4000,
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
            console.log("========================================");
            console.log("RAW OPENAI RESPONSE:");
            console.log(responseText.substring(0, 500)); // First 500 chars
            console.log("========================================");
            console.log("Response length:", responseText.length);

            analysisResult = JSON.parse(responseText);

            // Log EVERYTHING before modification
            console.log("========================================");
            console.log("PARSED RESULT (BEFORE FALLBACK):");
            console.log(JSON.stringify(analysisResult, null, 2).substring(0, 1000));
            console.log("========================================");

            // Log the scores
            console.log("Initial parsed scores:", {
                overallScore: analysisResult.overallScore,
                parseRate: analysisResult.parseRate,
                atsScore: analysisResult.atsCompatibility?.score,
                keywordScore: analysisResult.scoreBreakdown?.keywordScore,
                formatScore: analysisResult.scoreBreakdown?.formatScore
            });

            // Validate scores are not 0 or undefined - apply minimum if needed
            if (!analysisResult.overallScore || analysisResult.overallScore === 0) {
                console.log("⚠️ Fixing overallScore from", analysisResult.overallScore, "to 45");
                analysisResult.overallScore = 45;
            }
            if (!analysisResult.parseRate || analysisResult.parseRate === 0) {
                console.log("⚠️ Fixing parseRate from", analysisResult.parseRate, "to 60");
                analysisResult.parseRate = 60;
            }
            if (!analysisResult.atsCompatibility?.score || analysisResult.atsCompatibility?.score === 0) {
                console.log("⚠️ Fixing atsCompatibility.score from", analysisResult.atsCompatibility?.score, "to 50");
                if (!analysisResult.atsCompatibility) analysisResult.atsCompatibility = {};
                analysisResult.atsCompatibility.score = 50;
            }
            if (!analysisResult.scoreBreakdown?.keywordScore || analysisResult.scoreBreakdown?.keywordScore === 0) {
                console.log("⚠️ Fixing keywordScore from", analysisResult.scoreBreakdown?.keywordScore, "to 40");
                if (!analysisResult.scoreBreakdown) analysisResult.scoreBreakdown = {};
                analysisResult.scoreBreakdown.keywordScore = 40;
            }
            if (!analysisResult.scoreBreakdown?.formatScore || analysisResult.scoreBreakdown?.formatScore === 0) {
                console.log("⚠️ Fixing formatScore from", analysisResult.scoreBreakdown?.formatScore, "to 65");
                if (!analysisResult.scoreBreakdown) analysisResult.scoreBreakdown = {};
                analysisResult.scoreBreakdown.formatScore = 65;
            }

            console.log("Final scores after fallback:", {
                overallScore: analysisResult.overallScore,
                parseRate: analysisResult.parseRate,
                atsScore: analysisResult.atsCompatibility?.score,
                keywordScore: analysisResult.scoreBreakdown?.keywordScore,
                formatScore: analysisResult.scoreBreakdown?.formatScore
            });
            console.log("========================================");

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

        console.log("========================================");
        console.log("FINAL RESPONSE BEING SENT TO FRONTEND:");
        console.log(JSON.stringify({
            overallScore: analysisResult.overallScore,
            parseRate: analysisResult.parseRate,
            atsScore: analysisResult.atsCompatibility?.score,
            keywordScore: analysisResult.scoreBreakdown?.keywordScore,
            formatScore: analysisResult.scoreBreakdown?.formatScore,
            hasVideoSuggestions: !!analysisResult.videoSuggestions,
            hasRecruiterTips: !!analysisResult.recruiterTips
        }, null, 2));
        console.log("========================================");

        // Send response WITHOUT wrapping in extra object (match original Next.js format)
        return reply.code(200).send(analysisResult);

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

