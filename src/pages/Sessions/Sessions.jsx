/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import { Calendar, Clock, MapPin, Book, Users, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];

function Dashboard() {
  const { user } = useAuth();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#006633]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, Professor!</h1>
          <p className="text-gray-600 mt-2">
            {filteredSessions.length > 0 
              ? `You have ${filteredSessions.length} sessions ${selectedDay === 'Today' ? 'today' : `on ${selectedDay}`}`
              : `No sessions scheduled for ${selectedDay === 'Today' ? 'today' : selectedDay}`
            }
          </p>
        </div>
        
        {/* Day Selector */}
        <div className="mt-4 md:mt-0 flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedDay('Today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDay === day 
                  ? 'bg-[#006633] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="grid gap-4">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No sessions found
            </h3>
            <p className="text-gray-500 max-w-md">
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
                className="p-5 cursor-pointer"
                onClick={() => toggleSessionExpand(session.Session_structure_id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Book className="mr-2 text-[#006633]" />
                      {session.Module.moduleName}
                    </h3>
                    <p className="text-gray-600 mt-1 flex items-center">
                      <Users className="mr-2" />
                      {session.Group.Section.SchoolYear.Degree.degreeName} - {session.Group.Section.SchoolYear.yearName} - {session.Group.Section.sectionName}
                    </p>
                  </div>
                  <ChevronRight 
                    className={`text-gray-400 transition-transform ${
                      expandedSession === session.Session_structure_id ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                {/* Session Tags */}
                <div className="mt-3 flex flex-wrap gap-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Clock className="mr-1 w-3 h-3" />
                    {session.Day.dayName}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <MapPin className="mr-1 w-3 h-3" />
                    {session.Classroom.Location} - {session.Classroom.ClassNumber}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
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
                  className="px-5 pb-5 pt-0 border-t border-gray-100"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Group Details</h4>
                      <p className="mt-1 text-gray-900">
                        {session.Group.groupName} ({session.Group.Section.SchoolYear.yearName})
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Session Type</h4>
                      <p className="mt-1 text-gray-900">{session.GroupType.typeName}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Location</h4>
                      <p className="mt-1 text-gray-900">
                        {session.Classroom.Location}, Room {session.Classroom.ClassNumber}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Degree Program</h4>
                      <p className="mt-1 text-gray-900">
                        {session.Group.Section.SchoolYear.Degree.degreeName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-3">
                    <button className="px-4 py-2 bg-[#006633] text-white rounded-lg text-sm font-medium hover:bg-[#00502a] transition-colors">
                      Start Attendance
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
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