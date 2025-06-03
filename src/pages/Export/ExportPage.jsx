/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/Supabase';
import { useAuth } from '../../hooks/useAuth';
import { Download, Users, BookOpen, Calendar, School, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const ExportPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingSession, setDownloadingSession] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null);
  const [semesters, setSemesters] = useState([]);

  // Fetch Academic Years
  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('*')
        .order('AcademicId', { ascending: true });

      if (error) throw error;
      setAcademicYears(data || []);
    } catch (error) {
      console.error("Error fetching academic years:", error);
    }
  };

  // Fetch all semesters with academic year info
  const fetchSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from('Semestre')
        .select('SemesterId, label, StartDate, EndDate, AcademicId')
        .order('StartDate', { ascending: false });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error("Error fetching semesters:", error);
    }
  };

  // Determine current academic year based on current date and semester intervals
  const determineCurrentAcademicYear = useCallback(() => {
    const currentDate = new Date();
    
    const currentSemester = semesters.find(semester => {
      if (!semester.StartDate || !semester.EndDate) return false;
      
      const startDate = new Date(semester.StartDate);
      const endDate = new Date(semester.EndDate);
      
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (currentSemester && currentSemester.AcademicId) {
      const academicYear = academicYears.find(year => year.AcademicId === currentSemester.AcademicId);
      setCurrentAcademicYear(academicYear);
      return academicYear;
    } else {
      setCurrentAcademicYear(null);
      return null;
    }
  }, [semesters, academicYears]);

  useEffect(() => {
    if (semesters.length > 0 && academicYears.length > 0) {
      determineCurrentAcademicYear();
    }
  }, [semesters, academicYears, determineCurrentAcademicYear]);

  // Organize sessions by year and semester
  const organizedSessions = sessions.reduce((acc, session) => {
    const year = session.yearName || 'Unknown Year';
    const semester = session.semesterLabel || `Semester ${session.semester}`;
    
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
      if (selectedSemester === 'All' || semester.includes(selectedSemester)) {
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
          typeId,
          Module:moduleId (
            moduleId,
            moduleName,
            SemesterId,
            Semestre:SemesterId (
              SemesterId,
              label,
              AcademicId
            ),
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

      // Create a map to track unique sessions by groupId, moduleId, typeId, and semester
      const uniqueSessionsMap = new Map();

      data.forEach(session => {
        const key = `${session.moduleId}-${session.groupId}-${session.typeId}-${session.Module?.SemesterId}`;
        
        if (!uniqueSessionsMap.has(key)) {
          uniqueSessionsMap.set(key, session);
        }
      });

      // Convert the map values back to an array
      const uniqueSessions = Array.from(uniqueSessionsMap.values());

      return uniqueSessions.map(session => ({
        sessionId: `${session.moduleId}-${session.groupId}-${session.typeId}`,
        moduleId: session.moduleId,
        moduleName: session.Module?.moduleName || "Unknown Module",
        semester: session.Module?.SemesterId || "1",
        semesterLabel: session.Module?.Semestre?.label || `Semester ${session.Module?.SemesterId || "1"}`,
        yearName: session.Module?.SchoolYear?.yearName || "Unknown Year",
        groupId: session.groupId,
        groupName: session.Group?.groupName || "Unknown Group",
        filePath: session.Group?.group_path,
        degreeName: session.Group?.Section?.SchoolYear?.Degree?.degreeName || "Unknown Degree",
        sectionName: session.Group?.Section?.sectionName || "Unknown Section",
        academicYearId: session.Module?.Semestre?.AcademicId || null
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
      await Promise.all([fetchAcademicYears(), fetchSemesters()]);
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

  const handleDownload = async (session) => {
    console.log("Preparing to download materials for:", session.moduleName, session.groupName);
    
    if (!session.filePath) {
      alert("No file path available for this session");
      return;
    }
    
    try {
      setDownloadingSession(session.sessionId);
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('Session')
        .select('sessionId, sessionNumber, date, TypeId')
        .eq('moduleId', session.moduleId)
        .eq('groupId', session.groupId)
        .order('date', { ascending: true });
      
      if (sessionsError) throw sessionsError;
      
      if (!sessionsData || sessionsData.length === 0) {
        throw new Error("No sessions found for this module and group");
      }
      
      console.log(`Found ${sessionsData.length} sessions for ${session.moduleName} - ${session.groupName}`);
      
      const sessionsWithAttendance = await Promise.all(
        sessionsData.map(async (sess) => {
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('Attendance')
            .select('matricule, presence')
            .eq('sessionId', sess.sessionId);
          
          if (attendanceError) throw attendanceError;
          
          return {
            ...sess,
            attendance: attendanceData || []
          };
        })
      );
      
      const attendanceData = {
        sessions: sessionsWithAttendance,
        moduleName: session.moduleName,
        groupName: session.groupName,
        filePath: session.filePath
      };
      
      await initiateDownload(attendanceData);
      
    } catch (error) {
      console.error("Error preparing download:", error);
      alert(`Error preparing download: ${error.message}`);
    } finally {
      setDownloadingSession(null);
    }
  };

  const initiateDownload = async (attendanceData) => {
    try {
      const response = await fetch(
        `http://localhost:3000/download/${attendanceData.groupName}?groupPath=${encodeURIComponent(attendanceData.filePath)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const enhancedData = jsonData.map(student => {
        const enhancedStudent = { ...student };
        
        attendanceData.sessions.forEach((session, index) => {
          const attendance = session.attendance.find(a => a.matricule === student.Matricule);
          enhancedStudent[`Session ${index + 1}`] = attendance ? attendance.presence : 0;
        });
        
        const note = Object.keys(enhancedStudent)
          .filter(key => key.startsWith('Session '))
          .reduce((sum, key) => sum + (enhancedStudent[key] || 0), 0);
        
        enhancedStudent.Note = note;
        
        return enhancedStudent;
      });
      
      const newWorksheet = XLSX.utils.json_to_sheet(enhancedData);
      workbook.Sheets[firstSheetName] = newWorksheet;
      
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });
      
      const newBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(newBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${attendanceData.moduleName}_${attendanceData.groupName}_attendance.xlsx`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log("Enhanced Excel file downloaded successfully");
      
    } catch (error) {
      console.error("Download failed:", error);
      alert(`Download failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Course Materials Export</h1>
            <p className="text-gray-600 mt-1">Download Group Lists with Notes</p> 
          </div>
          
          <div className="flex items-center gap-4">
            {currentAcademicYear && (
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                <Calendar className="text-blue-600" size={18} />
                <span className="text-sm font-medium text-blue-800">
                  {currentAcademicYear.label}
                </span>
              </div>
            )}
            
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setShowSemesterFilter(!showSemesterFilter)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 w-full sm:w-auto justify-between sm:justify-start"
              >
                <div className="flex items-center gap-2">
                  <Filter size={18} />
                  {selectedSemester === 'All' 
                    ? "All Semesters" 
                    : semesters.find(s => s.SemesterId === selectedSemester)?.label || "Select Semester"}
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
                    {semesters
                      .filter(semester => 
                        !currentAcademicYear || semester.AcademicId === currentAcademicYear.AcademicId
                      )
                      .map(semester => (
                        <button
                          key={semester.SemesterId}
                          onClick={() => {
                            setSelectedSemester(semester.SemesterId);
                            setShowSemesterFilter(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            selectedSemester === semester.SemesterId 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {semester.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {currentAcademicYear && (
          <div className="sm:hidden mb-4 bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={18} />
              <span className="text-sm font-medium text-blue-800">
                Current Academic Year: {currentAcademicYear.label}
              </span>
            </div>
          </div>
        )}

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
                                    {sessions.map((session) => {
                                      const isDownloading = downloadingSession === session.sessionId;
                                      
                                      return (
                                        <motion.div
                                          key={session.sessionId}
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
                                            {session.filePath && (
                                              <div className="flex items-center gap-2">
                                                <Download className="text-emerald-600" size={14} />
                                                <span className="text-xs text-gray-600 truncate" title={session.filePath}>
                                                  {session.filePath.split('/').pop() || 'File available'}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          
                                          <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleDownload(session)}
                                            disabled={isDownloading || !session.filePath}
                                            className={`w-full flex items-center justify-center gap-2 py-1 px-3 rounded-md transition-colors text-sm ${
                                              !session.filePath
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : isDownloading
                                                ? 'bg-emerald-400 text-white cursor-wait'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            }`}
                                          >
                                            {isDownloading ? (
                                              <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                                <span>Downloading...</span>
                                              </>
                                            ) : (
                                              <>
                                                <Download size={14} />
                                                <span>{session.filePath ? 'Download' : 'No File'}</span>
                                              </>
                                            )}
                                          </motion.button>
                                        </motion.div>
                                      );
                                    })}
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