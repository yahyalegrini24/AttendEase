/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import { Calendar, Clock, MapPin, Book, Users, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Today');
  const [expandedSession, setExpandedSession] = useState(null);

  const currentDayName = new Date().toLocaleString('en-US', { weekday: 'long' });
  const filteredSessions = sessions.filter(session => 
    selectedDay === 'Today' 
      ? session.Day.dayName === currentDayName
      : session.Day.dayName === selectedDay
  );

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.teacherId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('Session_structure')
          .select(`
            moduleId,
            classId,
            groupId,
            teacherId,
            dayId,
            typeId,
            Session_structure_id,
            Day:dayId (dayId, dayName),
            Module:moduleId (moduleId, moduleName),
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
            GroupType:typeId (typeId, typeName),
            Classroom:classId (classId, ClassNumber, Location)
          `)
          .eq('teacherId', user.teacherId)
          .order('dayId', { ascending: true });

        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  const toggleSessionExpand = (sessionId) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const generateSessionId = (sessionStructureId) => {
    // Get 3 random digits (100-999)
    const randomNumbers = Math.floor(100 + Math.random() * 900);
    return `${sessionStructureId}${randomNumbers}`;
  };

  const handleStartAttendance = async (session) => {
    // Show confirmation dialog
    const confirmStart = window.confirm(
      `Start attendance for:\n\n` +
      `📚 Module: ${session.Module.moduleName}\n` +
      `👥 Group: ${session.Group.groupName}\n` +
      `📅 Day: ${session.Day.dayName}\n` +
      `🏛️ Location: ${session.Classroom.Location} - ${session.Classroom.ClassNumber}`
    );

    if (!confirmStart) return;

    try {
      setLoading(true);

      // Check if there's a previous session for this group/module
      const { data: lastSession, error: lastSessionError } = await supabase
        .from('Session')
        .select('sessionNumber')
        .eq('moduleId', session.moduleId)
        .eq('groupId', session.groupId)
        .order('sessionNumber', { ascending: false })
        .limit(1)
        .single();

      if (lastSessionError && lastSessionError.code !== 'PGRST116') {
        throw lastSessionError;
      }

      // Calculate next session number
      const nextSessionNumber = (lastSession?.sessionNumber || 0) + 1;
      const sessionId = generateSessionId(session.Session_structure_id);

      // Create new session record
      const { data: newSession, error } = await supabase
        .from('Session')
        .insert({
          sessionId: sessionId,
          sessionNumber: nextSessionNumber,
          moduleId: session.moduleId,
          classId: session.classId,
          groupId: session.groupId,
          teacherId: user.teacherId,
          dayId: session.dayId,
          TypeId:session.typeId,
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to attendance page with all required parameters
      navigate(`/sessions/${newSession.sessionId}/attendance`, {
        state: {
          courseName: session.Module.moduleName,
          groupId: session.groupId,
          groupName: session.Group.groupName,
          moduleId: session.moduleId,
          dayId: session.dayId,
          sessionId:newSession.sessionId
        }
      });

    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to start attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#006633]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome, Professor {user.name}!</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            {filteredSessions.length > 0 
              ? `You have ${filteredSessions.length} sessions ${selectedDay === 'Today' ? 'today' : `on ${selectedDay}`}`
              : `No sessions scheduled for ${selectedDay === 'Today' ? 'today' : selectedDay}`
            }
          </p>
        </div>
        
        {/* Day Selector */}
        <div className="w-full md:w-auto flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedDay('Today')}
            className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              selectedDay === 'Today' 
                ? 'bg-[#006633] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDay === day 
                  ? 'bg-[#006633] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {window.innerWidth < 400 ? day.substring(0, 2) : day.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="grid gap-3 sm:gap-4">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">
              No sessions found
            </h3>
            <p className="text-gray-500 text-sm sm:text-base max-w-md">
              You don't have any sessions scheduled for {selectedDay === 'Today' ? 'today' : selectedDay}.
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <motion.div 
              key={session.Session_structure_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Session Header */}
              <div 
                className="p-4 sm:p-5 cursor-pointer"
                onClick={() => toggleSessionExpand(session.Session_structure_id)}
              >
                <div className="flex justify-between items-start">
                  <div className="w-[calc(100%-28px)]">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-start sm:items-center">
                      <Book className="mr-2 text-[#006633] mt-0.5 sm:mt-0 flex-shrink-0" />
                      <span className="line-clamp-1">{session.Module.moduleName}</span>
                    </h3>
                    <p className="text-gray-600 mt-1 flex items-start sm:items-center text-sm sm:text-base">
                      <Users className="mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {session.Group.Section.SchoolYear.Degree.degreeName} - {session.Group.Section.SchoolYear.yearName} - {session.Group.Section.sectionName}
                      </span>
                    </p>
                  </div>
                  <ChevronRight 
                    className={`text-gray-400 transition-transform flex-shrink-0 ${
                      expandedSession === session.Session_structure_id ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                {/* Session Tags */}
                <div className="mt-2 sm:mt-3 flex flex-wrap gap-2 sm:gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Clock className="mr-1 w-3 h-3" />
                    {session.Day.dayName}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <MapPin className="mr-1 w-3 h-3" />
                    <span className="truncate max-w-[100px] sm:max-w-none">
                      {session.Classroom.Location} - {session.Classroom.ClassNumber}
                    </span>
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {session.GroupType.typeName}
                  </span>
                </div>
              </div>

              {/* Expanded Session Details */}
              {expandedSession === session.Session_structure_id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-gray-100"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2 sm:mt-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-gray-500">Group Details</h4>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {session.Group.groupName} ({session.Group.Section.SchoolYear.yearName})
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-gray-500">Session Type</h4>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">{session.GroupType.typeName}</p>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-gray-500">Location</h4>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {session.Classroom.Location}, Room {session.Classroom.ClassNumber}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-gray-500">Degree Program</h4>
                      <p className="mt-1 text-sm sm:text-base text-gray-900">
                        {session.Group.Section.SchoolYear.Degree.degreeName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button 
                      onClick={() => handleStartAttendance(session)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#006633] text-white rounded-lg text-sm font-medium hover:bg-[#00502a] transition-colors"
                    >
                      Start Attendance
                    </button>
                    <button className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                      View Students
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export default Dashboard;