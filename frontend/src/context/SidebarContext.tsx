import React, { useState, useMemo } from 'react';

// create context
interface ISidebarContext{
  isSidebarOpen: boolean
  closeSidebar: () => void
  toggleSidebar: () => void
}

export const SidebarContext = React.createContext<ISidebarContext>({ isSidebarOpen: false, closeSidebar: () => {  }, toggleSidebar: () => {} });

interface ISidebarPovider{ children: React.ReactNode }

export const SidebarProvider = ({ children }: ISidebarPovider) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  function toggleSidebar() {
    setIsSidebarOpen(!isSidebarOpen)
    console.log("SidebarContext.tsx: isSidebarOpen: ", isSidebarOpen);
  }

  function closeSidebar() {
    setIsSidebarOpen(false)
    
    console.log("SidebarContext.tsx: Sidebar closed");
  }

  const value = useMemo(
    
    () => ({
      isSidebarOpen,
      toggleSidebar,
      closeSidebar,
    }),
    [isSidebarOpen, toggleSidebar]
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}
