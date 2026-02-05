import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, 
  ShieldCheck, 
  Cpu, 
  FileText, 
  Github, 
  Mail, 
  BookOpen, 
  CheckCircle2, 
  XCircle,
  Menu,       // Added for mobile header
  X,          // Added for mobile header
  LogIn       // Added for login button
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import EduvergeLogo from '../assets/smartVerg.jpeg'; 
import OnlyLogo from '../assets/onlylogo.jpeg';       

export default function EduvergeHomePage() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  
  // -- Header State --
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    // Handle Scroll for Header Styling
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Helper for smooth scroll
  const scrollToSection = (id: string) => {
  const headerOffset = 90; // height of your fixed header

  const element = document.getElementById(id);

  if (!element) return;

  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition =
    elementPosition + window.pageYOffset - headerOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });

  // close menu AFTER scroll starts
  setTimeout(() => setMobileMenuOpen(false), 300);
};


  const navLinks = [
    { name: "Features", id: "features" },
    { name: "Tech Stack", id: "tech-stack" },
    { name: "Contact", id: "contact" },
  ];

  // Features based on Project Scope
  const features = [
    {
      title: "Smart Assessments",
      icon: Cpu,
      desc: "Automated MCQ grading, manual theory evaluation, and secure timer-based exams.",
      color: "from-indigo-500 to-purple-600",
      delay: 0.1,
    },
    {
      title: "Course Materials",
      icon: BookOpen,
      desc: "Centralized distribution of PDFs and documents organized by subject and semester.",
      color: "from-blue-500 to-cyan-600",
      delay: 0.2,
    },
    {
      title: "Real-time Analytics",
      icon: BarChart3,
      desc: "Instant performance feedback, student progress tracking, and submission insights.",
      color: "from-orange-500 to-red-500",
      delay: 0.3,
    },
    {
      title: "Secure & Scalable",
      icon: ShieldCheck,
      desc: "Role-based access (Admin/Faculty/Student) with Supabase Auth and RLS policies.",
      color: "from-emerald-500 to-teal-600",
      delay: 0.4,
    },
  ];

  // Tech Stack from Feasibility Study
  const techStack = [
  {
    name: "React 18",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    url: "https://react.dev",
  },
  {
    name: "TypeScript",
    color: "bg-blue-50 text-blue-600 border-blue-200",
    url: "https://www.typescriptlang.org/docs/",
  },
  {
    name: "Supabase",
    color: "bg-green-100 text-green-700 border-green-200",
    url: "https://supabase.com/docs",
  },
  {
    name: "Tailwind CSS",
    color: "bg-cyan-100 text-cyan-700 border-cyan-200",
    url: "https://tailwindcss.com/docs",
  },
  {
    name: "PostgreSQL",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    url: "https://www.postgresql.org/docs/",
  },
  {
    name: "Vite",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    url: "https://vitejs.dev/guide/",
  },
];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden font-sans text-slate-800 selection:bg-indigo-200">
      
      {/* --- DYNAMIC HEADER --- */}
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/80 backdrop-blur-md shadow-lg py-3" : "bg-transparent py-5"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            {/* Logo Section */}
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
               <div className="w-10 h-10 overflow-hidden rounded-lg bg-white shadow-sm flex items-center justify-center">
                 <img src={OnlyLogo} alt="Eduverge" className="w-8 h-8 object-contain" />
               </div>
               <span className={`text-xl font-bold tracking-tight ${isScrolled ? "text-slate-800" : "text-slate-800"}`}>
                 EDU<span className="text-indigo-600">VERGE</span>
               </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button 
                  key={link.name}
                  onClick={() => scrollToSection(link.id)}
                  className="text-slate-600 hover:text-indigo-600 font-medium text-sm transition-colors"
                >
                  {link.name}
                </button>
              ))}
             <button
  onClick={() => navigate("/login")}
  className="relative group overflow-hidden flex items-center gap-2 px-6 py-3 rounded-full
  bg-gradient-to-r from-green-500/60 to-purple-500/60
  backdrop-blur-md border border-white/20
  text-white text-sm font-bold
  shadow-[0_8px_32px_rgba(31,38,135,0.37)]
  hover:shadow-[0_0_30px_rgba(255,255,255,0.45)]
  transition-all duration-300 ease-out
  hover:-translate-y-1"
