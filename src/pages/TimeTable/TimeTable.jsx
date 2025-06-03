import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import { ChevronDown, ChevronUp, Edit2, Trash2, Save, X, Filter, Calendar } from 'lucide-react';

// Constants
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const generateAlphaId = (length = 12) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => 
    letters.charAt(Math.floor(Math.random() * letters.length))
  ).join('');
};

const CourseDetailsModal = ({ 
  day, 
  timeSlot,
  courseDetails = {}, 
  onSave, 
  onClose,
  teacherId,
  classrooms,
  selectedSemester
}) => {
  const [details, setDetails] = useState({
    year: courseDetails.year || '',
    yearId: courseDetails.yearId || '',
    degree: courseDetails.degree || '',
    degreeId: courseDetails.degreeId || '',
    name: courseDetails.name || '',
    moduleId: courseDetails.moduleId || '',
    group: courseDetails.group || '',
    groupId: courseDetails.groupId || '',
    type: courseDetails.type || '',
    typeId: courseDetails.typeId || '',
    sectionId: courseDetails.sectionId || '',
    room: courseDetails.room || { roomNumber: '', location: 'Unknown Location', classId: '' },
    classroomId: courseDetails.classroomId || '',
    timeId: courseDetails.timeId || null,
    timeLabel: courseDetails.timeLabel || '',
    sessionStructureId: courseDetails.sessionStructureId || generateAlphaId(),
    dayId: DAYS.indexOf(day) + 1
  });
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    group: false,
    module: false,
    classroom: false,
    type: false
  });
  const [groupTypes, setGroupTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) return;
      
      setLoading(true);
      try {
        // Fetch time slots
        const { data: timeSlotsData, error: timeSlotsError } = await supabase
          .from('SessionTime')
          .select('*')
          .order('TimeId', { ascending: true });

        if (timeSlotsError) throw timeSlotsError;
        setTimeSlots(timeSlotsData || []);

        // Fetch teacher's groups
        const { data: teacherGroupsData, error: teacherGroupsError } = await supabase
          .from('Teacher_group')
          .select('groupId')
          .eq('teacherId', teacherId);

        if (teacherGroupsError) throw teacherGroupsError;

        // Fetch group types
        const { data: groupTypesData, error: groupTypesError } = await supabase
          .from('GroupType')
          .select('typeId, typeName');

        if (groupTypesError) throw groupTypesError;
        setGroupTypes(groupTypesData || []);

        if (teacherGroupsData && teacherGroupsData.length > 0) {
          const groupIds = teacherGroupsData.map(tg => tg.groupId);
          
          const { data: groupsData, error: groupsError } = await supabase
            .from('Group')
            .select(`
              groupId,
              groupName,
              sectionId,
              section:Section(
                sectionId,
                sectionName,
                yearId,
                year:SchoolYear(
                  yearId,
                  yearName,
                  degreeId,
                  degree:Degree(degreeName)
                )
              )
            `)
            .in('groupId', groupIds);
           
          if (groupsError) throw groupsError;
          setTeacherGroups(groupsData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load required data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId]);

  useEffect(() => {
    const fetchModules = async () => {
      if (!details.groupId || !selectedSemester) return;
      
      setLoading(true);
      try {
        const selectedGroup = teacherGroups.find(g => g.groupId === details.groupId);
        
        if (selectedGroup && selectedGroup.section?.yearId) {
          const { data: modulesData, error: modulesError } = await supabase
            .from('Module')
            .select('moduleId, moduleName')
            .eq('yearId', selectedGroup.section.yearId)
            .eq('SemesterId', selectedSemester);
        
          if (modulesError) throw modulesError;
          setModules(modulesData || []);
        }
      } catch (error) {
        console.error('Error fetching modules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [details.groupId, teacherGroups, selectedSemester]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSelectGroup = (group) => {
    setDetails(prev => ({
      ...prev,
      group: group.groupName,
      groupId: group.groupId,
      degree: group.section?.year?.degree?.degreeName || '',
      degreeId: group.section?.year?.degreeId || '',
      year: group.section?.year?.yearName || '',
      yearId: group.section?.yearId || '',
      sectionId: group.sectionId || '',
      name: '',
      moduleId: '',
      type: '',
      typeId: ''
    }));
    setExpandedSections(prev => ({ ...prev, module: false, type: true }));
  };

  const handleSelect = (field, value, id, extraData = {}) => {
    if (field === 'room') {
      const selectedClassroom = classrooms.find(c => c.classId === id);
      setDetails(prev => ({ 
        ...prev, 
        room: {
          roomNumber: selectedClassroom?.ClassNumber || value,
          location: selectedClassroom?.Location || 'Unknown Location',
          classId: id
        },
        classroomId: id
      }));
    } else if (field === 'name') {
      setDetails(prev => ({ 
        ...prev, 
        name: value,
        moduleId: id,
        ...extraData
      }));
    } else if (field === 'time') {
      const selectedTime = timeSlots.find(t => t.TimeId === id);
      setDetails(prev => ({
        ...prev,
        timeId: id,
        timeLabel: selectedTime?.label || ''
      }));
    } else {
      setDetails(prev => ({ 
        ...prev, 
        [field]: value,
        [`${field}Id`]: id 
      }));
    }
  };

  const displaySelectedClassroom = () => {
    if (!details.classroomId) return 'Select classroom';
    const selectedClassroom = classrooms.find(c => c.classId === details.classroomId);
    if (!selectedClassroom) {
      return details.room?.location 
        ? `${details.room.location} - ${details.room.roomNumber}`
        : `Room ${details.room?.roomNumber || details.room}`;
    }
    return selectedClassroom.Location 
      ? `${selectedClassroom.Location} - ${selectedClassroom.ClassNumber}`
      : `Room ${selectedClassroom.ClassNumber}`;
  };

  const renderSelectionSection = (title, field, items, selectedValue) => {
    const isDisabled = (field === 'module' && !details.group) || 
                      (field === 'classroom' && !details.group) ||
                      (field === 'type' && !details.group);
    return (
      <div className="mb-4 bg-white rounded-lg overflow-hidden shadow-sm">
        <button 
          className={`w-full flex justify-between items-center p-4 ${isDisabled ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
          onClick={() => toggleSection(field)}
          disabled={isDisabled}
        >
          <div className="flex items-center">
            {expandedSections[field] ? (
              <ChevronDown size={20} className={isDisabled ? "text-gray-400" : "text-green-700"} />
            ) : (
              <ChevronUp size={20} className={isDisabled ? "text-gray-400" : "text-green-700"} />
            )}
            <span className={`ml-2 font-medium ${isDisabled ? 'text-gray-400' : 'text-green-700'}`}>
              {title}
            </span>
          </div>
          <span className={`${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
            {selectedValue || `Select ${title.toLowerCase()}`}
          </span>
        </button>

        {expandedSections[field] && items.length > 0 && (
          <div className="border-t">
            {items.map((item) => (
              <button
                key={item.id}
                className={`w-full text-left p-3 hover:bg-gray-50 ${(field === 'name' ? details.moduleId === item.id : 
                  field === 'room' ? details.classroomId === item.id : 
                  field === 'type' ? details.typeId === item.id :
                  field === 'time' ? details.timeId === item.id : false) ? 'bg-green-50' : ''}`}
                onClick={() => {
                  handleSelect(field, item.value, item.id);
                  setExpandedSections(prev => ({ ...prev, [field]: false }));
                }}
              >
                <div className="flex justify-between items-center">
                  <span>{item.label}</span>
                  {(field === 'name' ? details.moduleId === item.id : 
                    field === 'room' ? details.classroomId === item.id : 
                    field === 'type' ? details.typeId === item.id :
                    field === 'time' ? details.timeId === item.id : false) && (
                    <span className="text-green-600">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const moduleOptions = modules.map(m => ({ 
    label: m.moduleName, 
    value: m.moduleName,
    id: m.moduleId
  }));
  
  const classroomOptions = classrooms.map(r => ({ 
    label: r.ClassNumber ? (r.Location ? `${r.Location} - ${r.ClassNumber}` : `Room ${r.ClassNumber}`) : 'Unknown Room', 
    value: r.ClassNumber ? r.ClassNumber.toString() : 'unknown',
    id: r.classId
  }));

  const typeOptions = groupTypes.map(t => ({
    label: t.typeName,
    value: t.typeName,
    id: t.typeId
  }));

  const timeOptions = timeSlots.map(t => ({
    label: t.label,
    value: t.label,
    id: t.TimeId
  }));

  const handleSave = () => {
    if (!details.year || !details.degree || !details.name || !details.room || !details.type || !details.timeId) {
      alert('Please fill all required fields');
      return;
    }

    const selectedClassroom = classrooms.find(c => c.classId === details.classroomId);
    const selectedTime = timeSlots.find(t => t.TimeId === details.timeId);
    
    const dataToSave = {
      year: details.year,
      yearId: details.yearId,
      degree: details.degree,
      degreeId: details.degreeId,
      name: details.name,
      moduleId: details.moduleId,
      group: details.group,
      groupId: details.groupId,
      type: details.type,
      typeId: details.typeId,
      sectionId: details.sectionId,
      room: {
        roomNumber: selectedClassroom?.ClassNumber || details.room.roomNumber || details.room,
        location: selectedClassroom?.Location || details.room.location || 'Unknown Location',
        classId: details.classroomId
      },
      classroomId: details.classroomId,
      timeId: details.timeId,
      timeLabel: selectedTime?.label || '',
      sessionStructureId: details.sessionStructureId,
      dayId: DAYS.indexOf(day) + 1
    };
    
    onSave(dataToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Course Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">{day} - {timeSlot}</h3>

          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-2">Select Group</h4>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <button 
                className="w-full flex justify-between items-center p-4 bg-white hover:bg-gray-50"
                onClick={() => toggleSection('group')}
              >
                <div className="flex items-center">
                  {expandedSections.group ? (
                    <ChevronDown size={20} className="text-green-700" />
                  ) : (
                    <ChevronUp size={20} className="text-green-700" />
                  )}
                  <span className="ml-2 font-medium text-green-700">Group</span>
                </div>
                <span className="text-gray-600">
                  {details.group || 'Select group'}
                </span>
              </button>

              {expandedSections.group && teacherGroups.length > 0 && (
                <div className="border-t">
                  {teacherGroups.map((group) => (
                    <button
                      key={group.groupId}
                      className={`w-full text-left p-3 hover:bg-gray-50 ${details.groupId === group.groupId ? 'bg-green-50' : ''}`}
                      onClick={() => handleSelectGroup(group)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{group.groupName}</p>
                          <p className="text-sm text-gray-500">
                            {group.section?.year?.degree?.degreeName || 'Unknown'} - 
                            {group.section?.year?.yearName || 'Unknown'} - 
                            {group.section?.sectionName || 'Unknown'}
                          </p>
                        </div>
                        {details.groupId === group.groupId && (
                          <span className="text-green-600">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {details.group && (
            <>
              {renderSelectionSection("Module", "name", moduleOptions, details.name)}
              {renderSelectionSection("Classroom", "room", classroomOptions, displaySelectedClassroom())}
              {renderSelectionSection("Group Type", "type", typeOptions, details.type)}
              {renderSelectionSection("Time Slot", "time", timeOptions, details.timeLabel)}
            </>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !details.group || !details.name || !details.room || !details.type || !details.timeId}
              className={`px-4 py-2 rounded-md text-white ${loading || !details.group || !details.name || !details.room || !details.type || !details.timeId ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TimeTable() {
  const { user } = useAuth();
  const [timetableData, setTimetableData] = useState({});
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState([]);
  const [expandedDays, setExpandedDays] = useState(
    DAYS.reduce((acc, day) => ({ ...acc, [day]: false }), {})
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    day: '',
    timeSlot: '',
    courseDetails: {}
  });
  const [timeSlots, setTimeSlots] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null);

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
      alert('Failed to load academic years');
    }
  };

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

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.teacherId) return; 

      setLoading(true);
      try {
        if (academicYears.length === 0) {
          await fetchAcademicYears();
        }

        const { data: semestersData, error: semestersError } = await supabase
          .from('Semestre')
          .select('*, AcademicYear:AcademicId (AcademicId, label)')
          .order('SemesterId', { ascending: true });

        if (semestersError) throw semestersError;
        setSemesters(semestersData || []);

        // Set the initial selected semester to the current semester
        if (semestersData && semestersData.length > 0) {
          const currentSemester = semestersData.find(semester => {
            if (!semester.StartDate || !semester.EndDate) return false;
            
            const startDate = new Date(semester.StartDate);
            const endDate = new Date(semester.EndDate);
            const currentDate = new Date();
            
            return currentDate >= startDate && currentDate <= endDate;
          });

          if (currentSemester) {
            setSelectedSemester(currentSemester.SemesterId);
          } else {
            // If no current semester, select the first one
            setSelectedSemester(semestersData[0].SemesterId);
          }
        }

        const { data: timeSlotsData, error: timeSlotsError } = await supabase
          .from('SessionTime')
          .select('*')
          .order('TimeId', { ascending: true });

        if (timeSlotsError) throw timeSlotsError;
        setTimeSlots(timeSlotsData || []);

        const { data: classroomsData, error: classroomsError } = await supabase
          .from('Classroom')
          .select('classId, ClassNumber, Location');
        
        if (classroomsError) throw classroomsError;
        setClassrooms(classroomsData || []);

      } catch (error) {
        console.error('Error fetching initial data:', error);
        alert('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, academicYears]);

  useEffect(() => {
    const fetchTimetableData = async () => {
      if (!user?.teacherId || !selectedSemester) return;

      setLoading(true);
      try {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('Session_structure')
          .select(`
            moduleId,
            classId,
            groupId,
            teacherId,
            dayId,
            typeId,
            TimeId,
            Session_structure_id,
            Day:dayId (dayId, dayName),
            Module:moduleId (moduleId, moduleName, SemesterId, SchoolYear:yearId (yearId, yearName, Degree:degreeId (degreeId, degreeName))),
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
            GroupType:typeId (typeId, typeName),
            SessionTime:TimeId (TimeId, label)
          `)
          .eq('teacherId', user.teacherId)
          .eq('Module.SemesterId', selectedSemester);

        if (sessionsError) throw sessionsError;

        const formattedData = {};
        sessionsData?.forEach(session => {
          const dayName = session.Day?.dayName || '';
          const timeSlot = session.SessionTime?.label || '';
          const timeId = session.TimeId || null;
          
          if (!formattedData[dayName]) {
            formattedData[dayName] = {};
          }

          formattedData[dayName][timeSlot] = {
            moduleId: session.moduleId,
            name: session.Module?.moduleName || '',
            groupId: session.groupId,
            group: session.Group?.groupName || '',
            type: session.GroupType?.typeName || '',
            typeId: session.typeId || '',
            year: session.Module?.SchoolYear?.yearName || session.Group?.Section?.SchoolYear?.yearName || '',
            yearId: session.Module?.yearId || session.Group?.Section?.SchoolYear?.yearId || '',
            degree: session.Module?.SchoolYear?.Degree?.degreeName || session.Group?.Section?.SchoolYear?.Degree?.degreeName || '',
            degreeId: session.Module?.SchoolYear?.degreeId || session.Group?.Section?.SchoolYear?.Degree?.degreeId || '',
            sectionId: session.Group?.Section?.sectionId || '',
            classroomId: session.classId,
            room: {
              roomNumber: session.Classroom?.ClassNumber || '',
              location: session.Classroom?.Location || '',
              classId: session.classId
            },
            timeId: timeId,
            timeLabel: timeSlot,
            dayId: session.dayId,
            sessionStructureId: session.Session_structure_id || generateAlphaId()
          };
        });

        setTimetableData(formattedData);
      } catch (error) {
        console.error('Error fetching timetable data:', error);
        alert('Failed to load timetable data');
      } finally {
        setLoading(false);
      }
    };

    fetchTimetableData();
  }, [user, selectedSemester]);

  const toggleDay = (day) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const openCourseDetailsModal = (day, timeSlot) => {
    const slotData = timetableData[day]?.[timeSlot] || {};
    const classroom = classrooms.find(c => c.classId === slotData?.classroomId);
    const timeSlotData = timeSlots.find(t => t.label === timeSlot);
    
    setModalData({
      day,
      timeSlot,
      courseDetails: {
        ...slotData,
        room: {
          roomNumber: classroom?.ClassNumber || slotData.room?.roomNumber || '',
          location: classroom?.Location || slotData.room?.location || '',
          classId: slotData.classroomId || ''
        },
        timeId: timeSlotData?.TimeId || null,
        timeLabel: timeSlot
      }
    });
    setModalOpen(true);
  };

  const handleSaveCourseDetails = (updatedDetails) => {
    setTimetableData(prev => ({
      ...prev,
      [modalData.day]: {
        ...prev[modalData.day],
        [updatedDetails.timeLabel || modalData.timeSlot]: {
          ...updatedDetails,
          sessionStructureId: updatedDetails.sessionStructureId || generateAlphaId()
        }
      }
    }));
    setModalOpen(false);
  };

  const handleDeleteSession = async (day, timeSlot) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    const sessionId = timetableData[day]?.[timeSlot]?.sessionStructureId;
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('Session_structure')
        .delete()
        .eq('Session_structure_id', sessionId);

      if (error) throw error;

      setTimetableData(prev => {
        const newData = { ...prev };
        if (newData[day]) {
          delete newData[day][timeSlot];
        }
        return newData;
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session');
    }
  };

  const handleSaveTimetable = async () => {
    setLoading(true);

    try {
      const sessionsToUpsert = [];
      
      Object.entries(timetableData).forEach(([dayName, daySchedule]) => {
        Object.entries(daySchedule).forEach(([timeSlot, slotData]) => {
          if (slotData && slotData.groupId && slotData.moduleId) {
            const timeSlotData = timeSlots.find(t => t.label === timeSlot);
            
            sessionsToUpsert.push({
              moduleId: slotData.moduleId,
              classId: slotData.classroomId || null,
              groupId: slotData.groupId,
              teacherId: user.teacherId,
              dayId: DAYS.indexOf(dayName) + 1,
              typeId: slotData.typeId || null,
              TimeId: timeSlotData?.TimeId || null,
              Session_structure_id: slotData.sessionStructureId || generateAlphaId()
            });
          }
        });
      });

      await supabase
        .from('Session_structure')
        .delete()
        .eq('teacherId', user.teacherId);

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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">TimeTable</h1>
          <p className="text-gray-600 mt-1">Manage Your Daily Class Schedule</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={selectedSemester || ''}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="appearance-none bg-transparent pr-8 focus:outline-none"
              >
                {semesters
                  .filter(semester => 
                    !currentAcademicYear || semester.AcademicId === currentAcademicYear.AcademicId
                  )
                  .map(semester => (
                    <option key={semester.SemesterId} value={semester.SemesterId}>
                      {semester.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
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
      </div>

      {currentAcademicYear && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600 w-5 h-5" />
            <h2 className="text-lg font-semibold text-blue-800">
              Current Academic Year: {currentAcademicYear.label}
            </h2>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {DAYS.map(day => (
          <div key={day} className="bg-white rounded-4xl shadow-md overflow-hidden">
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
                  {timeSlots.map(timeSlot => {
                    const slotData = timetableData[day]?.[timeSlot.label];
                    const classroom = classrooms.find(c => c.classId === slotData?.classroomId);

                    return (
                      <div 
                        key={timeSlot.TimeId} 
                        className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <h3 className="font-medium text-gray-700">{timeSlot.label}</h3>
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
                                    handleDeleteSession(day, timeSlot.label);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Delete session"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              <button
                                onClick={() => openCourseDetailsModal(day, timeSlot.label)}
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
                                onClick={() => openCourseDetailsModal(day, timeSlot.label)}
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

      {modalOpen && (
        <CourseDetailsModal
          day={modalData.day}
          timeSlot={modalData.timeSlot}
          courseDetails={modalData.courseDetails}
          onSave={handleSaveCourseDetails}
          onClose={() => setModalOpen(false)}
          teacherId={user?.teacherId}
          classrooms={classrooms}
          selectedSemester={selectedSemester}
        />
      )}
    </div>
  );
}