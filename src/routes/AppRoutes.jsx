import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import Sessions from '../pages/Sessions/Sessions';
import Attendance from '../pages/Sessions/Attendance'
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import ProtectedRoute from './ProtectedRoute';
import TimeTable from '../pages/TimeTable/TimeTable'; // Make sure to import TimeTable
import StudentsLists from '../pages/StudentsLists/ChooseLists'; // Import if needed
import ExportPage from '../pages/Export/ExportPage'; // Import if needed
import EditSession from '../pages/EditSession/EditSession'; // Import if needed

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Sessions />} />
            <Route path="profile" element={<Profile />} />
            <Route path="time-table" element={<TimeTable />} />
            <Route path="students-lists" element={<StudentsLists />} />
            <Route path="export-page" element={<ExportPage />} />
            <Route path="edit-session" element={<EditSession />} />


            {/* Nested routes inside sessions page */}
           <Route path='sessions'>
            <Route index element={<Sessions />} />
             <Route path=':sessionId/attendance' element={<Attendance />} />
            </Route>
           </Route>
        </Route>
      </Routes>
    </Router>
  );
}