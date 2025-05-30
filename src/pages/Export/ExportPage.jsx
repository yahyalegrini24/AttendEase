/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/Supabase';
import { useAuth } from '../../hooks/useAuth';
import { Download, Users, BookOpen, Calendar, School, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ExportPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});

  // Organize sessions by year and semester
  const organizedSessions = sessions.reduce((acc, session) => {
    const year = session.yearName || 'Unknown Year';
    const semester = `Semester ${session.semester}`;
    
    if (!acc[year]) {
      acc[year] = {};
    }
    
    if (!acc[year][semester]) {
      acc[year][semester] = [];
    }
    
    acc[year][semester].push(session);
    return acc;
  }, {});

  // Filter sessions based on selected semester
  const filteredSessions = Object.entries(organizedSessions).reduce((acc, [year, semesters]) => {
    acc[year] = {};
    
    Object.entries(semesters).forEach(([semester, sessions]) => {
      if (selectedSemester === 'All' || semester === `Semester ${selectedSemester}`) {
        acc[year][semester] = sessions;
      }
    });
    
    return acc;
  }, {});

  const fetchTeacherSessions = useCallback(async () => {
    if (!user?.teacherId) return [];

    try {
      const { data, error } = await supabase
        .from('Session_structure')
        .select(`
          moduleId,
          groupId,
          Module:moduleId (
            moduleId,
            moduleName,
            SemesterId,
            SchoolYear:yearId (
              yearId,
              yearName
            )
          ),
          Group:groupId (
            groupId,
            groupName,
            group_path,
            Section:sectionId (
              sectionId,
              sectionName,
              SchoolYear:yearId (
                yearId,
                yearName,
                Degree:degreeId (
                  degreeId,
                  degreeName
                )
              )
            )
          )
        `)
        .eq('teacherId', user.teacherId);
      if (error) throw error;

      return data.map(session => ({
        sessionId: session.Session_structure_id,
        moduleId: session.moduleId,
        moduleName: session.Module?.moduleName || "Unknown Module",
        semester: session.Module?.SemesterId || "1",
        yearName: session.Module?.SchoolYear?.yearName || "Unknown Year",
        groupId: session.groupId,
        groupName: session.Group?.groupName || "Unknown Group",
        filePath: session.Group?.group_path,
        degreeName: session.Group?.Section?.SchoolYear?.Degree?.degreeName || "Unknown Degree",
        sectionName: session.Group?.Section?.sectionName || "Unknown Section"
      }));
    } catch (error) {
      console.error("Error fetching teacher sessions:", error);
      return [];
    }
  }, [user?.teacherId]);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const sessions = await fetchTeacherSessions();
      setSessions(sessions);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchTeacherSessions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleYear = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const toggleSemester = (year, semester) => {
    setExpandedSemesters(prev => ({
      ...prev,
      [`${year}-${semester}`]: !prev[`${year}-${semester}`]
    }));
  };

  const handleDownload = (session) => {
    console.log("Downloading materials for:", session.moduleName, session.groupName);
    const confirmDownload = window.confirm(
      `Download materials for ${session.moduleName} - ${session.groupName}?`
    );
    
    if (confirmDownload) {
      initiateDownload(session);
    }
  };

  const initiateDownload = async (session) => {
    console.log("Download successful");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Course Materials Export</h1>
            <p className="text-gray-600 mt-1">Download teaching materials for your sessions</p>
          </div>
          
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowSemesterFilter(!showSemesterFilter)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 w-full sm:w-auto justify-between sm:justify-start"
            >
              <div className="flex items-center gap-2">
                <Filter size={18} />
                {selectedSemester === 'All' 
                  ? "All Semesters" 
                  : `Semester ${selectedSemester}`}
              </div>
              <ChevronDown size={16} className={`transition-transform ${showSemesterFilter ? 'rotate-180' : ''}`} />
            </button>
            
            {showSemesterFilter && (
              <div className="absolute right-0 sm:left-0 mt-2 w-full sm:w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedSemester('All');
                      setShowSemesterFilter(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      selectedSemester === 'All' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All Semesters
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSemester('1');
                      setShowSemesterFilter(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      selectedSemester === '1' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Semester 1
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSemester('2');
                      setShowSemesterFilter(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      selectedSemester === '2' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Semester 2
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-600">Loading your sessions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(filteredSessions).length > 0 ? (
              Object.entries(filteredSessions).map(([year, semesters]) => (
                <div key={year} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <School className="text-emerald-600" size={20} />
                      <h2 className="text-lg font-semibold text-gray-800">{year}</h2>
                    </div>
                    {expandedYears[year] ? (
                      <ChevronDown className="text-gray-400" size={20} />
                    ) : (
                      <ChevronRight className="text-gray-400" size={20} />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedYears[year] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {Object.entries(semesters).map(([semester, sessions]) => (
                          <div key={semester} className="border-t border-gray-100">
                            <button
                              onClick={() => toggleSemester(year, semester)}
                              className="w-full p-4 pl-8 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="text-blue-500" size={18} />
                                <h3 className="font-medium text-gray-700">{semester}</h3>
                              </div>
                              {expandedSemesters[`${year}-${semester}`] ? (
                                <ChevronDown className="text-gray-400" size={18} />
                              ) : (
                                <ChevronRight className="text-gray-400" size={18} />
                              )}
                            </button>

                            <AnimatePresence>
                              {expandedSemesters[`${year}-${semester}`] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 pl-12">
                                    {sessions.map((session) => (
                                      <motion.div
                                        key={`${session.moduleId}-${session.groupId}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -2 }}
                                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                      >
                                        <div className="mb-3">
                                          <h4 className="font-semibold text-emerald-700">{session.moduleName}</h4>
                                          <p className="text-sm text-gray-500">{session.groupName}</p>
                                        </div>
                                        
                                        <div className="space-y-1 mb-4">
                                          <div className="flex items-center gap-2">
                                            <School className="text-emerald-600" size={14} />
                                            <span className="text-xs text-gray-600">{session.degreeName}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <BookOpen className="text-emerald-600" size={14} />
                                            <span className="text-xs text-gray-600">{session.sectionName}</span>
                                          </div>
                                        </div>
                                        
                                        <motion.button
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => handleDownload(session)}
                                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-1 px-3 rounded-md hover:bg-emerald-700 transition-colors text-sm"
                                        >
                                          <Download size={14} />
                                          <span>Download</span>
                                        </motion.button>
                                      </motion.div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="flex flex-col items-center justify-center">
                  <Calendar className="text-emerald-600 mb-4" size={48} />
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    {sessions.length > 0 
                      ? "No sessions for selected semester"
                      : "No teaching sessions assigned"}
                  </h3>
                  <p className="text-gray-600">
                    {sessions.length > 0
                      ? "You don't have any modules assigned for this semester"
                      : "You don't have any modules assigned to teach yet"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportPage;