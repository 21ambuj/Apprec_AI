import { Link } from 'react-router-dom';
import { Search, Upload, Target, CheckCircle, ChevronRight, Briefcase, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Landing = () => {
    // Animation variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Hero Section with Modern Blob Background */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 rounded-full blur-[100px] -z-10" />

                <div className="container mx-auto px-6 text-center relative z-10">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                        className="max-w-4xl mx-auto"
                    >
                        <motion.div variants={fadeInUp} className="inline-block mb-6 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-sm shadow-sm">
                            ✨ Revolutionizing the Job Search
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 tracking-tight">
                            Find the Perfect Job with <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Apprec AI</span>
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Stop getting lost in the resume black hole. Our AI-powered platform matches your true potential with the right opportunities, instantly.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link to="/signup" className="group flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95">
                                Get Started Free
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
                            </Link>
                            <Link to="/jobs" className="group flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-full font-bold text-lg hover:border-slate-300 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/50 transition-all active:scale-95">
                                <Search className="text-slate-400 group-hover:text-blue-500 transition-colors" size={20} />
                                Browse Jobs
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-white relative">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">Why Choose Apprec AI?</h2>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto">Experience a smarter, faster, and more intuitive way to land your dream job with state-of-the-art tools.</p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                    >
                        <FeatureCard
                            icon={<Zap size={32} className="text-amber-500" />}
                            title="AI-Powered Matching"
                            description="Our advanced algorithms analyze your skills and experience to find jobs that are a perfect fit."
                            gradient="from-amber-50/50 to-orange-50/50"
                            iconBg="bg-amber-100"
                        />
                        <FeatureCard
                            icon={<Upload size={32} className="text-blue-500" />}
                            title="Smart Resume Parsing"
                            description="Simply upload your resume. We extract the details and build your precise profile automatically."
                            gradient="from-blue-50/50 to-indigo-50/50"
                            iconBg="bg-blue-100"
                        />
                        <FeatureCard
                            icon={<ShieldCheck size={32} className="text-emerald-500" />}
                            title="Verified Recruiters"
                            description="Connect directly with verified employers and recruiters from top companies securely."
                            gradient="from-emerald-50/50 to-teal-50/50"
                            iconBg="bg-emerald-100"
                        />
                    </motion.div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        className="text-center mb-24"
                    >
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-6">How It Works</h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">Three simple steps to your next big career move.</p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                        className="flex flex-col md:flex-row justify-center items-center gap-12 lg:gap-8 max-w-5xl mx-auto"
                    >
                        <Step number="1" title="Create Profile" description="Sign up in seconds and securely upload your resume." />
                        <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-slate-800 via-slate-500 to-slate-800 mx-4"></div>
                        <Step number="2" title="Get Matched" description="Our AI instantly finds the best job matches for your skills." />
                        <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-slate-800 via-slate-500 to-slate-800 mx-4"></div>
                        <Step number="3" title="Apply & Hired" description="Apply with one click and seamlessly track your status." />
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-center px-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="max-w-3xl mx-auto relative z-10"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Ready to Accelerate Your Career?</h2>
                    <Link to="/signup" className="inline-flex items-center justify-center gap-3 bg-white text-blue-600 px-10 py-5 rounded-full font-bold text-xl hover:bg-slate-50 hover:shadow-2xl hover:shadow-blue-900/50 transition-all active:scale-95">
                        <Briefcase size={24} className="text-blue-500" />
                        Create Your Free Account
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex justify-center items-center gap-2 mb-6 text-white text-2xl font-bold">
                        <Target className="text-blue-500" /> Apprec AI
                    </div>
                    <p>&copy; {new Date().getFullYear()} Apprec AI. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, description, gradient, iconBg }) => {
    const cardVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 30 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <motion.div
            variants={cardVariants}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            className={`p-10 rounded-3xl bg-gradient-to-br ${gradient} border border-white/60 shadow-xl shadow-slate-200/50 backdrop-blur-sm relative overflow-hidden group`}
        >
            <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
            <p className="text-slate-600 leading-relaxed text-lg">{description}</p>
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${iconBg} opacity-20 blur-2xl group-hover:scale-150 transition-transform`} />
        </motion.div>
    );
};

const Step = ({ number, title, description }) => {
    const stepVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <motion.div
            variants={stepVariants}
            className="text-center relative group w-full md:w-64"
        >
            <div className="w-24 h-24 bg-slate-800 border-2 border-slate-700 text-blue-400 rounded-full flex items-center justify-center font-bold text-4xl mx-auto mb-8 shadow-2xl shadow-blue-900/40 group-hover:border-blue-500 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                {number}
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
            <p className="text-slate-400 text-lg leading-relaxed">{description}</p>
        </motion.div>
    );
};

export default Landing;
