/**
 * Validates resume content to ensure it's actually a resume/CV
 * Returns validation result with confidence score
 */

function validateResumeContent(resumeText) {
    if (!resumeText || typeof resumeText !== 'string') {
        return {
            isValid: false,
            confidence: 0,
            reason: 'Invalid or empty resume text'
        };
    }

    const text = resumeText.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Minimum word count check
    if (wordCount < 50) {
        return {
            isValid: false,
            confidence: 0,
            reason: 'Resume text is too short'
        };
    }

    // Check for resume-specific keywords and patterns
    const resumeKeywords = [
        'resume', 'cv', 'curriculum vitae',
        'experience', 'work experience', 'employment',
        'education', 'degree', 'university', 'college',
        'skills', 'technical skills', 'professional skills',
        'projects', 'achievements', 'certifications',
        'contact', 'email', 'phone', 'address'
    ];

    // Check for section headers
    const sectionPatterns = [
        /\b(experience|work experience|professional experience|employment history)\b/i,
        /\b(education|academic background|qualifications)\b/i,
        /\b(skills|technical skills|competencies)\b/i,
        /\b(projects|project experience)\b/i,
        /\b(certifications|certificates|licenses)\b/i,
        /\b(achievements|awards|honors)\b/i
    ];

    let keywordMatches = 0;
    resumeKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
            keywordMatches++;
        }
    });

    let sectionMatches = 0;
    sectionPatterns.forEach(pattern => {
        if (pattern.test(text)) {
            sectionMatches++;
        }
    });

    // Check for contact information patterns
    const hasEmail = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(resumeText);
    const hasPhone = /\b\d{10,}\b/.test(resumeText) || /\b\+?\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/.test(resumeText);

    // Check for date patterns (common in resumes)
    const hasDates = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s-]?\d{4}\b/i.test(text) ||
        /\b\d{4}\s*[-–—]\s*(present|current|\d{4})\b/i.test(text);

    // Calculate confidence score
    let confidence = 0;

    // Base confidence from keyword matches (max 40 points)
    confidence += Math.min(keywordMatches * 5, 40);

    // Section matches (max 30 points)
    confidence += Math.min(sectionMatches * 5, 30);

    // Contact information (max 15 points)
    if (hasEmail) confidence += 10;
    if (hasPhone) confidence += 5;

    // Date patterns (max 15 points)
    if (hasDates) confidence += 15;

    // Word count bonus (max 10 points for longer resumes)
    if (wordCount > 200) confidence += 10;
    else if (wordCount > 100) confidence += 5;

    // Cap confidence at 100
    confidence = Math.min(confidence, 100);

    // Validation threshold: 70% confidence
    const isValid = confidence >= 70;

    return {
        isValid,
        confidence,
        reason: isValid ? 'Valid resume content detected' : 'Low confidence - may not be a resume',
        details: {
            keywordMatches,
            sectionMatches,
            hasEmail,
            hasPhone,
            hasDates,
            wordCount
        }
    };
}

module.exports = {
    validateResumeContent
};

