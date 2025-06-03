/* eslint-disable no-unused-vars */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import Sessions from '../pages/Sessions/Sessions';
import Attendance from '../pages/Sessions/Attendance';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import ProtectedRoute from './ProtectedRoute';
import TimeTable from '../pages/TimeTable/TimeTable';
import StudentsLists from '../pages/StudentsLists/ChooseLists';
import ExportPage from '../pages/Export/ExportPage';
import EditSession from '../pages/EditSession/EditSession';
import Justify from '../pages/EditSession/Justify';

import { useAuth } from '../hooks/useAuth';

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/user/:userId" element={<MainLayout />}>
            <Route index element={<Sessions />} />
            <Route path="profile" element={<Profile />} />
            <Route path="time-table" element={<TimeTable />} />
            <Route path="students-lists" element={<StudentsLists />} />
            <Route path="export-page" element={<ExportPage />} />
            <Route path="edit-session" element={<EditSession />} />
            <Route path="sessions">
              <Route index element={<Sessions />} />
              <Route path=":sessionId/attendance" element={<Attendance />} />
            </Route>
            <Route path="edit-session">
              <Route index element={<EditSession />} />
              <Route path=":sessionId/justify" element={<Justify />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}