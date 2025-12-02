"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  LayoutDashboard, 
  Zap,
  GitBranch,
  FileText,
  ChevronRight,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { 
    label: "Home", 
    href: "/", 
    icon: Home,
    description: "Document processing"
  },
  { 
    label: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    description: "Document analytics"
  },
  { 
    label: "Version Control", 
    href: "/version", 
    icon: GitBranch,
    description: "Prompt history & versions"
  },
];

export default function Sidebar({ children }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const pathname = usePathname();

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 100); // Minimal delay for smooth exit
  };

  return (
    <div className="flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full h-screen overflow-hidden">
      {/* Sidebar */}
      <motion.div
        ref={sidebarRef}
        initial={{ width: 80 }}
        animate={{ width: isExpanded ? 280 : 80 }}
        transition={{ duration: 0.45, stiffness: 120, damping: 22 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex flex-col bg-slate-800/60 backdrop-blur-md border-r border-slate-700/60 shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50">
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              animate={{ scale: isExpanded ? 1 : 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Zap className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-40 transition-opacity duration-200"></div>
            </motion.div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.95 }}
                  transition={{ 
                    duration: 0.1,
                    ease: "easeOut",
                    delay: 0.1
                  }}
                  className="flex-1 min-w-0"
                >
                  <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent tracking-tight">
                    Doc Intelligence
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">AI Document Suite</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group mb-2 relative flex items-center rounded-xl border backdrop-blur-sm transition-all duration-120 transform",
                  "hover:scale-[1.02] hover:shadow-lg",
                  isExpanded ? "px-3 py-3" : "px-2 py-3 justify-center",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border-blue-500/40 shadow-lg shadow-blue-500/20"
                    : "text-slate-300 hover:text-white border-slate-600/30 hover:border-blue-400/30 hover:bg-slate-800/40"
                )}
                style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div 
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full shadow-lg shadow-blue-400/50"
                    layoutId="activeIndicator"
                  />
                )}
                
                {/* Icon */}
                <motion.div 
                  className={cn(
                    "relative rounded-lg transition-all duration-120",
                    isExpanded ? "p-2 mr-3" : "p-2",
                    isActive 
                      ? "bg-gradient-to-br from-blue-500/25 to-purple-500/25 shadow-lg shadow-blue-500/25" 
                      : "bg-slate-700/50 group-hover:bg-slate-700/70"
                  )}
                  animate={{
                    scale: isActive ? 1.05 : 1
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <Icon className={cn(
                    "transition-colors duration-120",
                    isActive ? "text-blue-300" : "text-slate-400 group-hover:text-slate-200",
                    isExpanded ? "w-4 h-4" : "w-5 h-5"
                  )} />
                </motion.div>
                
                {/* Text Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ 
                        duration: 0.35,
                        ease: "easeOut"
                      }}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center justify-between">
                        <motion.span 
                          className="text-sm font-semibold"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
                        >
                          {item.label}
                        </motion.span>
                        <ChevronRight className={cn(
                          "w-3 h-3 transition-all duration-120",
                          isActive 
                            ? "text-blue-300 translate-x-0.5" 
                            : "text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5"
                        )} />
                      </div>
                      <motion.p 
                        className={cn(
                          "text-xs mt-0.5 transition-colors duration-120 truncate",
                          isActive ? "text-blue-200/80" : "text-slate-500 group-hover:text-slate-400"
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.12, duration: 0.35, ease: "easeOut" }}
                      >
                        {item.description}
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/8 to-purple-500/8 opacity-0 group-hover:opacity-100 transition-opacity duration-120" />
              </Link>
            );
          })}
        </nav>

        {/* Stats Mini Card */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ 
                duration: 0.35,
                ease: "easeOut"
              }}
              className="mx-3 mb-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-slate-300">Online</span>
                </div>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/30">
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="expanded-footer"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-center space-y-2"
              >
                <div className="flex items-center justify-center space-x-2 text-xs">
                  <div className="flex space-x-1">
                    {[0, 0.1, 0.2].map((delay) => (
                      <motion.div
                        key={delay}
                        className="w-1 h-1 bg-blue-400 rounded-full"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-slate-400 font-medium">AI Powered</span>
                </div>
                <p className="text-xs text-slate-500">
                  &copy; {new Date().getFullYear()} Doc Intelligence
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex justify-center"
              >
                <Crown className="w-5 h-5 text-slate-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// Custom styles for smooth animations
const styles = `
@keyframes smooth-glow {
  0%, 100% {
    box-shadow: 
      0 0 20px rgba(59, 130, 246, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  50% {
    box-shadow: 
      0 0 25px rgba(59, 130, 246, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }
}

.smooth-glow {
  animation: smooth-glow 3s ease-in-out infinite;
}

* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}