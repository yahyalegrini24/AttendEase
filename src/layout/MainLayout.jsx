import Sidebar from "../components/SideBar";
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-4">
        <Outlet /> {/* This will render the matched child route */}
      </main>
    </div>
  );
}