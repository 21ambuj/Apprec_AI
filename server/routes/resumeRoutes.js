const express = require('express');
const multer = require('multer');
const { parseResume, generateEmbedding } = require('../services/aiService');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    console.log("DEBUG: Creating uploads directory...");
    fs.mkdirSync(uploadDir);
}

// Secure file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.originalname.split('.').pop();
        cb(null, `${req.user._id}-${uniqueSuffix}.${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'text/plain') {
        cb(null, true);
    } else {
        console.log("DEBUG: Rejected file type:", file.mimetype);
        cb(new Error('Only PDF, DOCX, and TXT files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// @desc    Upload and parse resume
// @route   POST /api/resume/upload
// @access  Private
router.post('/upload', protect, upload.single('resume'), async (req, res) => {
    console.log("DEBUG: === Resume Upload Started ===");
    console.log("DEBUG: User ID:", req.user ? req.user._id : "No User");

    try {
        if (!req.file) {
            console.log("DEBUG: No file in request");
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log("DEBUG: File received:", req.file.path, "Type:", req.file.mimetype);

        let parsedData = {};
        let extractText = req.body.extractedText;

        if (!extractText && req.file) {
            console.log("DEBUG: No extractedText provided by client. Attempting server-side extraction...");
            if (req.file.mimetype === 'application/pdf') {
                try {
                    const pdf = require('pdf-parse');
                    const dataBuffer = fs.readFileSync(req.file.path);
                    const pdfData = await pdf(dataBuffer);
                    extractText = pdfData.text;
                    console.log("DEBUG: Server-side PDF extraction successful.");
                } catch (pdfErr) {
                    console.error("DEBUG: Server-side PDF extraction failed:", pdfErr.message);
                }
            } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                try {
                    const mammoth = require('mammoth');
                    const filePath = req.file.path;
                    const result = await mammoth.extractRawText({ path: filePath });
                    extractText = result.value;
                    console.log("DEBUG: Server-side DOCX extraction successful.");
                } catch (docxErr) {
                    console.error("DEBUG: Server-side DOCX extraction failed:", docxErr.message);
                }
            } else if (req.file.mimetype === 'text/plain') {
                extractText = fs.readFileSync(req.file.path, 'utf8');
                console.log("DEBUG: Server-side TXT extraction successful.");
            }
        }

        try {
            if (extractText) {
                console.log("DEBUG: Attempting AI parsing with extracted text...");
                parsedData = await parseResume(extractText);
                console.log("DEBUG: AI parsing successful!");
            } else {
                console.warn("DEBUG: No text could be extracted from the resume.");
            }
        } catch (err) {
            console.error("DEBUG: AI parsing failed:", err.message);
        }

        // Update user profile with extracted data
        const user = await User.findById(req.user._id);

        if (!user) {
            // Clean up file if user not found
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'User not found' });
        }

        let hasRealData = false;
        if (parsedData && Object.keys(parsedData).length > 0) {
            // Validate that Pollinations AI actually extracted something meaningful, not just an empty boilerplate schema
            hasRealData = (parsedData.skills && parsedData.skills.length > 0) ||
                (parsedData.experience && parsedData.experience.length > 0) ||
                (parsedData.education && parsedData.education.length > 0) ||
                (parsedData.bio && parsedData.bio.trim().length > 0);

            if (hasRealData) {
                console.log("DEBUG: AI Data confirmed. Overwriting profile with deep extraction...");
                // Hard reset profile structure to clear out old CV data entirely
                user.profile = {
                    experience: [],
                    education: [],
                    projects: [],
                    certifications: [],
                    languages: []
                };
                user.skills = [];

                if (parsedData.bio) user.bio = parsedData.bio;
                if (parsedData.address) user.address = parsedData.address;
                if (parsedData.phone) user.phone = parsedData.phone;

                if (parsedData.socialLinks) {
                    user.socialLinks = {
                        linkedin: parsedData.socialLinks.linkedin || user.socialLinks?.linkedin || '',
                        github: parsedData.socialLinks.github || user.socialLinks?.github || '',
                        portfolio: parsedData.socialLinks.portfolio || user.socialLinks?.portfolio || ''
                    };
                }

                if (parsedData.skills && Array.isArray(parsedData.skills)) {
                    user.skills = parsedData.skills.filter(s => s && typeof s === 'string' && s.trim().length > 0);
                }

                if (parsedData.languages && Array.isArray(parsedData.languages)) {
                    user.profile.languages = parsedData.languages.filter(s => s && typeof s === 'string' && s.trim().length > 0);
                }

                if (parsedData.experience && Array.isArray(parsedData.experience)) {
                    user.profile.experience = parsedData.experience.filter(e => e && (e.title || e.company));
                }

                if (parsedData.education && Array.isArray(parsedData.education)) {
                    user.profile.education = parsedData.education.filter(e => e && (e.degree || e.institution));
                }

                if (parsedData.projects && Array.isArray(parsedData.projects)) {
                    user.profile.projects = parsedData.projects.filter(p => p && (p.name || p.description));
                }

                if (parsedData.certifications && Array.isArray(parsedData.certifications)) {
                    user.profile.certifications = parsedData.certifications.filter(c => c && c.name);
                }

                // Force Mongoose to recognize the deep changes
                user.markModified('profile');
                user.markModified('skills');
                user.markModified('socialLinks');
            } else {
                console.warn("DEBUG: AI returned JSON, but arrays were completely empty. Did not overwrite user profile.");
            }
        } else {
            console.warn("DEBUG: Parsed data was completely missing. Did not overwrite user profile.");
        }

        // Save the file path/URL
        user.resumeUrl = req.file.path;
        console.log("DEBUG: Set resumeUrl:", user.resumeUrl);

        await user.save();
        console.log("DEBUG: User saved successfully!");

        // Update Embeddings (Background Task)
        try {
            console.log("DEBUG: Generating embeddings...");
            const profileText = `
                Name: ${user.name}
                Skills: ${user.skills.join(', ')}
                Experience: ${user.profile.experience.map(exp => `${exp.title || ''} at ${exp.company || ''}`).join(', ')}
                Education: ${user.profile.education.map(edu => `${edu.degree || ''} at ${edu.institution || ''}`).join(', ')}
            `.trim();

            const embedding = await generateEmbedding(profileText);
            if (embedding && embedding.length > 0) {
                user.embeddings = embedding;
                await user.save();
                console.log("DEBUG: Embeddings saved.");
            }
        } catch (embedError) {
            console.warn("DEBUG: Embedding generation failed (non-critical):", embedError.message);
        }

        res.json({
            message: 'Resume updated successfully',
            data: parsedData,
            extractedData: hasRealData,
            serverParsed: !req.body.parsedData // Flag to indicate if server did the work
        });

    } catch (error) {
        console.error("DEBUG: CRITICAL ERROR in /upload:", error);
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            message: 'Server error during resume upload',
            error: error.message
        });
    }
});

// @desc    Download/View uploaded resume
// @route   GET /api/resume/download
// @access  Private
router.get('/download', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user || !user.resumeUrl) {
            return res.status(404).json({ message: 'No resume found for this user' });
        }

        const filePath = path.resolve(user.resumeUrl);

        if (!fs.existsSync(filePath)) {
            // Clear the stale URL if the file is missing from the disk
            user.resumeUrl = '';
            await user.save();
            return res.status(404).json({ message: 'Resume file no longer exists on server' });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error("DEBUG: ERROR in /download:", error);
        res.status(500).json({ message: 'Server error retrieving resume' });
    }
});

// @desc    Download/View applicant resume (Recruiter only)
// @route   GET /api/resume/download/:candidateId
// @access  Private
router.get('/download/:candidateId', protect, async (req, res) => {
    try {
        if (req.user.role !== 'recruiter') {
            return res.status(403).json({ message: 'Not authorized as recruiter' });
        }

        const candidate = await User.findById(req.params.candidateId);

        if (!candidate || !candidate.resumeUrl) {
            return res.status(404).json({ message: 'No resume found for this candidate' });
        }

        const filePath = path.resolve(candidate.resumeUrl);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Resume file no longer exists on server' });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error("DEBUG: ERROR in /download/:candidateId :", error);
        res.status(500).json({ message: 'Server error retrieving resume' });
    }
});

module.exports = router;
