/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext, useCallback } from "react";
import { supabase } from "../../utils/Supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  X,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GroupManagement = () => {
  const { user } = useAuth();
  const [organizedData, setOrganizedData] = useState([]);
  const [chosenGroups, setChosenGroups] = useState([]);
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [dataStructure, setDataStructure] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);

  // Fetch all available semesters
  const fetchSemesters = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Semestre')
        .select('*')
        .order('StartDate', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching semesters:", error);
      setStatusMessage({ type: "error", text: "Failed to load semesters" });
      setTimeout(() => setStatusMessage(null), 3000);
      return [];
    }
  }, []);

  const fetchTeacherGroups = useCallback(async (semesterId = null) => {
    if (!user?.teacherId) return [];

    try {
      let query = supabase
        .from('Teacher_group')
        .select(`
          groupId,
          semestreId,
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
          ),
          Semestre:semestreId (
            SemesterId,
            label
          )
        `)
        .eq('teacherId', user.teacherId);

      if (semesterId) {
        query = query.eq('semestreId', semesterId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(item => ({
        groupId: item.groupId,
        groupName: item.Group.groupName,
        degreeName: item.Group.Section?.SchoolYear?.Degree?.degreeName || "Unknown Degree",
        yearName: item.Group.Section?.SchoolYear?.yearName || "Unknown Year",
        sectionName: item.Group.Section?.sectionName || "Unknown Section",
        filePath: item.Group.group_path || "Unknown Path",
        semesterId: item.semestreId,
        semesterLabel: item.Semestre?.label || "No Semester"
      }));
    } catch (error) {
      console.error("Error fetching teacher groups:", error);
      setStatusMessage({ type: "error", text: "Failed to load assigned groups" });
      setTimeout(() => setStatusMessage(null), 3000);
      return [];
    }
  }, [user]);

  const fetchAllGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Group')
        .select(`
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
        `)
        .eq('Section.SchoolYear.branchId', user.branchId);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching all groups:", error);
      setStatusMessage({ type: "error", text: "Failed to load available groups" });
      setTimeout(() => setStatusMessage(null), 3000);
      return [];
    }
  }, [user]);

  const buildDataStructure = useCallback((groups, assignedGroups) => {
    const degrees = {};
    
    groups.forEach(group => {
      const section = group.Section;
      const schoolYear = section?.SchoolYear;
      const degree = schoolYear?.Degree;
      const filePath = group.group_path;
      
      if (!degree || !schoolYear || !section) return;

      if (!degrees[degree.degreeId]) {
        degrees[degree.degreeId] = {
          id: `degree-${degree.degreeId}`,
          name: degree.degreeName,
          type: 'degree',
          years: {},
          expanded: expandedItems[`degree-${degree.degreeId}`] || false
        };
      }

      if (!degrees[degree.degreeId].years[schoolYear.yearId]) {
        degrees[degree.degreeId].years[schoolYear.yearId] = {
          id: `year-${schoolYear.yearId}`,
          name: schoolYear.yearName,
          type: 'year',
          sections: {},
          expanded: expandedItems[`year-${schoolYear.yearId}`] || false
        };
      }

      if (!degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId]) {
        degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId] = {
          id: `section-${section.sectionId}`,
          name: section.sectionName,
          type: 'section',
          files: {},
          expanded: expandedItems[`section-${section.sectionId}`] || false
        };
      }

      const fileKey = filePath || 'no-path';
      if (!degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId].files[fileKey]) {
        degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId].files[fileKey] = {
          id: `file-${fileKey}`,
          name: filePath?.split(/[\\/]/).pop() || "No File Path",
          path: filePath,
          type: 'file',
          groups: [],
          expanded: expandedItems[`file-${fileKey}`] || false,
          degreeName: degree.degreeName,
          yearName: schoolYear.yearName,
          sectionName: section.sectionName
        };
      }

      degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId].files[fileKey].groups.push({
        groupId: group.groupId,
        groupName: group.groupName,
        studentCount: 0,
        isAssigned: assignedGroups.some(g => g.groupId === group.groupId),
        semesterId: assignedGroups.find(g => g.groupId === group.groupId)?.semesterId || null,
        semesterLabel: assignedGroups.find(g => g.groupId === group.groupId)?.semesterLabel || "No Semester"
      });
    });

    return degrees;
  }, [expandedItems]);

  const buildRenderData = useCallback((degrees) => {
    const renderData = [];
    
    Object.values(degrees).forEach(degree => {
      renderData.push(degree);
      
      if (degree.expanded) {
        Object.values(degree.years).forEach(year => {
          renderData.push(year);
          
          if (year.expanded) {
            Object.values(year.sections).forEach(section => {
              renderData.push(section);
              
              if (section.expanded) {
                Object.values(section.files).forEach(file => {
                  renderData.push(file);
                });
              }
            });
          }
        });
      }
    });

    return renderData;
  }, []);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const [teacherGroups, allGroups, semesterData] = await Promise.all([
        fetchTeacherGroups(selectedSemester),
        fetchAllGroups(),
        fetchSemesters()
      ]);

      setSemesters(semesterData);
      setAssignedGroups(teacherGroups);
      setChosenGroups(teacherGroups);

      const degrees = buildDataStructure(allGroups, teacherGroups);
      const renderData = buildRenderData(degrees);
      
      setDataStructure(degrees);
      setOrganizedData(renderData);
    } catch (err) {
      console.error("Failed to load data:", err);
      setStatusMessage({ type: "error", text: "Failed to load group data" });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, fetchTeacherGroups, fetchAllGroups, buildDataStructure, buildRenderData, fetchSemesters, selectedSemester]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedSemester]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const newState = {
        ...prev,
        [id]: !prev[id]
      };
      
      const degrees = JSON.parse(JSON.stringify(dataStructure));
      Object.values(degrees).forEach(degree => {
        degree.expanded = newState[degree.id] || false;
        Object.values(degree.years).forEach(year => {
          year.expanded = newState[year.id] || false;
          Object.values(year.sections).forEach(section => {
            section.expanded = newState[section.id] || false;
          });
        });
      });
      
      const renderData = buildRenderData(degrees);
      setOrganizedData(renderData);
      
      return newState;
    });
  };

  const toggleGroupSelection = (file, group) => {
    setChosenGroups(prev => {
      const existingIndex = prev.findIndex(g => g.groupId === group.groupId);
      
      if (existingIndex >= 0) {
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        return [...prev, { 
          ...group,
          fileId: file.id,
          fileName: file.name,
          degreeName: file.degreeName,
          yearName: file.yearName,
          sectionName: file.sectionName,
          semesterId: selectedSemester,
          semesterLabel: semesters.find(s => s.SemesterId === selectedSemester)?.label || "No Semester"
        }];
      }
    });
  };

  const isGroupSelected = (groupId) => {
    return chosenGroups.some(g => g.groupId === groupId);
  };

  const isGroupAssigned = (groupId) => {
    return assignedGroups.some(g => g.groupId === groupId);
  };

  const removeGroup = (groupId) => {
    setChosenGroups(chosenGroups.filter(g => g.groupId !== groupId));
  };

  const saveSelectedGroups = async () => {
    if (!user?.teacherId) {
      setStatusMessage({ type: "error", text: "Teacher ID not found" });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (!selectedSemester) {
      setStatusMessage({ type: "error", text: "Please select a semester first" });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    try {
      setSaving(true);
      
      // First, delete all existing assignments for this teacher in this semester
      const { error: deleteError } = await supabase
        .from('Teacher_group')
        .delete()
        .eq('teacherId', user.teacherId)
        .eq('semestreId', selectedSemester);

      if (deleteError) throw deleteError;

      // Then insert the new assignments
      if (chosenGroups.length > 0) {
        const insertData = chosenGroups.map(group => ({
          teacherId: user.teacherId,
          groupId: group.groupId,
          semestreId: selectedSemester
        }));

        const { error: insertError } = await supabase
          .from('Teacher_group')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      const updatedGroups = await fetchTeacherGroups(selectedSemester);
      setAssignedGroups(updatedGroups);
      
      setStatusMessage({ type: "success", text: "Groups saved successfully!" });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Error saving groups:", error);
      setStatusMessage({ type: "error", text: "Failed to save groups" });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = (item) => {
    switch (item.type) {
      case 'degree':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-emerald-700 rounded-lg p-4 mb-2 shadow-md"
          >
            <button 
              className="flex items-center w-full text-left"
              onClick={() => toggleExpand(item.id)}
            >
              {item.expanded ? (
                <ChevronDown className="text-white mr-2" size={20} />
              ) : (
                <ChevronRight className="text-white mr-2" size={20} />
              )}
              <span className="text-white font-semibold text-lg">{item.name}</span>
            </button>
          </motion.div>
        );
      
      case 'year':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-emerald-50 rounded-md p-3 ml-4 mb-1 shadow-sm"
          >
            <button 
              className="flex items-center w-full text-left"
              onClick={() => toggleExpand(item.id)}
            >
              {item.expanded ? (
                <ChevronDown className="text-emerald-700 mr-2" size={18} />
              ) : (
                <ChevronRight className="text-emerald-700 mr-2" size={18} />
              )}
              <span className="text-emerald-700 font-medium">{item.name}</span>
              <span className="ml-auto text-sm text-emerald-700">
                {Object.keys(item.sections).length} Sections
              </span>
            </button>
          </motion.div>
        );
      
      case 'section':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-sm p-2 ml-8 mb-1 shadow-xs border border-gray-100"
          >
            <button 
              className="flex items-center w-full text-left"
              onClick={() => toggleExpand(item.id)}
            >
              {item.expanded ? (
                <ChevronDown className="text-emerald-700 mr-2" size={16} />
              ) : (
                <ChevronRight className="text-emerald-700 mr-2" size={16} />
              )}
              <span className="text-emerald-700">{item.name}</span>
            </button>
          </motion.div>
        );
      
      case 'file':
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-md p-3 ml-12 mb-2 shadow-sm border border-gray-100"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {item.groups.map(group => (
                <motion.button
                  key={group.groupId}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center justify-between p-3 rounded border ${
                    isGroupSelected(group.groupId) 
                      ? 'border-emerald-300 bg-emerald-50' 
                      : group.isAssigned 
                        ? 'border-amber-200 bg-amber-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleGroupSelection(item, group)}
                >
                  <div className="text-left">
                    <div className="font-medium text-gray-800">{group.groupName}</div>
                    {group.isAssigned && !isGroupSelected(group.groupId) && (
                      <div className="text-xs text-amber-600 mt-1">
                        {group.semesterLabel}
                      </div>
                    )}
                  </div>
                  {isGroupSelected(group.groupId) ? (
                    <CheckSquare className="text-emerald-600" size={18} />
                  ) : (
                    <Square className="text-gray-300" size={18} />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-md shadow-lg flex items-center ${
                statusMessage.type === "success" 
                  ? "bg-emerald-100 text-emerald-800" 
                  : "bg-red-100 text-red-800"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="mr-2" size={18} />
              ) : (
                <AlertCircle className="mr-2" size={18} />
              )}
              {statusMessage.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Group Management</h1>
            <p className="text-gray-600 mt-1">Manage your assigned student groups</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setShowSemesterFilter(!showSemesterFilter)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 w-full sm:w-auto justify-between sm:justify-start"
              >
                <div className="flex items-center gap-2">
                  <Filter size={18} />
                  {selectedSemester 
                    ? semesters.find(s => s.SemesterId === selectedSemester)?.label || "Select Semester"
                    : "Select Semester"}
                </div>
                <ChevronDown size={16} className={`transition-transform ${showSemesterFilter ? 'rotate-180' : ''}`} />
              </button>
              
              {showSemesterFilter && (
                <div className="absolute right-0 sm:left-0 mt-2 w-full sm:w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <div className="py-1 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedSemester(null);
                        setShowSemesterFilter(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${!selectedSemester ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-100'}`}
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
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 w-full sm:w-auto justify-center"
            >
              {refreshing ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <RefreshCw size={18} />
              )}
              <span className="sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin text-emerald-600 mb-4">
              <RefreshCw size={32} />
            </div>
            <p className="text-gray-600">Loading groups...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 order-1 lg:order-none">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Groups</h2>
                
                {organizedData.length > 0 ? (
                  <div className="space-y-2">
                    {organizedData.map(item => (
                      <div key={item.id}>
                        {renderItem(item)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No groups available
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 order-0 lg:order-none">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:sticky lg:top-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Selected Groups</h2>
                  <span className="bg-emerald-600 text-white text-sm font-medium px-2 py-1 rounded-full">
                    {chosenGroups.length}
                  </span>
                </div>
                
                {selectedSemester && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-sm font-medium text-blue-800">
                      Semester: {semesters.find(s => s.SemesterId === selectedSemester)?.label || "Unknown"}
                    </div>
                  </div>
                )}

                {chosenGroups.length > 0 ? (
                  <div className="space-y-3">
                    <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-2">
                      {chosenGroups.map(group => (
                        <motion.div
                          key={group.groupId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-2"
                        >
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium text-gray-800">{group.groupName}</div>
                              <div className="text-xs text-emerald-600">
                                {group.degreeName} • {group.yearName} • {group.sectionName}
                              </div>
                              {group.semesterLabel && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {group.semesterLabel}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => removeGroup(group.groupId)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <button
                      onClick={saveSelectedGroups}
                      disabled={saving || !selectedSemester}
                      className={`w-full mt-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                        saving
                          ? 'bg-emerald-400'
                          : !selectedSemester
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                      } text-white transition-colors`}
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="animate-spin" size={18} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          {chosenGroups.some(g => isGroupAssigned(g.groupId)) 
                            ? "Update Assignments" 
                            : "Save Assignments"}
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {selectedSemester ? "No groups selected" : "Please select a semester first"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupManagement;