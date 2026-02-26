# 🚀 AI-Powered Smart Recruitment Platform

A cutting-edge, professional recruitment ecosystem designed to bridge the gap between talented candidates and top-tier recruiters using Artificial Intelligence.

## ✨ Key Features

### 🔍 For Candidates
- **AI Smart Matching**: Get instantly matched with jobs based on your skills and experience using high-dimensional vector embeddings.
- **Resume Parsing**: Upload your CV and let our AI extract and organize your professional details automatically.
- **Smart Analytics**: Receive a "Match Score" for every job, showing you exactly how well you fit the requirements.
- **Skill Practice**: Interactive interview preparation and skill validation modules.
- **Saved Jobs**: Keep track of opportunities you're interested in for later.
- **Real-time Chat**: Connect directly with recruiters through an integrated messaging system.

### 🏢 For Recruiters
- **Effortless Job Posting**: Post detailed job descriptions with specific requirements and salary ranges.
- **Candidate Vetting**: View "Best Matches" for your postings, sorted by AI-calculated relevance.
- **Verification Badge**: Gain candidate trust with the "Verified Recruiter" blue checkmark (granted by system admins).
- **Application Management**: Move candidates through the pipeline with easy Hire/Reject controls.
- **Company Branding**: Showcase your company profile, website, and industry details.

### 🛡️ For Administrators
- **Centralized Dashboard**: Complete control over users, jobs, and applications.
- **System Integrity**: Block/Unblock users and manage platform security.
- **Recruiter Verification**: Manually vet and verify recruiters to prevent fake job postings and ensure platform safety.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Tailwind CSS, Framer Motion (for smooth animations), Lucide React (icons).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose).
- **Artificial Intelligence**: Vector Embeddings for smart similarity matching.
- **Real-time**: Socket.io for instant messaging.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (Atlas or local)

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/21ambuj/Apprec_AI.git
   ```

2. **Setup Server**:
   ```bash
   cd server
   npm install
   # Create a .env file with MONGODB_URI and JWT_SECRET
   npm start
   ```

3. **Setup Client**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

---

## 🛡️ Security & Trust
We prioritize safety with:
- **CORS Protection**: Secure cross-origin resource sharing.
- **Rate Limiting**: Protection against brute-force and AI abuse.
- **Recruiter Vetting**: Manual admin verification of all business accounts.

---

*Built with ❤️ for the next generation of hiring.*
