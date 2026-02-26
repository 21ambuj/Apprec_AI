
const fs = require('fs');
const pdf = require('pdf-parse');

const parseResume = async (resumeText) => {
    try {
        if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
            console.warn("DEBUG: Empty or invalid text provided to parseResume");
            return {};
        }

        // Read up to 8,000 characters to ensure Pollinations AI does not reject the prompt for being too long
        const cleanText = resumeText.slice(0, 8000);

        const prompt1 = `You are an expert AI technical recruiter. Extract ONLY the following basic information from the resume text in strict JSON format. 
        Format EXACTLY like this structure, returning null for missing fields:
        { 
            "name": "Candidate Name", 
            "email": "email@example.com", 
            "phone": "Phone Number",
            "address": "City, Country",
            "bio": "Write a 2-3 sentence professional summary highlighting their strongest skills and background.",
            "socialLinks": { "linkedin": "URL", "github": "URL", "portfolio": "URL" },
            "skills": ["Skill1", "Skill2"], 
            "languages": ["Lang1", "Lang2"],
            "education": [ { "degree": "Degree Name", "institution": "University/Platform Name", "year": "Graduation Year" } ]
        }
        IMPORTANT: Return ONLY raw valid JSON. Do not include markdown formatting or explanations. Do not hallucinate data. 
        RESUME TEXT: ${cleanText}`;

        const prompt2 = `You are an expert AI technical recruiter. Extract ONLY the Experience, Projects, and Certifications from the resume text in strict JSON format. 
        Format EXACTLY like this structure, returning an empty array if a section evaluates to nothing:
        { 
            "experience": [ { "title": "Job", "company": "Company", "period": "Dates", "description": "1 sentence description." } ], 
            "projects": [ { "name": "Project", "description": "1 short sentence", "link": "URL" } ],
            "certifications": [ { "name": "Cert", "issuer": "Issuer", "year": "Year" } ]
        }
        IMPORTANT: Return ONLY raw valid JSON without spaces or line breaks. Do not invent data.
        RESUME TEXT: ${cleanText}`;

        console.log("DEBUG: Sending first chunk request for basic info...");
        const res1 = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt1 }], jsonMode: true })
        });

        console.log("DEBUG: Throttling 2 seconds to prevent API limits...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("DEBUG: Sending second chunk request for experience profile...");
        const res2 = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt2 }], jsonMode: true })
        });

        const text1 = await res1.text();
        const text2 = await res2.text();

        // Safely extract JSON blocks using Regex, bounding the outermost {}
        const extractJson = (rawStr) => {
            const match = rawStr.match(/\{[\s\S]*\}/);
            if (!match) return {};
            try {
                // If there are unescaped newlines in middle of JSON tags, they can occasionally break parse
                // but we trust the AI structural generation. Replace only obvious markdown wrappers
                const cleanStr = match[0].replace(/```json/gi, '').replace(/```/g, '').trim();
                // Extremely safe trailing comma JSON parse wrapper
                return JSON.parse(cleanStr.replace(/,(?=\s*[}\]])/mig, ''));
            } catch (err) {
                console.error("DEBUG: Regex JSON Parsing chunk failed:", err.message);
                return {};
            }
        };

        const data1 = extractJson(text1);
        const data2 = extractJson(text2);

        const parsedData = { ...data1, ...data2 };
        console.log("DEBUG: Merged AI Extractions Successfully. Fields found:", Object.keys(parsedData).length);
        return parsedData;

    } catch (error) {
        console.error("Error parsing resume:", error.message);
        return {};
    }
};

// Extremely fast, free local text vectorizer (Bag-of-Words hash)
const generateEmbedding = async (text) => {
    try {
        const vec = new Array(150).fill(0);
        const words = text.toLowerCase().split(/[\W_]+/);

        words.forEach(word => {
            if (word.length < 2) return;
            let hash = 0;
            for (let i = 0; i < word.length; i++) {
                hash = (hash << 5) - hash + word.charCodeAt(i);
                hash |= 0;
            }
            const index = Math.abs(hash) % 150;
            vec[index] += 1;
        });

        let mag = 0;
        for (let i = 0; i < 150; i++) mag += vec[i] * vec[i];
        mag = Math.sqrt(mag);

        if (mag === 0) return vec;
        return vec.map(v => v / mag);
    } catch (error) {
        console.error("Error generating local embedding:", error);
        throw new Error("Failed to generate embedding");
    }
};

const calculateSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    // Higher scaling factor (2.5) to bridge the gap between word-overlap and semantic matching
    let score = (dotProduct / (magnitudeA * magnitudeB)) * 100;
    return Math.min(score * 2.5, 99);
};

const analyzeCVMatch = async (candidateText, jobText) => {
    try {
        const prompt = `You are an expert technical recruiter and AI resume analyzer. Compare the candidate's profile/resume against the job description.
        Provide a strict JSON response analyzing the fit.
        { "matchPercentage": 85, "matchingSkills": ["React", "Node.js"], "missingSkills": ["AWS"], "feedback": "Strong candidate for full-stack, but lacks devops experience requested in the job post." }
        The matchPercentage must be an integer from 0 to 100. Return ONLY valid JSON and no markdown formatting.
        CANDIDATE: ${candidateText}
        JOB: ${jobText}`;

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                jsonMode: true
            })
        });

        const content = await response.text();
        const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim();

        return JSON.parse(cleanContent);
    } catch (error) {
        console.error("Error analyzing CV match via Pollinations:", error);
        throw new Error("Failed to analyze CV match");
    }
};

const generateInterviewQuestion = async (jobText, candidateText) => {
    try {
        const prompt = `You are an expert technical interviewer. Based on the job description and candidate profile, generate ONE strong, open-ended technical interview question to ask the candidate. It should test a core skill required by the job.
        Return ONLY valid JSON: { "question": "Your question here" }
        JOB: ${jobText}
        CANDIDATE: ${candidateText}`;

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], jsonMode: true })
        });

        const content = await response.text();
        const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanContent);
    } catch (error) {
        console.error("Error generating interview question:", error);
        throw new Error("Failed to generate question");
    }
};

const evaluateInterviewAnswer = async (question, answer, jobText) => {
    try {
        const prompt = `You are a technical interviewer. The candidate just answered your previous question. 
        Evaluate their answer (out of 10), provide brief constructive feedback, and then ask a NEW follow-up or behavioral question.
        Return ONLY valid JSON: { "feedback": "Your evaluation...", "score": 8, "nextQuestion": "Your new question..." }
        PREVIOUS QUESTION: ${question}
        CANDIDATE ANSWER: ${answer}
        JOB DESCRIPTION CONTEXT: ${jobText}`;

        const response = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], jsonMode: true })
        });

        const content = await response.text();
        const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleanContent);
    } catch (error) {
        console.error("Error evaluating answer:", error);
        throw new Error("Failed to evaluate answer");
    }
};

module.exports = { parseResume, generateEmbedding, calculateSimilarity, analyzeCVMatch, generateInterviewQuestion, evaluateInterviewAnswer };
