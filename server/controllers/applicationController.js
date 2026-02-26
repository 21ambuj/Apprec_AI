
const { generateEmbedding, calculateSimilarity } = require('../services/aiService');
const Application = require('../models/Application');
const Job = require('../models/Job');
// @desc    Apply for a job
// @route   POST /api/applications
// @access  Private (Candidate)
const applyForJob = async (req, res) => {
    try {
        const { jobId, resumeUrl } = req.body;

        // Check if already applied
        const existingApplication = await Application.findOne({
            jobId,
            candidateId: req.user._id,
        });

        if (existingApplication) {
            return res.status(400).json({ message: 'You have already applied for this job' });
        }

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Calculate AI Score (Match Candidate Profile vs Job)
        // Note: For best results, we should use the parsed resume text. 
        // For MVP, we'll use the user's profile skills and experience if available, or just valid dummy text if resume parsing isn't stored as raw text.
        // Let's assume user.profile + skills is the source.
        const candidateText = `${req.user.skills.join(' ')} ${req.user.profile.experience.map(e => e.title + ' ' + e.company).join(' ')}`;

        let aiScore = 0;
        let aiNotes = 'Profile incomplete for AI analysis';

        if (candidateText.trim().length > 5 && job.embeddings && job.embeddings.length > 0) {
            const candidateEmbedding = await generateEmbedding(candidateText);
            aiScore = calculateSimilarity(candidateEmbedding, job.embeddings);
            aiNotes = `Matched based on skills: ${req.user.skills.slice(0, 3).join(', ')}`;
        }

        const application = await Application.create({
            jobId,
            candidateId: req.user._id,
            resumeUrl,
            status: 'applied',
            aiScore: Math.round(aiScore),
            aiNotes,
        });

        // Sync with Job model so Recruiter Dashboard counts work correctly
        job.applicants.push({
            user: req.user._id,
            status: 'applied',
            appliedAt: new Date()
        });
        await job.save();

        res.status(201).json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my applications (Candidate)
// @route   GET /api/applications/my
// @access  Private (Candidate)
const getMyApplications = async (req, res) => {
    try {
        const applications = await Application.find({ candidateId: req.user._id })
            .populate('jobId', 'title company location type')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get applications for a job (Recruiter)
// @route   GET /api/applications/job/:jobId
// @access  Private (Recruiter)
const getJobApplications = async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        if (job.recruiterId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to view applicants for this job' });
        }

        const applications = await Application.find({ jobId: req.params.jobId })
            .populate('candidateId', 'name email phone address bio profile skills socialLinks resumeUrl')
            .sort({ aiScore: -1 }); // Sort by AI score (descending)

        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update application status (Recruiter)
// @route   PUT /api/applications/:id/status
// @access  Private (Recruiter)
const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const application = await Application.findById(req.params.id);

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const job = await Job.findById(application.jobId);
        if (!job) {
            return res.status(404).json({ message: 'Associated job not found' });
        }

        // Verify recruiter owns this job
        if (job.recruiterId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to update this status' });
        }

        // Update application document
        application.status = status;
        await application.save();

        // Update the status inside the Job document's applicants array for consistency
        const applicantIndex = job.applicants.findIndex(
            app => app.user.toString() === application.candidateId.toString()
        );

        if (applicantIndex !== -1) {
            job.applicants[applicantIndex].status = status;
            await job.save();
        }

        res.json({ message: 'Status updated successfully', application });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { applyForJob, getMyApplications, getJobApplications, updateApplicationStatus };
