
import React, { useMemo, useState } from 'react';
import { MovementLog, Resident } from '../types';
import { Calendar, TrendingUp, Users, Clock, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';

interface AnalyticsDashboardProps {
  logs: MovementLog[];
  residents: Resident[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ logs, residents }) => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');

  const filteredLogs = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === '7d') cutoff.setDate(now.getDate() - 7);
    else if (dateRange === '30d') cutoff.setDate(now.getDate() - 30);
    else return logs;
    
    return logs.filter(log => new Date(log.timestamp) >= cutoff);
  }, [logs, dateRange]);

  const stats = useMemo(() => {
    const ins = filteredLogs.filter(l => l.type === 'CHECK_IN').length;
    const outs = filteredLogs.filter(l => l.type === 'CHECK_OUT').length;
    
    // Calculate Average Stay (Time between a check-in and the NEXT check-out for the same resident)
    let totalStayMs = 0;
    let stayCount = 0;
    
    // Simple heuristic: For each checkout, find the most recent previous check-in
    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    sortedLogs.forEach((log, index) => {
      if (log.type === 'CHECK_OUT') {
        // Look backwards for this resident's last check-in
        for (let i = index - 1; i >= 0; i--) {
          if (sortedLogs[i].residentId === log.residentId && sortedLogs[i].type === 'CHECK_IN') {
            totalStayMs += (new Date(log.timestamp).getTime() - new Date(sortedLogs[i].timestamp).getTime());
            stayCount++;
            break;
          }
        }
      }
    });

    const avgStayHours = stayCount > 0 ? (totalStayMs / (1000 * 60 * 60 * stayCount)).toFixed(1) : '0';
    const occupancyRate = residents.length > 0 ? (residents.filter(r => r.isCheckedIn).length / residents.length * 100).toFixed(0) : '0';

    return { ins, outs, avgStayHours, occupancyRate };
  }, [filteredLogs, residents, logs]);

  // Group activity by date for chart
  const chartData = useMemo(() => {
    const groups: Record<string, { in: number; out: number }> = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!groups[date]) groups[date] = { in: 0, out: 0 };
      if (log.type === 'CHECK_IN') groups[date].in++;
      else groups[date].out++;
    });
    return Object.entries(groups).slice(-7); // Last 7 unique days in filtered set
  }, [filteredLogs]);

  const maxVal = Math.max(...chartData.flatMap(d => [d[1].in, d[1].out]), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Filter size={18} />
          <span className="font-medium">Report Range:</span>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {(['7d', '30d', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${dateRange === r ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {r === '7d' ? 'Past Week' : r === '30d' ? 'Past Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Users size={24} />
            </div>
            <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">Live</span>
          </div>
          <h4 className="text-gray-500 text-sm font-medium">Occupancy Rate</h4>
          <p className="text-3xl font-bold text-gray-900">{stats.occupancyRate}%</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <ArrowDownLeft size={24} />
            </div>
          </div>
          <h4 className="text-gray-500 text-sm font-medium">Total Check-Ins</h4>
          <p className="text-3xl font-bold text-gray-900">{stats.ins}</p>
          <p className="text-xs text-gray-400 mt-1">In selected period</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <ArrowUpRight size={24} />
            </div>
          </div>
          <h4 className="text-gray-500 text-sm font-medium">Total Check-Outs</h4>
          <p className="text-3xl font-bold text-gray-900">{stats.outs}</p>
          <p className="text-xs text-gray-400 mt-1">In selected period</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Clock size={24} />
            </div>
          </div>
          <h4 className="text-gray-500 text-sm font-medium">Avg. Visit Duration</h4>
          <p className="text-3xl font-bold text-gray-900">{stats.avgStayHours}h</p>
          <p className="text-xs text-gray-400 mt-1">Time spent in building</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Occupancy Status - Now First */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600" />
            Current Status
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-green-700">Checked In</span>
                <span className="text-lg font-black text-green-800">{residents.filter(r => r.isCheckedIn).length}</span>
              </div>
              <div className="w-full bg-green-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-600 h-full rounded-full" 
                  style={{ width: `${stats.occupancyRate}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-amber-700">Out of Building</span>
                <span className="text-lg font-black text-amber-800">{residents.filter(r => !r.isCheckedIn).length}</span>
              </div>
              <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full" 
                  style={{ width: `${100 - Number(stats.occupancyRate)}%` }}
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Recent Activity</h4>
              <div className="space-y-3">
                {filteredLogs.slice(0, 3).map(log => (
                  <div key={log.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.type === 'CHECK_IN' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{log.residentName}</p>
                      <p className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart - Now Second */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" />
              Movement Trends
            </h3>
            <div className="flex gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-500 rounded-sm" /> Check-In</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-400 rounded-sm" /> Check-Out</div>
            </div>
          </div>
          
          <div className="h-64 flex items-end gap-4">
            {chartData.length > 0 ? chartData.map(([date, vals]) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex justify-center items-end gap-1 h-full">
                  <div 
                    className="w-full max-w-[20px] bg-indigo-500 rounded-t-md transition-all group-hover:bg-indigo-600"
                    style={{ height: `${(vals.in / maxVal) * 100}%` }}
                    title={`In: ${vals.in}`}
                  />
                  <div 
                    className="w-full max-w-[20px] bg-amber-400 rounded-t-md transition-all group-hover:bg-amber-500"
                    style={{ height: `${(vals.out / maxVal) * 100}%` }}
                    title={`Out: ${vals.out}`}
                  />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{date}</span>
              </div>
            )) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 italic">
                Insufficient data for trend visualization
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
