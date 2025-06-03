import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/Supabase';
import { UserX, CheckCircle2, Clock, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

export default function JustifyAbsences() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, moduleName, groupName } = location.state || {};
  const [absentees, setAbsentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [justifying, setJustifying] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(null);

  const fetchAbsentees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Attendance')
        .select(`
          matricule,
          Student (
            firstName,
            lastName
          )
        `)
        .eq('sessionId', sessionId)
        .eq('presence', 0);
      
      if (error) throw error;
      setAbsentees(data || []);
    } catch (error) {
      console.error('Error fetching absentees:', error);
      setAbsentees([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      navigate('/sessions');
      return;
    }
    fetchAbsentees();
  }, [sessionId, navigate, fetchAbsentees]);

  const handleJustify = async (matricule) => {
    setJustifying(matricule);
    try {
      const { error } = await supabase
        .from('Attendance')
        .update({ presence: 0.5 })
        .eq('sessionId', sessionId)
        .eq('matricule', matricule);
      
      if (!error) {
        setAbsentees(prev => prev.filter(a => a.matricule !== matricule));
        setExpanded(null);
        setShowConfirmation(matricule);
        setTimeout(() => setShowConfirmation(null), 3000);
      }
    } catch (error) {
      console.error('Error justifying absence:', error);
    } finally {
      setJustifying(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Justify Student Absences</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Module</p>
              <p className="font-medium text-gray-800">{moduleName || 'Not specified'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Group</p>
              <p className="font-medium text-gray-800">{groupName || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Confirmation Message */}
        {showConfirmation && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
            <CheckCircle className="h-5 w-5" />
            <span>Absence successfully justified!</span>
          </div>
        )}

        {/* Absentees List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : absentees.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {absentees.map((item) => {
                const isExpanded = expanded === item.matricule;
                const studentName = `${item.Student?.firstName || ''} ${item.Student?.lastName || ''}`.trim();
                
                return (
                  <li key={item.matricule} className="hover:bg-gray-50 transition-colors">
                    <div 
                      className={`p-4 ${isExpanded ? 'bg-emerald-50' : ''}`}
                      onClick={() => setExpanded(isExpanded ? null : item.matricule)}
                    >
                      <div className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-full bg-red-100 text-red-500">
                            <UserX className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {studentName || 'Unknown Student'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Matricule: {item.matricule}
                            </p>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pl-12 pr-2">
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-3">
                              Confirm justification for this absence?
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJustify(item.matricule);
                              }}
                              disabled={justifying === item.matricule}
                              className={`flex items-center justify-center space-x-2 w-full py-2 px-4 rounded-md ${
                                justifying === item.matricule
                                  ? 'bg-emerald-500'
                                  : 'bg-emerald-600 hover:bg-emerald-700'
                              } text-white transition-colors`}
                            >
                              {justifying === item.matricule ? (
                                <>
                                  <Clock className="w-4 h-4" />
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Justify Absence</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center p-10">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">No absent students</h3>
              <p className="text-gray-500">
                All students were present for this session.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}