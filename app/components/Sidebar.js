"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  LayoutDashboard, 
  Zap,
  ChevronRight,
  FileText
} from "lucide-react";

const navItems = [
  { 
    name: "Home", 
    href: "/", 
    icon: Home,
    description: "Welcome overview"
  },
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    description: "Document analytics"
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Custom animations */}
      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      <aside className="hidden md:flex md:flex-col w-64 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 shadow-2xl md:fixed md:top-0 md:bottom-0 md:left-0 z-50 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
        </div>
        
        {/* Header Section */}
        <div className="relative px-6 py-8 border-b border-slate-700/50">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl animate-glow group-hover:animate-float transition-all duration-500">
                <Zap className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-40 transition-opacity duration-500"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent tracking-tight">
              Document Intelligence
              </h1>
              <p className="text-sm text-slate-400 mt-1">AI Document Suite</p>
            </div>
          </Link>
          
          {/* Stats Mini Card */}
          <div className="mt-6 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-slate-300">Online</span>
              </div>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="relative flex-1 px-3 py-6 space-y-2">
          {navItems.map((item, index) => {
            const isActive =
              pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "group relative flex items-center px-3 py-4 rounded-xl",
                  "border backdrop-blur-sm transition-all duration-300 transform",
                  "hover:scale-[1.02] hover:shadow-lg",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-white border-blue-500/40 shadow-lg shadow-blue-500/20 scale-[1.02]"
                    : "text-slate-300 hover:text-white border-slate-600/30 hover:border-slate-500/50 hover:bg-slate-800/30",
                ].join(" ")}
                style={{ 
                  animationDelay: `${index * 150}ms`,
                  animation: 'slideInLeft 0.6s ease-out both'
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-10 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full shadow-lg shadow-blue-400/50"></div>
                )}
                
                {/* Icon with gradient background */}
                <div className={[
                  "relative p-2 rounded-lg transition-all duration-300 mr-3",
                  "group-hover:shadow-lg",
                  isActive 
                    ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 shadow-lg shadow-blue-500/25" 
                    : "bg-slate-700/50 group-hover:bg-slate-700/70"
                ].join(" ")}>
                  <Icon className={[
                    "w-4 h-4 transition-all duration-300",
                    isActive ? "text-blue-300" : "text-slate-400 group-hover:text-slate-200"
                  ].join(" ")} />
                  
                  {/* Icon glow effect */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg bg-blue-500/20 blur-sm"></div>
                  )}
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{item.name}</span>
                    <ChevronRight className={[
                      "w-3 h-3 transition-all duration-300",
                      isActive 
                        ? "text-blue-300 translate-x-0.5" 
                        : "text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5"
                    ].join(" ")} />
                  </div>
                  <p className={[
                    "text-xs mt-0.5 transition-colors duration-300 truncate",
                    isActive ? "text-blue-200/70" : "text-slate-500 group-hover:text-slate-400"
                  ].join(" ")}>
                    {item.description}
                  </p>
                </div>

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Subtle shine effect on active */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="relative px-6 py-6 border-t border-slate-700/30">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-xs">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
              <span className="text-slate-400 font-medium">AI Powered</span>
            </div>
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} Document Intelligence
            </p>
          </div>
        </div>
      </aside>

      {/* Spacer for main content */}
      <div className="hidden md:block md:w-64"></div>
    </>
  );
}