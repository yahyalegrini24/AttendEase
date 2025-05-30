import Sidebar from "./SideBar"; // Adjust the import path as needed

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
        {children} {/* This is where your page content will be rendered */}
      </div>
    </div>
  );
};

export default Layout;