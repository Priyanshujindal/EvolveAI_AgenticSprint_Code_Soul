import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

export default function Home() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4"/>
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
          <path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
      ),
      title: "Smart Health Monitoring",
      description: "Advanced AI algorithms analyze your daily health patterns, detecting early warning signs and providing personalized insights to help you maintain optimal wellness.",
      link: "/daily-checkin",
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
      benefits: ["Pattern Recognition", "Early Detection", "Personalized Insights"],
      stats: "95% accuracy"
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
          <path d="M9 9h6"/>
        </svg>
      ),
      title: "Intelligent Report Analysis",
      description: "Revolutionary OCR technology combined with medical AI instantly processes lab results, imaging reports, and clinical notes, delivering clear, actionable health summaries.",
      link: "/upload-report",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
      benefits: ["OCR Technology", "Instant Analysis", "Clear Summaries"],
      stats: "50K+ reports processed"
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M18 17V9"/>
          <path d="M13 17V5"/>
          <path d="M8 17v-3"/>
          <circle cx="6" cy="19" r="2"/>
          <circle cx="11" cy="19" r="2"/>
          <circle cx="16" cy="19" r="2"/>
        </svg>
      ),
      title: "Comprehensive Health Analytics",
      description: "Transform complex health data into intuitive visualizations. Track trends, monitor progress, and make data-driven decisions about your health journey with interactive dashboards.",
      link: "/dashboard",
      color: "from-purple-500 to-pink-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
      benefits: ["Data Visualization", "Trend Analysis", "Progress Tracking"],
      stats: "Real-time insights"
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <path d="M13 8H7"/>
          <path d="M17 12H7"/>
          <path d="M17 16H7"/>
          <circle cx="19" cy="8" r="2"/>
        </svg>
      ),
      title: "AI-Powered Health Assistant",
      description: "24/7 intelligent health companion powered by advanced medical AI. Get instant, reliable answers to health questions, symptom analysis, and personalized health guidance.",
      link: "/chatbot",
      color: "from-orange-500 to-red-600",
      bgColor: "bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20",
      benefits: ["24/7 Support", "Medical AI", "Instant Answers"],
      stats: "99.9% uptime"
    }
  ];

  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "50K+", label: "Reports Analyzed" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "AI Support" }
  ];

  const whyChooseUs = [
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      ),
      title: "Privacy & Security Focus",
      description: "We take privacy and security seriously and build with strong safeguards to protect your data.",
      highlight: "Privacy-first design"
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      title: "Fast, Responsive Experience",
      description: "Optimized for quick interactions and smooth performance.",
      highlight: "Performance tuned"
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: "Clinician-Informed Design",
      description: "Built with feedback from healthcare professionals to improve clarity and usefulness.",
      highlight: "Clinician input"
    }
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-12 lg:py-20">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-gradient-to-r from-brand-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto px-4 text-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
              Your AI-Powered
              <span className="block bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent">
                Health Companion
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 mb-6 max-w-3xl mx-auto leading-relaxed">
              Transform your healthcare experience with intelligent insights, proactive monitoring, and personalized guidance powered by cutting-edge AI technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <NavLink to="/dashboard">
                  <Button size="lg" className="px-8 py-4 text-lg">
                    Go to Dashboard
                  </Button>
                </NavLink>
              ) : (
                <>
                  <NavLink to="/signup">
                    <Button size="lg" className="px-8 py-4 text-lg">
                      Get Started Free
                    </Button>
                  </NavLink>
                  <NavLink to="/login">
                    <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                      Sign In
                    </Button>
                  </NavLink>
                </>
              )}
            </div>
            {/* Highlights */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/></svg>
                Personalized insights
              </div>
              <div className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/></svg>
                Plain-language summaries
              </div>
              <div className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                Works on any device
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="pb-8 -mt-4">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <NavLink to="/daily-checkin" className="group block rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <div className="flex items-center gap-3">
                <span className="inline-flex p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/></svg>
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Daily Check‑in</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Log how you feel in 30 seconds</div>
                </div>
              </div>
            </NavLink>
            <NavLink to="/upload-report" className="group block rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <div className="flex items-center gap-3">
                <span className="inline-flex p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Upload Report</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Get a clear summary quickly</div>
                </div>
              </div>
            </NavLink>
            <NavLink to="/chatbot" className="group block rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <div className="flex items-center gap-3">
                <span className="inline-flex p-2 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">AI Assistant</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Ask questions any time</div>
                </div>
              </div>
            </NavLink>
          </div>
        </div>
      </section>

      {/* Recent Activity & Health Insights */}
      <section className="py-12 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
                <NavLink to="/dashboard" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                  View all
                </NavLink>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Daily check-in completed</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">2 hours ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Lab report analyzed</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Yesterday</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">AI chat session</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">3 days ago</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Health Insights Preview */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Health Insights</h3>
                <NavLink to="/dashboard" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                  View details
                </NavLink>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Wellness Score</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">85/100</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Good overall health</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Trend Analysis</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Energy levels improving over the past week</div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Recommendation</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">Consider increasing water intake based on recent patterns</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Guide */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Get Started in 3 Steps</h2>
            <p className="text-slate-600 dark:text-slate-300">Simple steps to begin your health journey</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-brand-500 to-blue-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Complete Your Profile</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Set up your health preferences and goals</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-brand-500 to-blue-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Start Daily Check-ins</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Log your daily wellness in just 30 seconds</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-brand-500 to-blue-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Upload Your Reports</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Get AI-powered insights from your medical data</p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className={`text-center transition-all duration-700 delay-${index * 100} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="text-4xl lg:text-5xl font-bold text-brand-600 dark:text-brand-400 mb-2">
                  {stat.number}
                </div>
                <div className="text-slate-600 dark:text-slate-300 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Powerful Features for
              <span className="block text-brand-600 dark:text-brand-400">Better Health</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Discover how our AI-powered platform can help you take control of your health with intelligent insights and personalized care.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, index) => (
              <NavLink
                key={index}
                to={feature.link}
                aria-label={`${feature.title} - learn more`}
                className={({ isActive }) =>
                  `group relative block p-5 rounded-3xl border ${isActive ? 'border-brand-300' : 'border-slate-200 dark:border-slate-800'} ${feature.bgColor} hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 overflow-hidden`
                }
              >
                {/* Gradient border glow on hover */}
                <div className={`pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-transparent group-hover:ring-brand-300/40 transition-[ring] duration-500`}></div>

                {/* Background gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Icon with enhanced styling */}
                <div className={`relative inline-flex p-2.5 rounded-2xl bg-gradient-to-r ${feature.color} text-white mb-3 group-hover:scale-105 group-hover:rotate-1 motion-reduce:transform-none transition-all duration-300 shadow`}>
                  {feature.icon}
                </div>
                
                {/* Content */}
                <div className="relative">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-3 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                  
                  {/* Benefits list */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <span
                          key={benefitIndex}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${feature.color} text-white/95 shadow-sm`}
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* CTA with enhanced styling */}
                  <div className="flex items-center text-brand-600 dark:text-brand-400 font-semibold text-sm group-hover:translate-x-2 transition-transform duration-300">
                    Explore Feature
                    <svg className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/>
                      <path d="M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Health Sphere Section */}
      <section className="py-16 bg-gradient-to-r from-brand-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Why Choose Health Sphere?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Built with cutting-edge technology and medical expertise to deliver the most advanced AI-powered healthcare experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {whyChooseUs.map((item, index) => (
              <div key={index} className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 p-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-blue-500 text-white group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                      {item.title}
                    </h3>
                    <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-brand-500 to-blue-500 text-white shadow-sm">
                      {item.highlight}
                    </div>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                  {item.description}
                </p>
              </div>
            ))}
      </div>

          {/* Additional trust indicators */}
          <div className="mt-16 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-8 p-6 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                </svg>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Privacy-first</span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Security Best Practices</span>
              </div>
              <div className="hidden sm:block w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Clinician-informed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Removed duplicate bottom CTA section to avoid double buttons */}
    </div>
  );
}