>

  {/* Moving light sweep */}
  <span
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent
    translate-x-[-120%] group-hover:translate-x-[120%]
    transition-transform duration-700"
  />

  {/* Edge glow */}
  <span className="absolute inset-0 rounded-full ring-1 ring-white/30" />

  {/* Button Content */}
  <span className="relative z-10 flex items-center gap-2">
    <LogIn size={16} />
    Login
  </span>

</button>


            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-slate-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-4">
                {navLinks.map((link) => (
                  <button 
                    key={link.name}
                    onClick={() => scrollToSection(link.id)}
                    className="text-left text-slate-600 font-medium py-2 hover:text-indigo-600"
                  >
                    {link.name}
                  </button>
                ))}
                <div className="h-px bg-slate-100 my-2" />
               <button
  onClick={() => navigate("/login")}
  className="relative group overflow-hidden 
    flex items-center justify-center gap-2 
    px-8 py-3.5           /* ← adjusted padding – feels more balanced */
    min-w-[140px]          /* ← helps prevent it from shrinking too much */
    rounded-full
    bg-gradient-to-r from-green-500/60 to-purple-500/60
    backdrop-blur-md 
    border border-white/20
    text-white text-sm font-bold
    shadow-[0_8px_32px_rgba(31,38,135,0.37)]
    hover:shadow-[0_0_30px_rgba(255,255,255,0.45)]
    transition-all duration-300 ease-out
    hover:-translate-y-1
    active:scale-95           /* ← small bonus touch */
  "
>
  {/* Moving light sweep */}
  <span
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent
      translate-x-[-120%] group-hover:translate-x-[120%]
      transition-transform duration-700 ease-in-out"
  />

  {/* Edge glow */}
  <span className="absolute inset-0 rounded-full ring-1 ring-white/30" />

  {/* Button Content – guaranteed centered */}
  <span className="relative z-10 flex items-center justify-center gap-2">
    <LogIn size={16} />
    Login
  </span>
