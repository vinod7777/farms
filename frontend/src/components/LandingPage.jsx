import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Interactive3DScene from './Interactive3DScene';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Reusable animation variants for framer-motion
  const fadeUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="relative w-full bg-slate-900 overflow-x-hidden font-sans selection:bg-emerald-200">
      
      {/* 3D Background - Fixed */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <Interactive3DScene />
      </div>

      {/* Foreground Scrollable Content */}
      <div id="landing-content" className="relative z-10 w-full">
        
        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-md border-b border-white/20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <img src="Logo-SF.webp" alt="Sahasra Bharat" className="h-8 sm:h-10 w-auto object-contain" />
              <span className="text-sm sm:text-xl font-bold tracking-tight text-slate-900 drop-shadow-sm leading-tight">Sahasra Bharat</span>
            </div>
            
            {/* Added Navbar Links */}
            <div className="hidden lg:flex items-center gap-5 text-sm font-bold text-slate-800">
              <a href="#about" className="hover:text-emerald-600 transition-colors">About Us</a>
              <a href="#verticals" className="hover:text-emerald-600 transition-colors">Services</a>
              <a href="#why-choose-us" className="hover:text-emerald-600 transition-colors">Why Us</a>
              <a href="#procedure" className="hover:text-emerald-600 transition-colors">Procedure</a>
              <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
              <a href="#contact" className="hover:text-emerald-600 transition-colors">Contact</a>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="text-slate-800 text-xs sm:text-sm font-bold hover:text-emerald-700 transition-colors hidden sm:block"
              >
                Login
              </button>
              <button 
                onClick={() => navigate('/visit')}
                className="text-emerald-700 text-xs sm:text-sm font-bold hover:text-emerald-500 transition-colors hidden sm:block border-2 border-emerald-600 rounded-full px-3 py-1 hover:bg-emerald-50"
              >
                Visit Farm
              </button>
              <button 
                onClick={() => navigate('/login?register=true')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold py-1.5 px-3 sm:py-2 sm:px-5 rounded-full shadow-lg shadow-emerald-600/50 transition-transform transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                Register
              </button>
              
              {/* Hamburger Icon */}
              <button 
                className="lg:hidden p-1 text-slate-800 hover:text-emerald-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-xl absolute w-full left-0 flex flex-col items-center py-6 gap-4 font-bold text-slate-800 animate-fadeIn z-50">
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">About Us</a>
              <a href="#verticals" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Services</a>
              <a href="#why-choose-us" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Why Us</a>
              <a href="#procedure" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Procedure</a>
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Features</a>
              <a href="#contact" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors mb-2">Contact</a>
              
              <div className="w-3/4 h-px bg-slate-200 mb-2"></div>
              
              <button onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }} className="text-slate-800 hover:text-emerald-700 transition-colors text-sm">
                Login
              </button>
              <button onClick={() => { setIsMobileMenuOpen(false); navigate('/visit'); }} className="text-emerald-700 hover:text-emerald-500 transition-colors border-2 border-emerald-600 rounded-full px-6 py-1.5 hover:bg-emerald-50 text-sm mt-1">
                Visit Farm
              </button>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="min-h-screen flex items-center px-6 pt-32 pb-20 pointer-events-none">
          <motion.div 
            initial="hidden" animate="visible" variants={fadeUp}
            className="max-w-7xl mx-auto w-full flex flex-col items-start gap-8 pointer-events-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 rounded-full text-xs font-bold tracking-wide text-emerald-900 uppercase shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Enterprise Agroforestry Platform
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] max-w-4xl drop-shadow-xl">
              Transforming Agriculture Through <span className="text-emerald-700 bg-emerald-100/50 px-2 rounded-lg">Innovation</span>
            </h1>
            
            <div className="bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-xl max-w-2xl">
              <p className="text-xl font-bold text-slate-900 mb-2">
                Hormonal Plantation for all Living Creatures of the Universe & Soil Enrichment
              </p>
              <p className="text-lg text-slate-800 leading-relaxed font-medium">
                We empower rural farmers with data-driven tools and digital access, seeking to improve the lives of small and marginal farmers while unlocking an era of prosperity and inclusivity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <button onClick={() => navigate('/login?register=true')} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg py-4 px-8 rounded-full shadow-xl shadow-emerald-600/40 transition-transform transform hover:-translate-y-1">
                Start Mapping Your Land
              </button>
              <button onClick={() => navigate('/login')} className="w-full sm:w-auto bg-white/80 backdrop-blur hover:bg-white text-slate-900 border border-slate-200 font-bold text-lg py-4 px-8 rounded-full shadow-lg transition-colors">
                Access Dashboard
              </button>
            </div>
          </motion.div>
        </section>

        {/* Space for camera flying animation */}
        <div className="h-[40vh]"></div>

        {/* About Us */}
        <section id="about" className="py-24 px-6 pointer-events-none">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="max-w-7xl mx-auto bg-white/90 backdrop-blur-xl rounded-[3rem] p-12 border border-white shadow-2xl pointer-events-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              {/* Left Image Column */}
              <div className="bg-[#f9fdfa] rounded-[2rem] p-8 flex items-center justify-center border border-emerald-50">
                <img src="Logo-SF.webp" alt="Sahasra Bharat Farms Logo" className="w-full max-w-sm object-contain drop-shadow-xl" />
              </div>
              
              {/* Right Content Column */}
              <div>
                <div className="inline-block px-4 py-1.5 bg-emerald-100/50 text-emerald-600 font-bold text-xs uppercase tracking-widest rounded-full mb-6 border border-emerald-200/50">
                  About Us
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-[1.1] mb-6">
                  Transforming Agriculture <br/>
                  <span className="text-emerald-600">Through Innovation</span>
                </h2>
                
                <p className="text-slate-700 font-medium leading-relaxed mb-6">
                  Founded by a dedicated and aspiring team, our company is dedicated to transforming India's agricultural landscape through technology, transparency, and sustainable innovation.
                </p>
                <p className="text-slate-700 font-medium leading-relaxed mb-8">
                  We believe that empowering rural farmers with data-driven tools and digital access can unlock an era of prosperity, inclusivity, and global competitiveness for Indian agriculture.
                </p>

                <div className="flex flex-wrap gap-4 mb-10">
                  <span className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 shadow-sm">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    Tech-Driven
                  </span>
                  <span className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 shadow-sm">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Transparent
                  </span>
                  <span className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 shadow-sm">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Sustainable
                  </span>
                </div>

                <button onClick={() => navigate('/login')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-12 rounded-xl shadow-lg shadow-emerald-600/30 transition-transform transform hover:-translate-y-1">
                  Read More
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Our Verticals */}
        <section id="verticals" className="py-24 px-6 pointer-events-none">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="max-w-7xl mx-auto pointer-events-auto"
          >
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-block px-4 py-1.5 bg-emerald-100/80 text-emerald-700 font-bold text-xs uppercase tracking-widest rounded-full mb-6 border border-emerald-200">
                OUR SERVICES
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 drop-shadow-sm">Our Verticals</h2>
              <p className="text-lg text-slate-600 font-medium">
                Driving sustainable agriculture through innovation, training, and collaboration.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-xl text-center flex flex-col items-center group">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Farmlands</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Structured, tech-driven farm management models that empower landowners and agri experts.
                </p>
              </motion.div>

              {/* Card 2 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-xl text-center flex flex-col items-center group">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-300">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Farm Innovations</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Zero budget natural farming, organic farming, and hydroponics - smart farming practices and IoT Integrations.
                </p>
              </motion.div>

              {/* Card 3 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-xl text-center flex flex-col items-center group">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Farm Products</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Fresh, traceable, and sustainably produced harvest from our partner farms.
                </p>
              </motion.div>

              {/* Card 4 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-xl text-center flex flex-col items-center group">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-300">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Farm Tours</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Hands-on experiences showcasing innovation, sustainability, and natural living.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Why Choose Us */}
        <section id="why-choose-us" className="py-24 px-6 pointer-events-none">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="max-w-7xl mx-auto pointer-events-auto"
          >
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-block px-4 py-1.5 bg-emerald-100/80 text-emerald-700 font-bold text-xs uppercase tracking-widest rounded-full mb-6 border border-emerald-200">
                WHY CHOOSE US
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 drop-shadow-sm">Why Choose Sahasra Bharat Farms</h2>
              <p className="text-lg text-slate-600 font-medium leading-relaxed">
                We combine modern agronomy, transparent operations, and local training to deliver measurable outcomes for landowners and partners.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {/* Card 1 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 text-center flex flex-col items-center group transition-all">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-8 text-emerald-600 transition-transform group-hover:scale-110 duration-300">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M5 9h4v11H5zm7-4h4v15h-4zm7 8h4v7h-4z"/></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Data-Driven Decisions</h3>
                <p className="text-slate-600 font-medium leading-relaxed">
                  We monitor crop health, soil metrics and weather patterns to optimize yields and reduce risk using actionable dashboards.
                </p>
              </motion.div>

              {/* Card 2 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 text-center flex flex-col items-center group transition-all">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-8 text-emerald-600 transition-transform group-hover:scale-110 duration-300">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Transparent Operations</h3>
                <p className="text-slate-600 font-medium leading-relaxed">
                  Clear contracts, traceability, and regular reporting ensure landowners see exactly how resources are used and returns tracked.
                </p>
              </motion.div>

              {/* Card 3 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 text-center flex flex-col items-center group transition-all">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-8 text-emerald-600 transition-transform group-hover:scale-110 duration-300">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Training & Local Capacity</h3>
                <p className="text-slate-600 font-medium leading-relaxed">
                  On-ground training, continuous upskilling and local expert support ensure sustainable adoption of modern practices.
                </p>
              </motion.div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => navigate('/login?register=true')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-10 rounded-full shadow-lg shadow-emerald-600/30 transition-transform transform hover:-translate-y-1">
                Explore Farmlands
              </button>
              <button onClick={() => navigate('/visit')} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-4 px-10 rounded-full shadow-sm transition-transform transform hover:-translate-y-1">
                Request a Visit
              </button>
            </div>
          </motion.div>
        </section>

        {/* Our Procedure & Farmer Relations */}
        <section id="procedure" className="py-24 px-6 pointer-events-none">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="max-w-7xl mx-auto pointer-events-auto"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-12 border border-white shadow-2xl">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Empowering Our Farmers</h2>
                <p className="text-xl text-slate-700 font-medium">We believe true agricultural success stems from treating our farming partners with the utmost respect and fairness.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">Fair & Transparent Contracts</h4>
                      <p className="text-slate-600">Every farmer receives a crystal-clear digital lease. We ensure mutually beneficial terms with absolute traceability from day one.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">Guaranteed Payouts</h4>
                      <p className="text-slate-600">Financial security is paramount. Our automated systems schedule and distribute payouts seamlessly, protecting farmers against market volatility.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg></div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">Expert Agronomy Training</h4>
                      <p className="text-slate-600">We provide on-ground training, continuous upskilling, and local expert support to ensure sustainable adoption of modern agroforestry practices.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">👨‍🌾</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4 relative z-10">Our Procedure</h3>
                  <ul className="space-y-4 relative z-10">
                    <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">1</span> <span className="font-medium text-slate-700">Digital Onboarding & KYC</span></li>
                    <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">2</span> <span className="font-medium text-slate-700">GPS Land Mapping & Soil Testing</span></li>
                    <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">3</span> <span className="font-medium text-slate-700">Tree Inventory Registration</span></li>
                    <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">4</span> <span className="font-medium text-slate-700">Lease Agreement & Payout Setup</span></li>
                    <li className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">5</span> <span className="font-medium text-slate-700">Continuous Monitoring & Training</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Space for camera fly over farm */}
        <div className="h-[20vh]"></div>

        {/* Deep Dive into Portal Features */}
        <section id="features" className="py-24 px-6 relative pointer-events-none">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="max-w-7xl mx-auto"
          >
            <motion.div variants={fadeUp} className="text-center max-w-3xl mx-auto mb-16 bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-white/50">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Deep Dive: The User Portal</h2>
              <p className="text-xl text-slate-800 font-medium">Explore the comprehensive features designed to make farm management seamless and transparent.</p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pointer-events-auto">
              <FeatureCard icon="🗺️" title="GPS Polygon Mapping" desc="Trace the exact boundaries of your farm by physically walking the perimeter with your mobile device. The system automatically calculates total acreage and registers the digital spatial data securely." />
              <FeatureCard icon="🌳" title="Detailed Tree Inventory" desc="Upload photos and details of every species planted. The admin dashboard cross-verifies uploads to ensure absolute accuracy of the forest assets." />
              <FeatureCard icon="📈" title="Analytics Dashboards" desc="Visualize crop health, soil metrics, and weather patterns. Our intuitive charts and graphs help you make data-driven decisions to optimize yields." />
              <FeatureCard icon="📝" title="Digital Lease Management" desc="Access your contracts at any time. The portal acts as a transparent CRM, tracking active leases, renewal dates, and legal documentation without the paperwork." />
              <FeatureCard icon="💳" title="Automated Payout Tracking" desc="Monitor scheduled payments, historical transactions, and pending material costs in a centralized financial ledger." />
              <FeatureCard icon="🔔" title="Real-Time Notifications" desc="Stay updated with alerts for upcoming farm tours, scheduled soil testing, payout processing, and agronomy training workshops." />
            </div>
          </motion.div>
        </section>

        {/* Space for camera pan to sky */}
        <div className="h-[20vh]"></div>

        {/* Core Values & Stats */}
        <section className="py-24 px-6 pointer-events-none">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="max-w-7xl mx-auto"
          >
            <motion.div variants={fadeUp} className="text-center max-w-3xl mx-auto mb-16 bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-white/50">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Our Network & Values</h2>
              <p className="text-xl text-slate-800 font-medium">Built on integrity, we focus on long-term value creation across the nation.</p>
            </motion.div>
            
            <div className="bg-emerald-500/90 backdrop-blur-xl rounded-[3rem] p-12 border border-emerald-400/50 shadow-2xl pointer-events-auto mb-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x divide-emerald-300">
                <motion.div whileHover={{ scale: 1.05 }} className="text-center md:px-8 cursor-pointer">
                  <div className="text-6xl font-extrabold text-white mb-2 drop-shadow-md">9</div>
                  <div className="text-xl font-bold uppercase tracking-widest text-emerald-900 mb-2">States Operating</div>
                  <p className="text-sm font-medium text-emerald-50">Telangana, Andhra Pradesh, Karnataka, Maharashtra, Odisha, Madhya Pradesh...</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="text-center md:px-8 pt-8 md:pt-0 cursor-pointer">
                  <div className="text-6xl font-extrabold text-white mb-2 drop-shadow-md">150k+</div>
                  <div className="text-xl font-bold uppercase tracking-widest text-emerald-900 mb-2">Farmers Network</div>
                  <p className="text-sm font-medium text-emerald-50">Empowering thousands of farmers through strategic partnerships.</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="text-center md:px-8 pt-8 md:pt-0 cursor-pointer">
                  <div className="text-6xl font-extrabold text-white mb-2 drop-shadow-md">68k+</div>
                  <div className="text-xl font-bold uppercase tracking-widest text-emerald-900 mb-2">Hectares ARR</div>
                  <p className="text-sm font-medium text-emerald-50">Afforestation, Reforestation, and Revegetation across landscapes.</p>
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pointer-events-auto">
              <ValueCard icon="🛡️" title="Integrity" desc="Conduct business ethically and transparently." />
              <ValueCard icon="🤝" title="Collaboration" desc="Work together with partners and communities." />
              <ValueCard icon="⭐" title="Excellence" desc="Aim for unwavering quality in all endeavors." />
              <ValueCard icon="🌱" title="Responsibility" desc="Improving community well-being and development." />
              <ValueCard icon="⚖️" title="Fair Practices" desc="Commit to fair competition and strict policies." />
              <ValueCard icon="💡" title="Innovation" desc="Encourage creativity and new environmental solutions." />
            </div>
          </motion.div>
        </section>

        {/* Visit Farm Section */}
        <section id="visit-farm" className="py-24 px-6 relative pointer-events-none">
          <div className="absolute inset-0 bg-emerald-900/10 skew-y-3 transform origin-bottom-right -z-10"></div>
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="max-w-7xl mx-auto pointer-events-auto"
          >
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                  Experience Nature.<br/>
                  <span className="text-emerald-600">Visit Our Farms.</span>
                </h2>
                <p className="text-lg text-slate-700 font-medium mb-8 leading-relaxed">
                  Step away from the city and immerse yourself in the lush greenery of Sahasra Bharat farms. 
                  Book a visit to explore sustainable agriculture firsthand and see the difference we make.
                </p>
                <button 
                  onClick={() => navigate('/visit')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-emerald-500/30 transition-transform transform hover:-translate-y-1 flex items-center gap-2"
                >
                  Book Your Visit Today <span>→</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <img src="farmvisit.jpeg" alt="Farm Visit" className="w-full h-64 object-cover rounded-3xl shadow-xl transform translate-y-8" />
                <img src="farmvisit2.jpeg" alt="Farm Visit 2" className="w-full h-64 object-cover rounded-3xl shadow-xl" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 px-6 pointer-events-none">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="max-w-5xl mx-auto bg-white/90 backdrop-blur-xl rounded-[3rem] p-12 border border-white shadow-2xl pointer-events-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Get In Touch</h2>
              <p className="text-lg text-slate-600">Have questions about our agroforestry programs or the portal? Drop us a message.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-xl">📧</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Email Us</h4>
                    <p className="text-emerald-600 font-medium">info@sahasrabharatfarms.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-xl">📞</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Call Us</h4>
                    <p className="text-emerald-600 font-medium">+91 8977955776</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-xl">📍</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Headquarters</h4>
                    <p className="text-slate-600">Serving 9 states across India.</p>
                  </div>
                </div>
              </div>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                  <input type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Message</label>
                  <textarea rows="4" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="How can we help you?"></textarea>
                </div>
                <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-colors">
                  Send Message
                </button>
              </form>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900/95 backdrop-blur-xl pt-20 pb-12 border-t border-slate-800 text-slate-400 pointer-events-auto">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="md:col-span-1">
                <img src="Logo-SF.webp" alt="Sahasra Bharat" className="h-16 w-auto object-contain mb-6 drop-shadow-xl" />
                <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Sahasra Bharat</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">Empowering Farmers. Cultivating the Future through sustainable agroforestry and technology.</p>
              </div>
              
              <div>
                <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Quick Links</h4>
                <ul className="space-y-4 text-sm font-medium">
                  <li><a href="#about" className="hover:text-emerald-400 transition-colors">About Us</a></li>
                  <li><a href="#verticals" className="hover:text-emerald-400 transition-colors">Our Verticals</a></li>
                  <li><a href="#why-choose-us" className="hover:text-emerald-400 transition-colors">Why Choose Us</a></li>
                  <li><a href="#procedure" className="hover:text-emerald-400 transition-colors">Our Procedure</a></li>
                  <li><a href="#features" className="hover:text-emerald-400 transition-colors">Portal Features</a></li>
                  <li><a href="#contact" className="hover:text-emerald-400 transition-colors">Contact Support</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Legal</h4>
                <ul className="space-y-4 text-sm font-medium">
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Farmer Agreement</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Cookie Policy</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Portal Access</h4>
                <ul className="space-y-4 text-sm font-medium">
                  <li><button onClick={() => navigate('/login')} className="hover:text-emerald-400 transition-colors">Log In Dashboard</button></li>
                  <li><button onClick={() => navigate('/login?register=true')} className="hover:text-emerald-400 transition-colors text-emerald-500">Register New Farm</button></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm opacity-60 font-medium">© {new Date().getFullYear()} Sahasra Bharat Agroforestry. All rights reserved.</p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors text-sm font-bold">in</a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors text-sm font-bold">tw</a>
                <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors text-sm font-bold">fb</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } }} 
      whileHover={{ y: -12, scale: 1.03, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }} 
      className="bg-gradient-to-br from-white/95 to-white/70 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/60 shadow-2xl shadow-slate-200/50 cursor-pointer group transition-all duration-300"
    >
      <div className="text-4xl mb-8 bg-gradient-to-br from-emerald-50 to-emerald-100 w-20 h-20 flex items-center justify-center rounded-3xl border border-emerald-200 shadow-inner group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <h3 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">{title}</h3>
      <p className="text-slate-600 font-medium leading-relaxed text-lg">{desc}</p>
    </motion.div>
  );
}

function ValueCard({ icon, title, desc }) {
  return (
    <motion.div 
      variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }} 
      whileHover={{ y: -8, scale: 1.02 }} 
      className="p-10 rounded-[2.5rem] bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 shadow-2xl shadow-slate-900/50 pointer-events-auto cursor-pointer group"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-emerald-900/50 mb-8 group-hover:rotate-6 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-300 font-medium leading-relaxed">{desc}</p>
    </motion.div>
  );
}

