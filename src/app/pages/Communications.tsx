import { useState } from "react";
import BentoCard from "../components/BentoCard";
import { MessageSquare, Phone, Mail, Send, Search, Bell } from "lucide-react";
import { motion } from "motion/react";

export default function Communications() {
  const [activeTab, setActiveTab] = useState('messages');

  const stats = [
    { label: "Total Sent", value: "24.5k", icon: Send, color: "text-[#00897B]", bg: "bg-[#E0F2F1]" },
    { label: "Open Rate", value: "68%", icon: Mail, color: "text-[#1A237E]", bg: "bg-[#E8EAF6]" },
    { label: "Failed", value: "12", icon: Bell, color: "text-[#EF5350]", bg: "bg-[#FFEBEE]" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-[#FAFAFA] min-h-screen font-['Inter',sans-serif]"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#1A237E] mb-2">Communications</h1>
          <p className="text-gray-600">Broadcast messages, emails, and SMS to parents and staff</p>
        </div>
        <button className="bg-[#00897B] text-white px-6 py-2 rounded-lg hover:bg-[#00796B] transition-colors shadow-sm font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <BentoCard key={i} className="hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </BentoCard>
        ))}
      </div>

      <BentoCard className="min-h-[400px]">
        <div className="flex border-b border-gray-200 mb-6">
          <button 
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'messages' ? 'border-[#1A237E] text-[#1A237E]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            onClick={() => setActiveTab('messages')}
          >
            Recent Messages
          </button>
          <button 
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'templates' ? 'border-[#1A237E] text-[#1A237E]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search communications..."
              className="w-full pl-10 pr-4 py-2 bg-[#F5F5F5] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00897B] transition-shadow"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">Filter</button>
          </div>
        </div>

        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-[#1A237E] mb-2">No recent messages</h3>
          <p className="text-gray-500 mb-6">You haven't sent any broadcasts recently.</p>
          <button className="text-[#00897B] font-medium hover:underline">Create a new message</button>
        </div>
      </BentoCard>
    </motion.div>
  );
}
