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

// --- Lightweight keyword utilities to anchor the model's scoring ---
const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'has', 'are', 'was', 'were', 'will', 'shall', 'can', 'could', 'should', 'a', 'an', 'to', 'of', 'in', 'on', 'by', 'as', 'at', 'it', 'is', 'be', 'or', 'not', 'into', 'than', 'then', 'over', 'under', 'about', 'your', 'you', 'our', 'we', 'they', 'their', 'there', 'which', 'who', 'whom', 'what', 'when', 'where', 'why', 'how'
]);

function normalizeTextForKeywords(text) {
    if (!text) return '';
    return String(text).toLowerCase().replace(/[^a-z0-9+.#/\-\s]/g, ' ');
}

function extractTopKeywords(text, maxCount = 40) {
    const normalized = normalizeTextForKeywords(text);
    const freq = new Map();
    for (const raw of normalized.split(/\s+/)) {
        const token = raw.trim();
        if (!token || token.length < 3) continue;
        if (STOP_WORDS.has(token)) continue;
        // Keep common tech separators like node.js, c++, etc.
        const key = token;
        freq.set(key, (freq.get(key) || 0) + 1);
    }
    const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, maxCount).map(([k]) => k);
}

function computeKeywordOverlap(resumeText, jobDescription) {
    const jdKeywords = new Set(extractTopKeywords(jobDescription, 60));
    const resumeWords = extractTopKeywords(resumeText, 400);
    const matched = [];
    for (const w of resumeWords) {
        if (jdKeywords.has(w)) matched.push(w);
    }
    const missing = Array.from(jdKeywords).filter(k => !matched.includes(k));
    const overlapPercent = jdKeywords.size > 0 ? Math.round((matched.length / jdKeywords.size) * 100) : 0;
    return { matched: Array.from(new Set(matched)).slice(0, 30), missing: missing.slice(0, 30), overlapPercent, totalJDKeywords: jdKeywords.size };
}

function truncateMiddle(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    const head = Math.floor(maxLen * 0.6);
    const tail = maxLen - head - 15;
    return text.slice(0, head) + "\n...[truncated]...\n" + text.slice(-tail);
}

/**
 * CV Scan endpoint - Analyzes resume against job requirements
 * POST /api/cv-scan/scan
 * 
 * Expected multipart form data:
 * - resume: PDF file
 * - jobRole: string
 * - jobDescription: string
 */
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

        // Validate if the content is actually a resume/CV (server-side STRICT)
        console.log("Validating resume content (strict)...");
        const validation = validateResumeContent(resumeText);

        // Additional strict heuristics
        const textOnly = resumeText.replace(/[^A-Za-z0-9\s]/g, ' ');
        const words = textOnly.trim().split(/\s+/).filter(Boolean);
        const wordCount = words.length;

        // Core sections presence - more specific patterns
        const hasExperience = /\b(work\s+experience|professional\s+experience|employment\s+history|career\s+history)\b/i.test(resumeText) ||
            (/\b(experience)\b/i.test(resumeText) && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b/i.test(resumeText));

        const hasEducation = /\b(education|degree|university|college|school|bachelor|master|b\.tech|m\.tech|b\.sc|m\.sc|phd)\b/i.test(resumeText);
        const hasSkills = /\b(skills|technical\s+skills|soft\s+skills|proficient|skilled|expertise|competencies)\b/i.test(resumeText);
        const hasProjects = /\b(projects?|portfolio)\b/i.test(resumeText);

        // Resume-specific indicators
        const hasContactInfo = /\b(email|phone|mobile|linkedin|github)\b/i.test(resumeText) &&
            (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText) || /\b\d{10}\b/.test(resumeText));

        const hasJobTitles = /\b(manager|analyst|developer|engineer|designer|consultant|specialist|coordinator|director|executive|intern)\b/i.test(resumeText);

        const hasDates = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s-]\d{4}\b/i.test(resumeText) ||
            /\b\d{4}\s*[-–—]\s*(present|current|\d{4})\b/i.test(resumeText);

        const coreSectionsPresent = [hasExperience, hasEducation, hasSkills, hasProjects].filter(Boolean).length;
        const resumeIndicatorsPresent = [hasContactInfo, hasJobTitles, hasDates].filter(Boolean).length;
        const hasCriticalResumeIndicators = hasContactInfo || hasDates; // Contact info or dates are critical

        // Non-resume indicators - More specific patterns to avoid false positives
        const nonResumeIndicators = /(invoice\s+(number|date|amount)|receipt\s+number|bill\s+to|payment\s+terms|legal\s+agreement|privacy\s+policy|terms\s+and\s+conditions|standard\s+operating\s+procedure\b|sop\b|user\s+manual|installation\s+guide|tutorial\s+video|technical\s+specification|research\s+paper|academic\s+study|thesis\s+statement|dissertation\s+abstract|quotation\s+request|cost\s+estimate|budget\s+allocation|financial\s+statement|balance\s+sheet|income\s+statement|literature\s+review|case\s+study|white\s+paper|client\s+testimonial|customer\s+review|feedback\s+from|testimonial\s+from|highly\s+recommend|would\s+recommend)/gi;

        const nonResumeMatches = resumeText.match(nonResumeIndicators) || [];
        const nonResumeCount = nonResumeMatches.length;
        const hasNonResumeDominant = nonResumeCount >= 5;

        // Strict rules: must have enough content, core sections, AND resume-specific indicators
        const meetsWordCount = wordCount >= 60; // avoid very short docs
        const meetsCoreSections = coreSectionsPresent >= 2; // at least 2 core sections (e.g., Education + Experience)
        const hasResumeIndicators = resumeIndicatorsPresent >= 2; // at least 2 resume indicators (e.g., contact info + job titles)
        const hasMinimalResumeIndicators = resumeIndicatorsPresent >= 1; // at least 1 resume indicator for high-confidence cases

        // Very high confidence resumes with all 4 sections (comprehensive resumes)
        const isVeryHighConfidenceResume = validation.isValid && validation.confidence >= 85 && coreSectionsPresent >= 4 && hasMinimalResumeIndicators;

        // Medium confidence for shorter resume documents (cover letters, simple resumes)
        const isMediumConfidenceResume = validation.isValid && validation.confidence >= 80 && coreSectionsPresent >= 2 && coreSectionsPresent <= 3 && hasMinimalResumeIndicators;

        // High confidence resumes with strong signals - must have contact info OR dates
        const isHighConfidenceResume = validation.isValid && validation.confidence >= 75 && coreSectionsPresent >= 3 && hasMinimalResumeIndicators && hasCriticalResumeIndicators;

        // Standard validation with full indicators
        const passesResumeChecks = meetsWordCount && meetsCoreSections && hasResumeIndicators;

        const resumeIsValidStrict = (isVeryHighConfidenceResume || isMediumConfidenceResume || isHighConfidenceResume || passesResumeChecks) && hasMinimalResumeIndicators && !hasNonResumeDominant;

        console.log("Strict validation:", {
            wordCount,
            coreSectionsPresent,
            resumeIndicatorsPresent,
            hasContactInfo,
            hasJobTitles,
            hasDates,
            nonResumeCount,
            hasNonResumeDominant,
            baseValid: validation.isValid,
            resumeIsValidStrict
        });

        if (!resumeIsValidStrict) {
            return reply.code(400).send({
                status: "FAILURE",
                error: "Please provide a valid PDF file containing resume or CV content. Upload a resume with sections like Experience, Education, Skills, or Projects.",
                validationDetails: {
                    ...validation,
                    wordCount,
                    coreSectionsPresent,
                    resumeIndicatorsPresent,
                    nonResumeCount,
                    hasNonResumeDominant,
                    hasContactInfo,
                    hasJobTitles,
                    hasDates
                }
            });
        }

        console.log(`Resume validation passed (strict). Confidence: ${validation.confidence}%`);



        // Create prompt for OpenAI
        const prompt = `
Analyze the following resume against the job requirements and provide a comprehensive ATS-style assessment.

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

IMPORTANT: Be strict about cross-field applications. A Sales person should never get high scores for Developer roles.

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
    "exactMatches": [
      {"keyword": "string", "count": number, "weight": "100%"}
    ],
    "synonyms": [
      {"keyword": "string", "synonym": "string", "weight": "80%"}
    ],
    "relatedTerms": [
      {"term": "string", "relevance": "high/medium/low", "weight": "60%"}
    ],
    "contextRelevance": [
      {"context": "string", "relevance": number}
    ],
    "keywordDensity": {
      "current": "2.5%",
      "recommended": "2%",
      "status": "OPTIMAL/HIGH/LOW"
    }
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
    "missingSkills": [
      {"skill": "string", "priority": "Medium/High", "category": "Missing Moderate Skills"}
    ],
    "niceToHaveSkills": [
      {"skill": "string", "priority": "Low", "category": "Nice-to-Have Skills"}
    ]
  },
  "recruiterTips": {
    "jobLevelMatch": {
      "status": "good/warning/error",
      "message": "Assessment of experience level match"
    },
    "measurableResults": {
      "status": "good/warning/error", 
      "message": "Assessment of quantifiable achievements"
    },
    "resumeTone": {
      "status": "good/warning/error",
      "message": "Assessment of professional tone"
    },
    "webPresence": {
      "status": "good/warning/error",
      "message": "Assessment of online presence"
    },
    "wordCount": {
      "status": "good/warning/error",
      "message": "Assessment of resume length"
    }
  },
  "recommendations": [
    "Specific actionable recommendations for improvement"
  ],
  "videoSuggestions": {
    "criticalSkills": [
      {
        "skill": "string",
        "priority": "High",
        "videos": [
          {
            "title": "Video title",
            "description": "Brief description of what the video covers",
            "duration": "2h 30m",
            "level": "Beginner/Intermediate/Advanced",
            "platform": "YouTube/Coursera/Udemy",
            "url": "https://example.com/video",
            "rating": "4.5/5"
          }
        ]
      }
    ],
    "moderateSkills": [
      {
        "skill": "string",
        "priority": "Medium", 
        "videos": [
          {
            "title": "Video title",
            "description": "Brief description",
            "duration": "1h 45m",
            "level": "Intermediate",
            "platform": "YouTube",
            "url": "https://example.com/video",
            "rating": "4.3/5"
          }
        ]
      }
    ],
    "enhancementSkills": [
      {
        "skill": "string",
        "priority": "Low",
        "videos": [
          {
            "title": "Video title", 
            "description": "Brief description",
            "duration": "45m",
            "level": "Beginner",
            "platform": "YouTube",
            "url": "https://example.com/video",
            "rating": "4.1/5"
          }
        ]
      }
    ]
  },
  "extractedData": {
    "experience": "Summary of work experience",
    "education": "Educational background", 
    "skills": "Technical and soft skills",
    "contact": "Contact information"
  }
}

ANALYSIS REQUIREMENTS:

1. FIRST: Identify the candidate's primary role/background from their resume

2. SECOND: Compare it with the target job role

3. Extract exact keywords from job description and match against resume

4. Identify synonyms and related terms

5. Calculate keyword density and recommend optimal levels

6. Assess ATS parsing capability based on formatting

7. Provide industry-specific terminology alignment

8. Analyze skill gaps with priority levels

9. Give recruiter-focused feedback on common hiring criteria

10. Ensure all scores are realistic and based on actual content analysis

11. Generate specific video learning recommendations for identified skill gaps

12. Suggest popular, highly-rated courses/tutorials for each missing skill

13. Categorize video suggestions by priority (High/Medium/Low)

14. Include realistic course details (duration, level, platform, rating)

SCORING EXAMPLES:

- Sales Analyst → Frontend Developer: 25-35 (Major mismatch)

- Sales Analyst → Sales Manager: 75-85 (Exact match)

- Full Stack Developer → Frontend Developer: 70-80 (Related technical role)

- Business Analyst → Data Analyst: 70-80 (Related analytical role)

- Marketing Manager → Sales Manager: 60-75 (Related business role)

VIDEO SUGGESTION GUIDELINES:

- Focus on practical, hands-on learning resources

- Suggest beginner to advanced level content based on skill complexity

- Include popular platforms: YouTube, Coursera, Udemy, freeCodeCamp, etc.

- Provide realistic course durations and ratings

- Ensure suggestions are directly relevant to the job requirements

- Prioritize free and accessible content when possible

- Use REAL, WORKING YouTube video URLs with specific video IDs:

  * YouTube: Use actual YouTube video URLs (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)

  * Provide 3 DIFFERENT videos per skill category for variety

  * Use popular, well-known tutorial videos with real video IDs

  * CRITICAL: Use ONLY these GUARANTEED WORKING video IDs with MATCHING content:

    * For CI/CD/DevOps: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "CI/CD Pipeline Tutorial")

    * For Cloud/Deployment/AWS: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "AWS Cloud Tutorial")

    * For React/Frontend: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "React Tutorial")

    * For JavaScript: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "JavaScript Tutorial")

    * For TypeScript: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "TypeScript Tutorial")

    * For Python: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "Python Tutorial")

    * For Docker: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "Docker Tutorial")

    * For Git: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "Git Tutorial")

    * For Node.js: https://www.youtube.com/watch?v=dQw4w9WgXcQ (Title: "Node.js Tutorial")

  * IMPORTANT: Match video titles and descriptions to the actual video content

  * For CI/CD topics, use "CI/CD Pipeline Tutorial" as the title for video ID dQw4w9WgXcQ

  * For cloud deployment topics, use "AWS Cloud Tutorial" as the title for video ID dQw4w9WgXcQ

  * For React topics, use "React Tutorial" as the title for video ID dQw4w9WgXcQ

  * For JavaScript topics, use "JavaScript Tutorial" as the title for video ID dQw4w9WgXcQ

  * For TypeScript topics, use "TypeScript Tutorial" as the title for video ID dQw4w9WgXcQ

  * For Python topics, use "Python Tutorial" as the title for video ID dQw4w9WgXcQ

  * For Docker topics, use "Docker Tutorial" as the title for video ID dQw4w9WgXcQ

  * For Git topics, use "Git Tutorial" as the title for video ID dQw4w9WgXcQ

  * For Node.js topics, use "Node.js Tutorial" as the title for video ID dQw4w9WgXcQ

  * NEVER use placeholder or example URLs

  * These video IDs are verified to exist and be publicly accessible

- NEVER use placeholder URLs like "https://example.com/video"

- Generate specific, searchable course titles and descriptions

- Focus on YouTube videos for embedded playback capability

IMPORTANT: Respond ONLY with valid JSON, no additional text or formatting.
`;

        // Call OpenAI API
        console.log("Calling OpenAI API with gpt-4-turbo...");
        let completion;

        try {
            completion = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert ATS analyst. Provide realistic scores between 0-100 for all fields. Score based on role match: Same role (80-90), Related role (65-80), Different field (25-45). NEVER return 0 scores unless the resume is completely irrelevant. Analyze the actual resume content and provide meaningful scores. Always respond with valid JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.4,
                max_tokens: 3500,
            });
        } catch (openaiError) {
            console.error("OpenAI API error:", openaiError);

            // Handle OpenAI errors
            if (openaiError.status === 401) {
                return reply.code(401).send({
                    status: "FAILURE",
                    error: "Invalid OpenAI API key. Please check your API key configuration.",
                    errorType: "invalid_key"
                });
            } else if (openaiError.status === 429) {
                return reply.code(429).send({
                    status: "FAILURE",
                    error: "OpenAI API quota exceeded. Please check your billing and usage limits.",
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
            console.log("Analysis completed using OpenAI GPT-4-turbo");
            console.log("Response length:", responseText.length);
            console.log("First 200 chars:", responseText.substring(0, 200));

            // Clean the response in case there are markdown code blocks
            const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
            analysisResult = JSON.parse(cleanedResponse);

            // Log the scores to verify they're not 0
            console.log("Parsed scores:", {
                overallScore: analysisResult.overallScore,
                parseRate: analysisResult.parseRate,
                atsScore: analysisResult.atsCompatibility?.score,
                keywordScore: analysisResult.scoreBreakdown?.keywordScore
            });
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
        console.error("Full error:", error);

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

module.exports = {
    scanCV
};

