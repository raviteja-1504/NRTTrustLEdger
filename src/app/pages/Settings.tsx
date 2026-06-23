import { useState } from "react";
import BentoCard from "../components/BentoCard";
import { User, Lock, Building, Bell, CreditCard, Shield, Globe } from "lucide-react";
import { motion } from "motion/react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: Building },
    { id: 'roles', name: 'Roles & Permissions', icon: Shield },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-[#FAFAFA] min-h-screen font-['Inter',sans-serif] flex"
    >
      <div className="w-64 flex-shrink-0 mr-8">
        <h1 className="text-3xl font-semibold text-[#1A237E] mb-8">Settings</h1>
        
        <div className="flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#E0F2F1] text-[#00897B] font-semibold' 
                  : 'text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-[#00897B]' : 'text-gray-400'}`} />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-gray-600 text-lg">Manage your school preferences</p>
          <button className="bg-[#00897B] text-white px-6 py-2 rounded-lg hover:bg-[#00796B] transition-colors shadow-sm font-medium">
            Save Changes
          </button>
        </div>

        {activeTab === 'general' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BentoCard className="mb-6">
              <h2 className="text-xl font-semibold text-[#1A237E] mb-6">School Information</h2>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                  <input type="text" defaultValue="Excellence Academy" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00897B] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registration ID</label>
                  <input type="text" defaultValue="REG-2023-991" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00897B] focus:outline-none transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea defaultValue="123 Education Lane, Knowledge Park, City" rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00897B] focus:outline-none transition-all" />
                </div>
              </div>
            </BentoCard>

            <BentoCard>
              <h2 className="text-xl font-semibold text-[#1A237E] mb-6">Academic Year</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Academic Year</label>
                  <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00897B] focus:outline-none transition-all">
                    <option>2024-2025</option>
                    <option>2023-2024</option>
                    <option>2022-2023</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Terms/Semesters</label>
                  <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00897B] focus:outline-none transition-all">
                    <option>2 Semesters</option>
                    <option>3 Terms</option>
                    <option>4 Quarters</option>
                  </select>
                </div>
              </div>
            </BentoCard>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
