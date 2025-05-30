import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import { 
  Users, Calendar, Clock, BookOpen, CheckCircle, 
  XCircle, ChevronRight, Filter, ChevronDown, ChevronUp, School
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EditSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [organizedData, setOrganizedData] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [expandedModules, setExpandedModules] = useState({});

  // Organize sessions by school year, semester, and module
  const organizeSessions = (sessions) => {
    const organized = {};

    sessions.forEach(session => {
      const yearName = session.Group?.Section?.SchoolYear?.yearName || 'Unknown Year';
      const semesterId = session.Module?.Semester?.SemesterId || 'unknown';
      const semesterName = session.Module?.Semester?.label || 'Unknown Semester';
      const moduleId = session.Module?.moduleId || 'unknown';
      const moduleName = session.Module?.moduleName || 'Unknown Module';

      if (!organized[yearName]) {
        organized[yearName] = {
          yearName,
          semesters: {}
        };
      }

      if (!organized[yearName].semesters[semesterId]) {
        organized[yearName].semesters[semesterId] = {
          semesterId,
          semesterName,
          modules: {}
        };
      }

      if (!organized[yearName].semesters[semesterId].modules[moduleId]) {
        organized[yearName].semesters[semesterId].modules[moduleId] = {
          moduleId,
          moduleName,
          sessions: []
        };
      }

      organized[yearName].semesters[semesterId].modules[moduleId].sessions.push(session);
    });

    return Object.values(organized);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.teacherId) return;
      setLoading(true);
      
      try {
        // Fetch semesters first
        const { data: semesterData, error: semesterError } = await supabase
          .from('Semestre')
          .select('SemesterId, label')
          .order('StartDate', { ascending: false });

        if (semesterError) throw semesterError;
        setSemesters(semesterData || []);

        // Then fetch sessions with all related data
        const { data: sessionData, error: sessionError } = await supabase
          .from('Session')
          .select(`
            sessionId,
            sessionNumber,
            date,
            confirm,
            Module:moduleId (
              moduleId,
              moduleName,
              Semester:SemesterId (SemesterId, label)
            ),
            Group:groupId (
              groupId,
              groupName,
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
            ),
            Classroom:classId (classId, ClassNumber, Location),
            Day:dayId (dayId, dayName)
          `)
          .eq('teacherId', user.teacherId)
          .order('date', { ascending: false });

        if (sessionError) throw sessionError;
        setSessions(sessionData || []);
        setOrganizedData(organizeSessions(sessionData || []));
      } catch (err) {
        console.error('Error fetching data:', err);
        alert('Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  useEffect(() => {
    if (sessions.length > 0) {
      let filtered = sessions;
      if (selectedSemester !== 'All') {
        filtered = sessions.filter(session => 
          session.Module?.Semester?.SemesterId === selectedSemester
        );
      }
      setOrganizedData(organizeSessions(filtered));
    }
  }, [selectedSemester, sessions]);

  const toggleSessionDetails = (sessionId) => {
    setSelectedSession(selectedSession === sessionId ? null : sessionId);
  };

  const toggleYear = (yearName) => {
    setExpandedYears(prev => ({
      ...prev,
      [yearName]: !prev[yearName]
    }));
  };

  const toggleSemester = (yearName, semesterId) => {
    setExpandedSemesters(prev => ({
      ...prev,
      [`${yearName}-${semesterId}`]: !prev[`${yearName}-${semesterId}`]
    }));
  };

  const toggleModule = (yearName, semesterId, moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [`${yearName}-${semesterId}-${moduleId}`]: !prev[`${yearName}-${semesterId}-${moduleId}`]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Your Teaching Sessions</h1>
            <p className="text-gray-600 mt-1">View and manage your past sessions</p>
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
                  {semesters.map(semester => (
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-600">Loading your sessions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizedData.length > 0 ? (
              organizedData.map((yearData) => (
                <div key={yearData.yearName} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                  <button
                    onClick={() => toggleYear(yearData.yearName)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <School className="text-emerald-600" size={20} />
                      <h2 className="text-lg font-semibold text-gray-800">{yearData.yearName}</h2>
                    </div>
                    {expandedYears[yearData.yearName] ? (
                      <ChevronDown className="text-gray-400" size={20} />
                    ) : (
                      <ChevronRight className="text-gray-400" size={20} />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedYears[yearData.yearName] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {Object.values(yearData.semesters).map((semesterData) => (
                          <div key={semesterData.semesterId} className="border-t border-gray-100">
                            <button
                              onClick={() => toggleSemester(yearData.yearName, semesterData.semesterId)}
                              className="w-full p-4 pl-8 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Calendar className="text-blue-500" size={18} />
                                <h3 className="font-medium text-gray-700">{semesterData.semesterName}</h3>
                              </div>
                              {expandedSemesters[`${yearData.yearName}-${semesterData.semesterId}`] ? (
                                <ChevronDown className="text-gray-400" size={18} />
                              ) : (
                                <ChevronRight className="text-gray-400" size={18} />
                              )}
                            </button>

                            <AnimatePresence>
                              {expandedSemesters[`${yearData.yearName}-${semesterData.semesterId}`] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  {Object.values(semesterData.modules).map((moduleData) => (
                                    <div key={moduleData.moduleId} className="border-t border-gray-100">
                                      <button
                                        onClick={() => toggleModule(yearData.yearName, semesterData.semesterId, moduleData.moduleId)}
                                        className="w-full p-4 pl-12 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          <BookOpen className="text-purple-500" size={16} />
                                          <h4 className="font-medium text-gray-700">{moduleData.moduleName}</h4>
                                        </div>
                                        {expandedModules[`${yearData.yearName}-${semesterData.semesterId}-${moduleData.moduleId}`] ? (
                                          <ChevronDown className="text-gray-400" size={16} />
                                        ) : (
                                          <ChevronRight className="text-gray-400" size={16} />
                                        )}
                                      </button>

                                      <AnimatePresence>
                                        {expandedModules[`${yearData.yearName}-${semesterData.semesterId}-${moduleData.moduleId}`] && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="space-y-4 p-4 pl-16">
                                              {moduleData.sessions.map((session) => (
                                                <motion.div 
                                                  key={session.sessionId}
                                                  initial={{ opacity: 0, y: 10 }}
                                                  animate={{ opacity: 1, y: 0 }}
                                                  className="bg-gray-50 rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md border border-gray-200"
                                                >
                                                  <div 
                                                    className="p-4 cursor-pointer"
                                                    onClick={() => toggleSessionDetails(session.sessionId)}
                                                  >
                                                    <div className="flex justify-between items-start">
                                                      <div>
                                                        <p className="text-sm text-gray-500">
                                                          Session #{session.sessionNumber}
                                                        </p>
                                                      </div>
                                                      <ChevronRight 
                                                        className={`text-gray-400 transition-transform ${
                                                          selectedSession === session.sessionId ? 'rotate-90' : ''
                                                        }`}
                                                      />
                                                    </div>
                                                  </div>

                                                  {selectedSession === session.sessionId && (
                                                    <motion.div 
                                                      initial={{ opacity: 0, height: 0 }}
                                                      animate={{ opacity: 1, height: 'auto' }}
                                                      exit={{ opacity: 0, height: 0 }}
                                                      className="px-4 pb-4 border-t border-gray-200"
                                                    >
                                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                                        <div className="flex items-center">
                                                          <Users className="text-gray-400 mr-2" size={16} />
                                                          <span className="text-gray-700 text-sm">
                                                            {session.Group?.groupName || 'Unknown Group'}
                                                          </span>
                                                        </div>
                                                        
                                                        <div className="flex items-center">
                                                          <BookOpen className="text-gray-400 mr-2" size={16} />
                                                          <span className="text-gray-700 text-sm">
                                                            {session.Classroom?.Location 
                                                              ? `${session.Classroom.Location} - ${session.Classroom.ClassNumber}`
                                                              : `Room ${session.Classroom?.ClassNumber || ''}`}
                                                          </span>
                                                        </div>
                                                        
                                                        <div className="flex items-center">
                                                          <Calendar className="text-gray-400 mr-2" size={16} />
                                                          <span className="text-gray-700 text-sm">
                                                            {session.Day?.dayName || 'Unknown Day'}
                                                          </span>
                                                        </div>
                                                        
                                                        <div className="flex items-center">
                                                          <Clock className="text-gray-400 mr-2" size={16} />
                                                          <span className="text-gray-700 text-sm">
                                                            {formatDate(session.date)}
                                                          </span>
                                                        </div>
                                                        
                                                        <div className="flex items-center">
                                                          {session.confirm ? (
                                                            <CheckCircle className="text-green-500 mr-2" size={16} />
                                                          ) : (
                                                            <XCircle className="text-gray-400 mr-2" size={16} />
                                                          )}
                                                          <span className="text-gray-700 text-sm">
                                                            {session.confirm ? "Confirmed" : "Not Confirmed"}
                                                          </span>
                                                        </div>
                                                      </div>

                                                      <div className="mt-4 flex justify-end">
                                                        <motion.button
                                                          whileHover={{ scale: 1.02 }}
                                                          whileTap={{ scale: 0.98 }}
                                                          onClick={() => {
                                                            navigate('/justified-students', {
                                                              state: {
                                                                sessionId: session.sessionId,
                                                                moduleName: session.Module?.moduleName,
                                                                groupName: session.Group?.groupName
                                                              }
                                                            });
                                                          }}
                                                          className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                                                        >
                                                          <Users className="mr-1.5" size={14} />
                                                          View Absentees
                                                        </motion.button>
                                                      </div>
                                                    </motion.div>
                                                  )}
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
                      ? "No sessions match your filters"
                      : "No sessions found"}
                  </h3>
                  <p className="text-gray-600">
                    {sessions.length > 0
                      ? "Try adjusting your semester filter"
                      : "You don't have any teaching sessions recorded yet"}
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

export default EditSession;