/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/Supabase';
import { useAuth } from '../../hooks/useAuth';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, CheckCircle, User, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Attendance() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    courseName,
    groupId,
    groupName,
    sessionId
  } = location.state || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [markedStudents, setMarkedStudents] = useState({});
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [allAttendanceMarked, setAllAttendanceMarked] = useState(false);
  const timerRef = useRef(null);

  // Cleanup function to delete session and attendance
  const cleanupSession = async () => {
    try {
      // Delete attendance records first (foreign key constraint)
      const { error: attendanceError } = await supabase
        .from('Attendance')
        .delete()
        .eq('sessionId', sessionId);

      if (attendanceError) throw attendanceError;

      // Then delete the session
      const { error: sessionError } = await supabase
        .from('Session')
        .delete()
        .eq('sessionId', sessionId);

      if (sessionError) throw sessionError;

      console.log('Session and attendance records cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  // Check if all attendance is marked in database
  useEffect(() => {
    const checkAllAttendanceMarked = async () => {
      if (!sessionId || studentsList.length === 0) return;
      
      try {
        const { count, error } = await supabase
          .from('Attendance')
          .select('*', { count: 'exact' })
          .eq('sessionId', sessionId);

        if (error) throw error;

        setAllAttendanceMarked(count === studentsList.length);
      } catch (error) {
        console.error('Error checking attendance records:', error);
      }
    };

    checkAllAttendanceMarked();
  }, [sessionId, studentsList, markedStudents]);

  // Handle cleanup on component unmount or page refresh
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      if (!allAttendanceMarked) {
        e.preventDefault();
        await cleanupSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [allAttendanceMarked, sessionId]);

  // Fetch students for the group
  useEffect(() => {
    const fetchStudents = async () => {
      if (!groupId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('StudentGroup')
          .select(`
            matricule,
            Student (
              matricule,
              firstName,
              lastName
            )
          `)
          .eq('groupId', groupId);

        if (error) throw error;

        const mappedStudents = data.map(item => ({
          matricule: item.matricule,
          name: `${item.Student.firstName} ${item.Student.lastName || ''}`,
          groupId: groupId
        }));

        setStudentsList(mappedStudents);
      } catch (error) {
        console.error('Error fetching students:', error);
        alert('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [groupId]);

  // Check existing attendance marks
  useEffect(() => {
    const checkExistingAttendance = async () => {
      if (!studentsList.length || !sessionId) return;
      
      try {
        const { data, error } = await supabase
          .from('Attendance')
          .select('matricule, presence')
          .eq('sessionId', sessionId)
          .in('matricule', studentsList.map(s => s.matricule));

        if (error) throw error;

        const existingMarks = {};
        data.forEach(record => {
          existingMarks[record.matricule] = {
            status: record.presence === 1.0 ? 'present' : 'absent'
          };
        });

        setMarkedStudents(existingMarks);
      } catch (error) {
        console.error('Error fetching existing attendance:', error);
      }
    };

    checkExistingAttendance();
  }, [sessionId, studentsList]);

  // Save attendance to database
  const saveAttendance = async (matricule, isPresent) => {
    try {
      const { error } = await supabase
        .from('Attendance')
        .insert({
          matricule: matricule,
          sessionId: sessionId,
          presence: isPresent ? 1.0 : 0.0,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance');
      return false;
    }
  };

  // Mark student as present
  const markPresent = async () => {
    const student = studentsList[currentIndex];
    const saved = await saveAttendance(student.matricule, true);
    
    if (saved) {
      setMarkedStudents({
        ...markedStudents,
        [student.matricule]: { status: 'present' }
      });
      
      if (currentIndex < studentsList.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  // Mark student as absent
  const markAbsent = async () => {
    const student = studentsList[currentIndex];
    const saved = await saveAttendance(student.matricule, false);
    
    if (saved) {
      setMarkedStudents({
        ...markedStudents,
        [student.matricule]: { status: 'absent' }
      });
      
      if (currentIndex < studentsList.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  // Navigation functions
  const goNext = () => {
    if (currentIndex < studentsList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Finish session
  const finishSession = async () => {
    try {
      const { error } = await supabase
        .from('Session')
        .update({ confirm: 1 })
        .eq('sessionId', sessionId);

      if (error) throw error;

      alert('Session completed successfully!');
      navigate(`/user/${user.teacherId}/`);
    } catch (error) {
      console.error('Error confirming session:', error);
      alert('Failed to complete session');
    }
  };

  // Exit session with cleanup
  const exitSession = async () => {
    setShowExitConfirm(false);
    try {
      await cleanupSession();
      navigate(`/user/${user.teacherId}/`);
    } catch (error) {
      console.error('Error during session exit:', error);
      alert('Failed to properly exit session');
    }
  };

  // Current student data
  const student = studentsList[currentIndex];
  const studentStatus = student ? markedStudents[student.matricule]?.status : null;
  const isPresent = studentStatus === 'present';
  const isAbsent = studentStatus === 'absent';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#006633] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  if (!courseName || !groupId || !sessionId) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-amber-600 bg-amber-50 p-4 rounded-lg">
            No valid session data available. Please start a session from the sessions page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#006633] text-white py-4 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Mark Attendance</h1>
            <p className="text-sm opacity-90">{courseName} - {groupName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              Session: {sessionId}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Student Card */}
        <AnimatePresence mode="wait">
          {student ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-xl shadow-md overflow-hidden mb-8 border-l-4"
              style={{
                borderLeftColor: isPresent 
                  ? '#006633' 
                  : isAbsent 
                    ? '#dc3545' 
                    : '#e5e7eb'
              }}
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="text-gray-400" size={20} />
                      <span className="text-xs font-medium text-gray-500">Student ID: {student.matricule}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{student.name}</h2>
                    
                    <div className="flex items-center space-x-2 mb-6">
                      <Users className="text-gray-400" size={18} />
                      <span className="text-gray-600">{groupName}</span>
                    </div>

                    {(isPresent || isAbsent) && (
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-6 ${
                        isPresent 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isPresent ? (
                          <>
                            <CheckCircle2 className="mr-1" size={16} />
                            Marked Present
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1" size={16} />
                            Marked Absent
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                  <div 
                    className="bg-[#006633] h-2 rounded-full" 
                    style={{ width: `${((currentIndex + 1) / studentsList.length) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Student {currentIndex + 1} of {studentsList.length}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-gray-600">No student data available</p>
            </div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={markPresent}
            className={`flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-all ${
              isPresent 
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            <CheckCircle className="mr-2" size={20} />
            {isPresent ? 'Marked Present' : 'Present'}
          </button>
          
          <button
            onClick={markAbsent}
            className={`flex items-center justify-center py-3 px-4 rounded-lg font-medium transition-all ${
              isAbsent 
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
          >
            <XCircle className="mr-2" size={20} />
            {isAbsent ? 'Marked Absent' : 'Absent'}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={goPrevious}
            disabled={currentIndex === 0}
            className={`flex items-center py-2 px-4 rounded-lg font-medium ${
              currentIndex === 0 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="mr-1" size={18} />
            Previous
          </button>
          
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {studentsList.length}
          </span>
          
          <button
            onClick={goNext}
            disabled={currentIndex === studentsList.length - 1}
            className={`flex items-center py-2 px-4 rounded-lg font-medium ${
              currentIndex === studentsList.length - 1
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Next
            <ChevronRight className="ml-1" size={18} />
          </button>
        </div>

        {/* Finish Session Button - Only shows when all attendance is marked in DB */}
        {allAttendanceMarked && (
          <button
            onClick={finishSession}
            className="w-full bg-[#006633] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#005a2d] transition-colors shadow-md flex items-center justify-center"
          >
            <CheckCircle2 className="mr-2" size={20} />
            Finish Session
          </button>
        )}

        {/* Exit Button */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => setShowExitConfirm(true)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Exit Attendance
          </button>
        </div>
      </main>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Exit Attendance?</h3>
            <p className="text-gray-600 mb-4">
              This will cancel the current session and delete all attendance records.
              Are you sure you want to continue?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Continue Session
              </button>
              <button
                onClick={exitSession}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Cancel Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}