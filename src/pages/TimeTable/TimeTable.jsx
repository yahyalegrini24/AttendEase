/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import { ChevronDown, ChevronUp, Edit2, Trash2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Constants
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TIME_SLOTS = [
  '08:00-09:30',
  '09:30-11:00',
  '11:00-12:30',
  '12:30-14:00',
  '14:00-15:30',
  '15:30-17:00'
];

const generateAlphaId = (length = 12) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => 
    letters.charAt(Math.floor(Math.random() * letters.length))
  ).join('');
};

export default function TimeTable() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timetableData, setTimetableData] = useState({});
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState([]);
  const [expandedDays, setExpandedDays] = useState(
    DAYS.reduce((acc, day) => ({ ...acc, [day]: true }), {})
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.teacherId) return; 

      setLoading(true);
      try {
        // Fetch sessions data
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('Session_structure')
          .select(`
            moduleId,
            classId,
            groupId,
            teacherId,
            dayId,
            Session_structure_id,
            Day:dayId (dayId, dayName),
            Module:moduleId (moduleId, moduleName),
            Group:groupId (
              groupId,
              groupName,
              typeId,
              GroupType:typeId (typeId, typeName),
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
            Classroom:classId (classId, ClassNumber, Location)
          `)
          .eq('teacherId', user.teacherId);

        if (sessionsError) throw sessionsError;

        // Format the data
        const formattedData = {};
        sessionsData?.forEach(session => {
          const dayName = session.Day?.dayName || '';
          const timeSlot = TIME_SLOTS[session.dayId - 1] || '';
          
          if (!formattedData[dayName]) {
            formattedData[dayName] = {};
          }

          formattedData[dayName][timeSlot] = {
            moduleId: session.moduleId,
            name: session.Module?.moduleName || '',
            groupId: session.groupId,
            group: session.Group?.groupName || '',
            type: session.Group?.GroupType?.typeName || '',
            typeId: session.Group?.typeId || '',
            year: session.Group?.Section?.SchoolYear?.yearName || '',
            yearId: session.Group?.Section?.SchoolYear?.yearId || '',
            degree: session.Group?.Section?.SchoolYear?.Degree?.degreeName || '',
            degreeId: session.Group?.Section?.SchoolYear?.Degree?.degreeId || '',
            sectionId: session.Group?.Section?.sectionId || '',
            classroomId: session.classId,
            room: {
              roomNumber: session.Classroom?.ClassNumber || '',
              location: session.Classroom?.Location || '',
              classId: session.classId
            },
            dayId: session.dayId,
            sessionStructureId: session.Session_structure_id || generateAlphaId()
          };
        });

        setTimetableData(formattedData);

        // Fetch classrooms
        const { data: classroomsData, error: classroomsError } = await supabase
          .from('Classroom')
          .select('classId, ClassNumber, Location');

        if (classroomsError) throw classroomsError;
        setClassrooms(classroomsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const toggleDay = (day) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const openCourseDetails = (day, timeSlot) => {
    const slotData = timetableData[day]?.[timeSlot] || {};
    const classroom = classrooms.find(c => c.classId === slotData?.classroomId);
    
    navigate('/course-details', {
      state: {
        day,
        timeSlot,
        courseDetails: {
          ...slotData,
          room: {
            roomNumber: classroom?.ClassNumber || slotData.room?.roomNumber || '',
            location: classroom?.Location || slotData.room?.location || '',
            classId: slotData.classroomId || ''
          }
        },
        onSave: (updatedDetails) => {
          setTimetableData(prev => ({
            ...prev,
            [day]: {
              ...prev[day],
              [timeSlot]: {
                ...updatedDetails,
                sessionStructureId: updatedDetails.sessionStructureId || generateAlphaId()
              }
            }
          }));
        }
      }
    });
  };

  const handleDeleteSession = (day, timeSlot) => {
    if (confirm('Are you sure you want to delete this session?')) {
      setTimetableData(prev => {
        const newData = { ...prev };
        if (newData[day]) {
          delete newData[day][timeSlot];
        }
        return newData;
      });
    }
  };

  const handleSaveTimetable = async () => {
    setLoading(true);

    try {
      const sessionsToUpsert = [];
      
      Object.entries(timetableData).forEach(([dayName, daySchedule]) => {
        Object.entries(daySchedule).forEach(([timeSlot, slotData]) => {
          if (slotData && slotData.groupId && slotData.moduleId) {
            sessionsToUpsert.push({
              moduleId: slotData.moduleId,
              classId: slotData.classroomId || null,
              groupId: slotData.groupId,
              teacherId: user.teacherId,
              dayId: DAYS.indexOf(dayName) + 1,
              Session_structure_id: slotData.sessionStructureId || generateAlphaId()
            });
          }
        });
      });

      // Delete existing sessions
      await supabase
        .from('Session_structure')
        .delete()
        .eq('teacherId', user.teacherId);

      // Insert new sessions
      const { error } = await supabase
        .from('Session_structure')
        .insert(sessionsToUpsert);

      if (error) throw error;

      alert('Timetable saved successfully!');
    } catch (error) {
      console.error('Failed to save timetable:', error);
      alert('Failed to save timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Timetable</h1>
        <button
          onClick={handleSaveTimetable}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-70"
        >
          {loading ? (
            <span className="animate-spin">↻</span>
          ) : (
            <>
              <Save size={18} />
              Save Timetable
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {DAYS.map(day => (
          <div key={day} className="bg-white rounded-xl shadow-md overflow-hidden">
            <button
              onClick={() => toggleDay(day)}
              className="w-full flex justify-between items-center p-5 bg-green-700 text-white hover:bg-green-800 transition-colors"
            >
              <h2 className="text-xl font-semibold">{day}</h2>
              {expandedDays[day] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>

            {expandedDays[day] && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TIME_SLOTS.map(timeSlot => {
                    const slotData = timetableData[day]?.[timeSlot];
                    const classroom = classrooms.find(c => c.classId === slotData?.classroomId);

                    return (
                      <div 
                        key={timeSlot} 
                        className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <h3 className="font-medium text-gray-700">{timeSlot}</h3>
                        </div>
                        
                        <div className="p-4">
                          {slotData ? (
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-gray-800">
                                    {slotData.degree} | {slotData.year}
                                  </h4>
                                  <p className="text-gray-600">
                                    {slotData.group} | {slotData.name}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {slotData.type} | {classroom?.Location ? `${classroom.Location} - ${classroom.ClassNumber}` : `Room ${slotData.room?.roomNumber || ''}`}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSession(day, timeSlot);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Delete session"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              <button
                                onClick={() => openCourseDetails(day, timeSlot)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
                              >
                                <Edit2 size={14} />
                                Edit Session
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-4">
                              <p className="text-gray-400 mb-3">No class scheduled</p>
                              <button
                                onClick={() => openCourseDetails(day, timeSlot)}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm font-medium transition-colors"
                              >
                                <Edit2 size={14} />
                                Add Session
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}