const Job = require('../models/Job');
const Application = require('../models/Application');
const { generateEmbedding } = require('../services/aiService');

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private (Recruiter only)
const createJob = async (req, res) => {
    try {
        const { title, company, location, type, description, requirements, salaryRange, applicationDeadline } = req.body;

        // Generate embedding for "Smart Match"
        const textToEmbed = `${title} ${description} ${requirements.join(' ')}`;
        let embeddings = [];
        try {
            embeddings = await generateEmbedding(textToEmbed);
        } catch (embedError) {
            console.warn("Failed to generate embedding for job:", embedError.message);
            // Continue without embedding
        }

        const job = await Job.create({
            recruiterId: req.user._id,
            title,
            company,
            location,
            type,
            description,
            requirements,
            salaryRange,
            applicationDeadline,
            embeddings,
        });

        const populatedJob = await Job.findById(job._id).populate('recruiterId', 'name email');
        res.status(201).json(populatedJob);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all jobs with filters
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res) => {
    try {
        const keyword = req.query.keyword
            ? {
                $or: [
                    { title: { $regex: req.query.keyword, $options: 'i' } },
                    { description: { $regex: req.query.keyword, $options: 'i' } },
                    { company: { $regex: req.query.keyword, $options: 'i' } },
                ],
            }
            : {};

        const jobs = await Job.find({ ...keyword }).populate('recruiterId', 'name email companyProfile isVerified');

        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all jobs for logged in recruiter
// @route   GET /api/jobs/recruiter/my-jobs
// @access  Private (Recruiter only)
const getMyJobs = async (req, res) => {
    try {
        if (req.user.role !== 'recruiter') {
            return res.status(401).json({ message: 'Not authorized as a recruiter' });
        }

        const jobs = await Job.find({ recruiterId: req.user._id })
            .populate('recruiterId', 'name email companyProfile')
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get job by ID
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('recruiterId', 'name email companyProfile isVerified');

        if (job) {
            res.json(job);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Recruiter/Owner)
const updateJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (job) {
            if (job.recruiterId.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: 'Not authorized' });
            }

            job.title = req.body.title || job.title;
            job.company = req.body.company || job.company;
            job.location = req.body.location || job.location;
            job.type = req.body.type || job.type;
            job.description = req.body.description || job.description;
            job.requirements = req.body.requirements || job.requirements;
            job.salaryRange = req.body.salaryRange || job.salaryRange;
            if (req.body.applicationDeadline) {
                job.applicationDeadline = req.body.applicationDeadline;
            }

            const savedJob = await job.save();
            const updatedJob = await Job.findById(savedJob._id).populate('recruiterId', 'name email companyProfile isVerified');
            res.json(updatedJob);
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Recruiter/Owner)
const deleteJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (job) {
            if (job.recruiterId.toString() !== req.user._id.toString()) {
                return res.status(401).json({ message: 'Not authorized' });
            }

            await job.deleteOne();
            res.json({ message: 'Job removed' });
        } else {
            res.status(404).json({ message: 'Job not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get smart job recommendations (Candidate)
// @route   GET /api/jobs/smart-match
// @access  Private (Candidate)
const getSmartMatches = async (req, res) => {
    try {
        // 1. Get candidate text safely
        const skills = req.user.skills || [];
        const profile = req.user.profile || {};
        const experience = profile.experience || [];

        const candidateText = `${skills.join(' ')} ${experience.map(e => (e.title || '') + ' ' + (e.company || '')).join(' ')}`;

        if (candidateText.trim().length < 5) {
            return res.status(400).json({ message: 'Please update your profile with skills and experience to get recommendations.' });
        }

        // 2. Generate embedding
        const candidateEmbedding = await generateEmbedding(candidateText);

        // 3. Get all jobs (For MVP in-memory sort. Prod should use Vector DB)
        const jobs = await Job.find({}).populate('recruiterId', 'name email companyProfile isVerified');

        // 4. Calculate scores
        const scoredJobs = jobs.map(job => {
            let score = 0;
            if (job.embeddings && job.embeddings.length > 0) {
                const { calculateSimilarity } = require('../services/aiService');
                score = calculateSimilarity(candidateEmbedding, job.embeddings);
            }
            return { ...job.toObject(), matchScore: Math.round(score) };
        });

        // 5. Filter by threshold (20%) and sort by score
        const filteredJobs = scoredJobs
            .filter(job => job.matchScore >= 20)
            .sort((a, b) => b.matchScore - a.matchScore);

        // Return top 10
        res.json(filteredJobs.slice(0, 10));

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Apply to a job
// @route   POST /api/jobs/:id/apply
// @access  Private (Candidate only)
const applyToJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Prevent recruiters from applying (optional, but good practice)
        if (req.user.role === 'recruiter') {
            return res.status(403).json({ message: 'Recruiters cannot apply to jobs.' });
        }

        // Check if user already applied
        const alreadyApplied = job.applicants.find(
            (applicant) => applicant.user.toString() === req.user._id.toString()
        );

        if (alreadyApplied) {
            return res.status(400).json({ message: 'You have already applied to this job' });
        }

        // Add user to applicants array
        job.applicants.push({ user: req.user._id });
        await job.save();

        res.status(200).json({ message: 'Successfully applied to job' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get applicants for a job
// @route   GET /api/jobs/:id/applicants
// @access  Private (Recruiter/Owner only)
const getJobApplicants = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).lean();

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Ensure only the recruiter who posted the job can view applicants
        if (job.recruiterId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to view these applicants' });
        }

        // Fetch applications from the Application collection securely
        const applications = await Application.find({ jobId: req.params.id })
            .populate('candidateId', 'name email phone address profile bio skills socialLinks resumeUrl');

        // Stitch the application list into the job object for the frontend to consume
        job.applicants = applications.map(app => ({
            ...app.toObject(),
            user: app.candidateId
        }));

        res.json(job);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Analyze Candidate fit for a specific job
// @route   POST /api/jobs/:id/match-analyze
// @access  Private (Candidate)
const analyzeJobMatch = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Construct Candidate Profile Text
        const profile = req.user.profile || {};
        const experience = profile.experience || [];
        const education = profile.education || [];
        const skills = req.user.skills || [];

        const candidateText = `
        Name: ${req.user.name || 'Candidate'}
        Skills: ${skills.length > 0 ? skills.join(', ') : 'None listed'}
        Bio: ${req.user.bio || 'None'}
        Experience: ${experience.length > 0 ? experience.map(e => `${e.title || 'Role'} at ${e.company || 'Company'} (${e.period || 'Period'})`).join(' | ') : 'None listed'}
        Education: ${education.length > 0 ? education.map(e => `${e.degree || 'Degree'} from ${e.institution || 'Institution'} (${e.year || 'Year'})`).join(' | ') : 'None listed'}
        `;

        if (candidateText.replace(/None listed|None|Candidate|[|]/g, '').trim().length < 20) {
            return res.status(400).json({ message: 'Please complete your profile to use the AI Match Analyzer.' });
        }

        // Construct Job Text
        const jobRequirements = job.requirements || [];
        const jobText = `
        Title: ${job.title || 'Job'}
        Company: ${job.company || 'Company'}
        Type: ${job.type || 'Type'}
        Requirements: ${jobRequirements.length > 0 ? jobRequirements.join(', ') : 'None listed'}
        Description: ${job.description || 'No description provided'}
        `;

        const { analyzeCVMatch } = require('../services/aiService');
        const matchResult = await analyzeCVMatch(candidateText, jobText);

        res.json(matchResult);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get best skill matching applicants for a job
// @route   GET /api/jobs/:id/best-matches
// @access  Private (Recruiter only)
const getBestMatchesForJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).lean();
        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (job.recruiterId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const applications = await Application.find({ jobId: req.params.id })
            .populate('candidateId', 'name email profile skills bio')
            .lean();

        if (applications.length === 0) return res.json([]);

        const { calculateSimilarity, generateEmbedding } = require('../services/aiService');

        // 1. Prepare Job Embedding
        const jobText = `${job.title} ${job.description} ${(job.requirements || []).join(' ')}`;
        const jobEmbedding = await generateEmbedding(jobText);

        // 2. Score each applicant
        const scoredApplicants = await Promise.all(applications.map(async (app) => {
            const candidate = app.candidateId;
            if (!candidate) return null;

            const skills = candidate.skills || [];
            const profile = candidate.profile || {};
            const experience = profile.experience || [];

            const candidateText = `${skills.join(' ')} ${experience.map(e => (e.title || '') + ' ' + (e.company || '')).join(' ')}`;
            const candidateEmbedding = await generateEmbedding(candidateText);

            const score = calculateSimilarity(jobEmbedding, candidateEmbedding);

            // Identify matching skills (case insensitive check)
            const matchingSkills = skills.filter(skill =>
                (job.requirements || []).some(req => req.toLowerCase().includes(skill.toLowerCase()))
            );

            return {
                _id: app._id,
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                candidateSkills: skills,
                matchingSkills: matchingSkills,
                matchScore: Math.round(score),
                candidateId: candidate._id
            };
        }));

        // 3. Filter nulls and sort by score
        const result = scoredApplicants
            .filter(a => a !== null)
            .sort((a, b) => b.matchScore - a.matchScore);

        res.json(result);
    } catch (error) {
        console.error('Best matches error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get best skill matching candidates who HAVEN'T applied to a job
// @route   GET /api/jobs/:id/unapplied-matches
// @access  Private (Recruiter only)
const getUnappliedBestMatches = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).lean();
        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (job.recruiterId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // 1. Find IDs of users who ALREADY applied
        const existingApplications = await Application.find({ jobId: req.params.id }).select('candidateId').lean();
        const appliedCandidateIds = existingApplications.map(app => app.candidateId.toString());

        // 2. Fetch candidates who HAVEN'T applied (Limit search for performance)
        const User = require('../models/User');
        const unappliedCandidates = await User.find({
            role: 'candidate',
            _id: { $nin: appliedCandidateIds },
            isBlocked: false
        })
            .select('name email profile skills bio')
            .limit(100)
            .lean();

        if (unappliedCandidates.length === 0) return res.json([]);

        const { calculateSimilarity, generateEmbedding } = require('../services/aiService');

        // 3. Prepare Job Embedding
        const jobText = `${job.title} ${job.description} ${(job.requirements || []).join(' ')}`;
        const jobEmbedding = await generateEmbedding(jobText);

        // 4. Score each candidate
        const scoredCandidates = await Promise.all(unappliedCandidates.map(async (candidate) => {
            const skills = candidate.skills || [];
            const profile = candidate.profile || {};
            const experience = profile.experience || [];

            const candidateText = `${skills.join(' ')} ${experience.map(e => (e.title || '') + ' ' + (e.company || '')).join(' ')}`;
            const candidateEmbedding = await generateEmbedding(candidateText);

            const score = calculateSimilarity(jobEmbedding, candidateEmbedding);

            // Identify matching skills
            const matchingSkills = skills.filter(skill =>
                (job.requirements || []).some(req => req.toLowerCase().includes(skill.toLowerCase()))
            );

            return {
                _id: candidate._id, // User ID
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                candidateSkills: skills,
                matchingSkills: matchingSkills,
                matchScore: Math.round(score),
                candidateId: candidate._id
            };
        }));

        // 5. Sort by score and take top 20
        const result = scoredCandidates
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 20);

        res.json(result);
    } catch (error) {
        console.error('Unapplied matches error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { createJob, getJobs, getMyJobs, getJobById, updateJob, deleteJob, getSmartMatches, applyToJob, getJobApplicants, analyzeJobMatch, getBestMatchesForJob, getUnappliedBestMatches };
