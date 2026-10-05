import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, ShieldCheck, Settings, Database, 
  BarChart3, FileSpreadsheet, PlusCircle, RefreshCw, 
  Menu, ChevronLeft, Search, LogOut, ClipboardList, TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  // Modal states from your live app mapping
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Modern navigation breakdown matching your operational demands
  const navigation = {
    core: [
      { id: 'dashboard', name: 'Dashboard Overview', icon: LayoutDashboard },
      { id: 'farmers-dir', name: 'Farmers Directory', icon: Users },
    ],
    admin: [
      { id: 'user-mgmt', name: 'User Management', icon: ShieldCheck },
      { id: 'system-settings', name: 'Pricing & Settings', icon: Settings },
    ],
    reports: [
      { id: 'all-intakes', name: 'All Milk Intakes', icon: ClipboardList },
      { id: 'financial-rep', name: 'Payout Analytics', icon: TrendingUp },
      { id: 'export-center', name: 'Data Export Center', icon: FileSpreadsheet },
    ]
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`bg-slate-900 text-slate-200 transition-all duration-300 flex flex-col justify-between ${isSidebarOpen ? 'w-64' : 'w-20'} shrink-0 min-h-screen border-r border-slate-800`}>
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-wider text-white">KONDIKI</span>
                <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-tight">Milk Collection Hub</span>
              </div>
            )}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 mx-auto"
            >
              {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Nav Categories */}
          <nav className="p-3 space-y-6">
            {/* Core Operational Section */}
            <div>
              {isSidebarOpen && <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Operations</p>}
              {navigation.core.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  <item.icon size={18} />
                  {isSidebarOpen && <span>{item.name}</span>}
                </button>
              ))}
            </div>

            {/* FULL ADMIN MANAGEMENT MENU */}
            <div>
              {isSidebarOpen && <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Admin Management</p>}
              <div className="space-y-1">
                {navigation.admin.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenu(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                  >
                    <item.icon size={18} />
                    {isSidebarOpen && <span>{item.name}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* FULL REPORTS MENU */}
            <div>
              {isSidebarOpen && <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Reports & Analytics</p>}
              <div className="space-y-1">
                {navigation.reports.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenu(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeMenu === item.id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                  >
                    <item.icon size={18} />
                    {isSidebarOpen && <span>{item.name}</span>}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Dynamic Logged-in Meta Footer */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xs text-white">KM</div>
              <div>
                <p className="text-xs font-semibold text-white leading-none">System Admin</p>
                <span className="text-[10px] text-slate-500">Kondiki Manager</span>
              </div>
            </div>
          )}
          <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 mx-auto">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* DASHBOARD ACTION MAIN CANVAS */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP COMPLIANCE HEADER BAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-xs z-10">
          <div className="flex items-center gap-3 w-80 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Search size={16} className="text-slate-400" />
            <input type="text" placeholder="Search files, logs, or metrics..." className="bg-transparent border-none outline-none text-xs w-full" />
          </div>
          
          {/* Quick Intake Trigger Buttons */}
          <div className="flex items-center gap-3">
            <button onClick={() => setShowIntakeModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
              <PlusCircle size={14} /> New Intake Log
            </button>
            <button onClick={() => setShowFarmerModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
              Register Farmer
            </button>
          </div>
        </header>

        {/* WORKSPACE VIEW RENDERING */}
        <main className="p-6 overflow-y-auto flex-1">
          <div className="max-w-7xl mx-auto">
            
            {/* View Title */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-slate-900 capitalize">{activeMenu.replace('-', ' ')} Workspace</h1>
                <p className="text-xs text-slate-500">Live operational ledger data for Kondiki Portal.</p>
              </div>
              {activeMenu === 'dashboard' && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <RefreshCw size={12} /> Sync Feed
                </button>
              )}
            </div>

            {/* 1. OVERVIEW DASHBOARD VIEW */}
            {activeMenu === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Matrix cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Volume Collected</span>
                    <h2 className="text-3xl font-bold text-slate-900 mt-1">— <span className="text-lg font-medium text-slate-500">Liters</span></h2>
                  </div>
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Market Price</span>
                    <h2 className="text-3xl font-bold text-slate-900 mt-1">800 <span className="text-lg font-medium text-slate-500">Tsh / L</span></h2>
                  </div>
                </div>

                {/* Recent Intake Logs Section */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-slate-800">Recent Intakes Pipeline</h3>
                  </div>
                  <div className="p-8 text-center text-xs text-slate-400">Loading live intakes feed...</div>
                </div>
              </div>
            )}

            {/* 2. FARMERS DIRECTORY VIEW */}
            {activeMenu === 'farmers-dir' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800">Registered Cooperative Members</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Farmer ID</th>
                        <th className="px-5 py-3">Full Name</th>
                        <th className="px-5 py-3">Phone Line</th>
                        <th className="px-5 py-3">Zone Section</th>
                        <th className="px-5 py-3">Security Passkey</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-5 py-4 font-mono font-semibold text-blue-600">#F-1002</td>
                        <td className="px-5 py-4 text-slate-900 font-medium">Juma Benjamin Mosa</td>
                        <td className="px-5 py-4">+255 712 000 000</td>
                        <td className="px-5 py-4">Machame Kaskazini</td>
                        <td className="px-5 py-4 font-mono text-slate-400">••••</td>
                        <td className="px-5 py-4 text-right">
                          <button className="text-blue-600 font-semibold hover:underline">Edit Entry</button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. FULL ADMIN: USER ROLES MANAGEMENT */}
            {activeMenu === 'user-mgmt' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800">System Operators & Credentials</h3>
                  <button onClick={() => setShowUserModal(true)} className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium">
                    + New System User
                  </button>
                </div>
                <div className="p-8 text-center text-xs text-slate-400">Loading privileged account list...</div>
              </div>
            )}

            {/* 4. FULL ADMIN: PRICE & SETTINGS CONFIGURATION */}
            {activeMenu === 'system-settings' && (
              <div className="max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="font-bold text-sm text-slate-800 mb-4">Base Payout Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Standard Base Price per Liter (Tsh)</label>
                    <div className="flex gap-2">
                      <input type="number" defaultValue={800} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0">Update Rate</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. REPORTS: ALL INTAKES LEDGER */}
            {activeMenu === 'all-intakes' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-sm text-slate-800">Master Intakes Historical Register</h3>
                  <div className="flex gap-2">
                    <button className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium hover:bg-slate-50">Download CSV</button>
                    <button className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium hover:bg-slate-50">Export to Excel</button>
                  </div>
                </div>
                <div className="p-8 text-center text-xs text-slate-400">No logs found within active date range query.</div>
              </div>
            )}

            {/* 6. REPORTS: FINANCIAL & PAYOUT METRICS */}
            {activeMenu === 'financial-rep' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-xl">
                  <span className="text-xs font-medium text-slate-400">Projected Monthly Total Payout</span>
                  <h4 className="text-xl font-bold text-slate-900 mt-1">0.00 Tsh</h4>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl">
                  <span className="text-xs font-medium text-slate-400">Quality Index (Avg Fat %)</span>
                  <h4 className="text-xl font-bold text-slate-900 mt-1">3.50 %</h4>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl">
                  <span className="text-xs font-medium text-slate-400">Quality Index (Avg SNF %)</span>
                  <h4 className="text-xl font-bold text-slate-900 mt-1">8.50 %</h4>
                </div>
              </div>
            )}

            {/* 7. REPORTS: DATA EXPORT LAYER */}
            {activeMenu === 'export-center' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-xl">
                <h3 className="font-bold text-sm text-slate-800 mb-2">Audit Compliance Export Center</h3>
                <p className="text-xs text-slate-500 mb-4">Generate compiled reports for delivery schedules or banking file distributions.</p>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Consolidated Farmer Payout Matrix (Bulk Payroll)</p>
                    <span className="text-[10px] text-slate-400">Aggregated volumes multiplied by baseline pricing matrix rules.</span>
                  </div>
                  <button className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium">Export .XLSX</button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* BACKEND-COMPATIBLE MODALS FROM YOUR DOM STRUCTURE */}
      {showIntakeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-900">Log New Milk Volume Collection</h3>
              <button onClick={() => setShowIntakeModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">×</button>
            </div>
            <form className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Select Registered Farmer</label>
                <select className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 outline-none"><option>Select from directory...</option></select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Volume (Liters)</label>
                  <input type="number" className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Fat %</label>
                  <input type="number" defaultValue="3.5" className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">SNF %</label>
                  <input type="number" defaultValue="8.5" className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 outline-none" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowIntakeModal(false)} className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-md font-semibold">Save Intake</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
