import LayoutS from "../components/LayoutS";
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <LayoutS>
    <div className="flex">
     
      <main className="flex-1 p-4">
        <Outlet /> {/* This will render the matched child route */}
      </main>
    </div>
    </LayoutS>
  );
}