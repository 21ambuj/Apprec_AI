
const Job = require('../models/Job');
const User = require('../models/User');
const { generateInterviewQuestion, evaluateInterviewAnswer } = require('../services/aiService');

// @desc    Start an AI Interview
// @route   POST /api/interview/start
// @access  Private (Candidate)
const startInterview = async (req, res) => {
    try {
        const { jobId } = req.body;
        if (!jobId) {
            return res.status(400).json({ message: 'Job ID is required to start an interview' });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Construct Candidate Profile Text safely
        const profile = req.user.profile || {};
        const experience = profile.experience || [];
        const skills = req.user.skills || [];

        const candidateText = `
        Name: ${req.user.name || 'Candidate'}
        Skills: ${skills.length > 0 ? skills.join(', ') : 'None listed'}
        Experience: ${experience.length > 0 ? experience.map(e => `${e.title || 'Role'} at ${e.company || 'Company'}`).join(' | ') : 'None listed'}
        `;

        // Construct Job Text
        const jobRequirements = job.requirements || [];
        const jobText = `
        Title: ${job.title || 'Job'}
        Company: ${job.company || 'Company'}
        Requirements: ${jobRequirements.length > 0 ? jobRequirements.join(', ') : 'None listed'}
        `;

        const aiResponse = await generateInterviewQuestion(jobText, candidateText);

        res.json({
            question: aiResponse.question,
            jobContext: jobText
        });
    } catch (error) {
        console.error("Start interview error:", error);
        res.status(500).json({ message: error.message || 'Failed to start interview' });
    }
};

// @desc    Submit an answer and get evaluation + next question
// @route   POST /api/interview/reply
// @access  Private (Candidate)
const replyToInterview = async (req, res) => {
    try {
        const { question, answer, jobContext } = req.body;

        if (!question || !answer || !jobContext) {
            return res.status(400).json({ message: 'Question, answer, and jobContext are required' });
        }

        const evaluation = await evaluateInterviewAnswer(question, answer, jobContext);

        res.json(evaluation);
    } catch (error) {
        console.error("Reply interview error:", error);
        res.status(500).json({ message: error.message || 'Failed to process reply' });
    }
};

module.exports = { startInterview, replyToInterview };