</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-3xl" />
        <img
          src={OnlyLogo}
          alt="Watermark"
          className="absolute -top-20 -right-20 w-[500px] opacity-[0.03] rotate-12 pointer-events-none"
        />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 px-6 text-center z-10">
        <AnimatePresence>
          {isVisible && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center justify-center mb-8"
              >
                <div className="bg-white p-4 rounded-3xl shadow-lg mb-6 shadow-indigo-100">
                    <img src={EduvergeLogo} alt="EduVerge Logo" className="w-24 h-24 object-contain" />
                </div>
                
                  <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-6 font-sans bg-gradient-to-r from-zinc-900 via-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
  EDU<span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">VERGE</span>
</h1>


                <div className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm tracking-wide mb-6">
                  SMART ONLINE LEARNING & ASSESSMENT PLATFORM
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium"
              >
                Digitizing education by replacing manual paper-based processes with a 
                <span className="text-indigo-600 font-bold"> unified, automated platform</span> for 
                assessments, course management, and real-time analytics.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-4"
              >
                <button
                  onClick={() => navigate("/login")}
                  className="px-8 py-4 rounded-full bg-slate-900 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-slate-800 transition-all hover:-translate-y-1"
                >
                  Get Started
                </button>
                <button 
                   onClick={() => scrollToSection('features')}
                   className="px-8 py-4 rounded-full bg-white text-slate-700 font-bold text-lg shadow-lg hover:shadow-xl border border-slate-100 transition-all hover:-translate-y-1"
                >
                  Learn More
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </section>

      {/* --- PROBLEM VS SOLUTION (The Need) --- */}
      <section className="py-20 px-6 relative z-10 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* The Old Way */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-red-100 shadow-lg"
            >
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <XCircle className="text-red-500 w-8 h-8" />
                    Traditional System
                </h3>
                <ul className="space-y-4 text-slate-600 text-lg">
                    <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2.5" />
                        Manual assessment creation & grading is time-consuming.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2.5" />
                        Paper-based systems are not scalable.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2.5" />
                        No real-time performance analytics for students.
                    </li>
                </ul>
            </motion.div>

            {/* The EduVerge Way */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-2xl relative"
            >
                <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider">
                    The Solution
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <CheckCircle2 className="text-green-500 w-8 h-8" />
                    EduVerge Platform
                </h3>
                <ul className="space-y-4 text-slate-600 text-lg">
                    <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2.5" />
                        <strong>Automated Grading:</strong> Instant results for MCQs.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2.5" />
                        <strong>Centralized:</strong> Course materials & tests in one place.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2.5" />
                        <strong>Accessible:</strong> 24/7 access from anywhere.
                    </li>
                </ul>
            </motion.div>
        </div>
      </section>

      {/* --- CORE MODULES GRID --- */}
      <section id="features" className="px-6 py-20 relative z-10 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900">System Modules</h2>
                <p className="text-slate-500 mt-2">Comprehensive tools for Faculty, Students, and Admins</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => {
                const Icon = f.icon;
                return (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: f.delay }}
                    viewport={{ once: true }}
                    className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-50"
                >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-6 text-white shadow-lg`}>
                       <Icon size={32} />
                    </div>
                    <h3 className="font-bold text-xl text-slate-800 mb-3">{f.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">{f.desc}</p>
                </motion.div>
                );
            })}
            </div>
        </div>
      </section>

      {/* --- TECH STACK --- */}
      <section id="tech-stack" className="py-20 px-6 text-center max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-400 uppercase tracking-widest mb-10">Built With Modern Tech</h2>
        <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech, i) => (
               <a
  key={i}
  href={tech.url}
  target="_blank"
  rel="noopener noreferrer"
  className={`px-6 py-2 rounded-full font-semibold border ${tech.color} shadow-sm
    cursor-pointer hover:scale-105 transition-transform`}
>
  {tech.name}
</a>

            ))}
        </div>
      </section>

      {/* --- CONTACT & SUPPORT --- */}
      <footer id="contact" className="bg-slate-900 text-slate-300 py-16 px-6 relative z-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
            
            {/* Brand & Copyright */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">E</div>
                    <span className="text-2xl font-bold text-white tracking-tight">EDUVERGE</span>
                </div>
                <p className="mb-6 opacity-80 max-w-md">
                    A comprehensive Online Learning & Assessment Platform designed to streamline the educational process for institutions.
                </p>
                <div className="text-sm opacity-50">
                    © 2026 Eduverge. All rights reserved.<br/>
                    Document Signed: January 22, 2026
                </div>
            </div>

            {/* Contact Info */}
            <div className="md:text-right">
                <h3 className="text-white font-bold text-lg mb-6">Contact & Support</h3>
                <div className="space-y-4 flex flex-col md:items-end">
                    
                    <a href="mailto:tsushmanth@gmail.com" className="flex items-center gap-3 hover:text-white transition-colors group">
                        <span className="group-hover:underline">tsushmanth@gmail.com</span>
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                            <Mail size={18} />
                        </div>
                    </a>

                    <a href="https://github.com/Sushu459/Eduverge20" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                        <span className="group-hover:underline">github.com/Sushu459/Eduverge20</span>
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                            <Github size={18} />
                        </div>
                    </a>

                    <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-white transition-colors group">
                        <span className="group-hover:underline">docs.eduverge.com</span>
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400">
                            <FileText size={18} />
                        </div>
                    </a>

                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}