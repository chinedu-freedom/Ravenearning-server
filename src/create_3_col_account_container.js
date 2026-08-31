import fs from 'fs';

const accountFile = 'C:\\Users\\Spark.DESKTOP-F75SGV0\\Desktop\\omni\\src\\app\\dashboard\\account\\page.jsx';

const pageJsx = `"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFetchData } from "@/hooks/useApi";
import { toast } from "sonner";
import {
  User,
  LogOut,
  ShieldCheck,
  Sparkles,
  Award,
  Wallet
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();

  // Fetch settings & current user profile
  const { data: settingsRes } = useFetchData("/settings", ["platform-settings"]);
  const settings = settingsRes?.settings || {};

  const { data: userRes } = useFetchData("/users/me", ["user-profile"]);
  const user = userRes?.user || {};

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    router.push("/auth/login");
  };

  const handleDownloadApp = () => {
    if (settings.app_download_link) {
      window.open(settings.app_download_link, "_blank");
    } else {
      toast.info("Official App download link will be available soon!");
    }
  };

  const formatAmount = (num) => {
    return Number(num || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const currencySymbol = settings.currency_symbol || "R";
  const tgGroupLink = settings.telegram_group || "https://t.me/+zem_hTJCVY4yY2E0";
  const tgSupportLink = settings.telegram_support || "https://t.me/ravenearning780";

  return (
    <div className="flex flex-col min-h-screen bg-[#070c14] text-white pb-24 font-sans">
      
      {/* Top Profile Header Banner */}
      <div className="relative bg-gradient-to-b from-[#101b2d] to-[#070c14] px-5 pt-8 pb-6 rounded-b-[30px] border-b border-white/5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3b82f6] to-[#60a5fa] p-0.5 shadow-md shadow-blue-500/20">
                <div className="w-full h-full bg-[#0d1527] rounded-[14px] flex items-center justify-center text-white overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} className="text-[#60a5fa]" />
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-[#070c14]" title="Verified User">
                <ShieldCheck size={12} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-black tracking-tight text-white/95">
                  {user.full_name || user.username || "Investor"}
                </h2>
                <span className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Award size={10} className="text-amber-400" />
                  VIP Member
                </span>
              </div>
              <p className="text-[12px] text-gray-400 font-mono mt-0.5">
                ID: {user.phone || user.email || user.id?.slice(0, 8) || "884920"}
              </p>
            </div>
          </div>
        </div>

        {/* User Balance Highlights */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-[#111c2e]/90 border border-white/10 rounded-[20px] p-4 shadow-sm relative overflow-hidden backdrop-blur-md">
            <div className="absolute -right-3 -bottom-3 text-blue-500/10 pointer-events-none">
              <Wallet size={70} />
            </div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Account Balance
            </span>
            <div className="text-[20px] font-black text-white font-mono flex items-baseline gap-1">
              <span className="text-[14px] text-blue-400 font-sans">{currencySymbol}</span>
              {formatAmount(user.balance || user.wallet_balance || 0)}
            </div>
          </div>

          <div className="bg-[#111c2e]/90 border border-white/10 rounded-[20px] p-4 shadow-sm relative overflow-hidden backdrop-blur-md">
            <div className="absolute -right-3 -bottom-3 text-emerald-500/10 pointer-events-none">
              <Sparkles size={70} />
            </div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Total Earnings
            </span>
            <div className="text-[20px] font-black text-emerald-400 font-mono flex items-baseline gap-1">
              <span className="text-[14px] text-emerald-500 font-sans">{currencySymbol}</span>
              {formatAmount(user.total_earnings || user.total_income || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Combined Grid Container (3 per row) */}
      <div className="px-5 mt-6 space-y-4 max-w-[480px] mx-auto w-full">

        <div className="bg-[#111827] rounded-[20px] p-4 border border-white/5 shadow-md grid grid-cols-3 gap-y-6 gap-x-2 items-center">

          {/* 1. Bind Account */}
          <Link
            href="/dashboard/account/bind"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-900/20 border border-white/5 flex items-center justify-center text-[#4f8cff] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#4f8cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <rect x="7" y="9" width="10" height="6" rx="1" />
                <path d="M7 12h10" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Bind Account
            </span>
          </Link>

          {/* 2. Balance Record */}
          <Link
            href="/dashboard/account/balance"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-900/20 border border-white/5 flex items-center justify-center text-[#4f8cff] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#4f8cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <line x1="8" y1="7" x2="16" y2="7" />
                <line x1="8" y1="11" x2="16" y2="11" />
                <line x1="8" y1="15" x2="13" y2="15" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Balance Record
            </span>
          </Link>

          {/* 3. Recharge Record */}
          <Link
            href="/dashboard/account/recharge"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-900/20 border border-white/5 flex items-center justify-center text-[#4f8cff] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#4f8cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <circle cx="17" cy="15" r="3.5" fill="#111827" stroke="currentColor" strokeWidth="1.5" />
                <path d="M15.5 13.5L18.5 16.5M18.5 16.5H16M18.5 16.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Recharge Record
            </span>
          </Link>

          {/* 4. Withdrawal Record */}
          <Link
            href="/dashboard/account/withdrawal"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-900/20 border border-white/5 flex items-center justify-center text-[#4f8cff] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#4f8cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <circle cx="17" cy="15" r="3.5" fill="#111827" stroke="currentColor" strokeWidth="1.5" />
                <path d="M15.5 16.5L18.5 13.5M18.5 13.5H16M18.5 13.5V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Withdrawal Record
            </span>
          </Link>

          {/* 5. Login Password */}
          <Link
            href="/dashboard/account/password"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-900/20 border border-white/5 flex items-center justify-center text-[#4f8cff] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#4f8cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Login Password
            </span>
          </Link>

          {/* 6. Withdrawal Password */}
          <Link
            href="/dashboard/account/withdrawal-password"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-[12px] bg-sky-900/20 border border-white/5 flex items-center justify-center text-[#38bdf8] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#38bdf8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-2-2l2 2M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Withdrawal Password
            </span>
          </Link>

          {/* 7. About us */}
          <Link
            href="/dashboard/about"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-900/20 border border-white/5 flex items-center justify-center text-[#4f8cff] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#4f8cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2L2 7h20L12 2z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              About us
            </span>
          </Link>

          {/* 8. Download App */}
          <button
            type="button"
            onClick={handleDownloadApp}
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center w-full"
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-900/20 border border-white/5 flex items-center justify-center text-[#4f8cff] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#4f8cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Download App
            </span>
          </button>

          {/* 9. Telegram Support */}
          <a
            href={tgSupportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center w-full"
          >
            <div className="w-10 h-10 rounded-[12px] bg-blue-900/20 border border-white/5 flex items-center justify-center text-[#4f8cff] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#4f8cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Telegram Support
            </span>
          </a>

          {/* 10. Telegram Group */}
          <a
            href={tgGroupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center px-1 py-1 group hover:opacity-80 transition-opacity cursor-pointer text-center w-full"
          >
            <div className="w-10 h-10 rounded-[12px] bg-sky-900/20 border border-white/5 flex items-center justify-center text-[#38bdf8] group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#38bdf8]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.97 9.28c-.15.66-.54.82-1.09.51l-3.02-2.22-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.08 5.61-5.07c.24-.22-.05-.34-.38-.13l-6.93 4.36-2.98-.93c-.65-.2-.66-.65.14-.96l11.64-4.48c.54-.2 1.01.12.84 1.01z"/>
              </svg>
            </div>
            <span className="text-[11px] font-medium text-white/90 mt-2 leading-tight">
              Telegram Group
            </span>
          </a>

        </div>

        {/* Log out Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-[0.99] rounded-[14px] py-3.5 px-4 flex items-center justify-center gap-2 font-bold text-[14px] shadow-sm transition-all cursor-pointer mt-2"
        >
          <LogOut size={16} className="text-red-400" strokeWidth={2.2} />
          <span>Log out</span>
        </button>

      </div>

    </div>
  );
}
`;

fs.writeFileSync(accountFile, pageJsx, 'utf8');
console.log('✅ Successfully created 3-column single container Account page!');
