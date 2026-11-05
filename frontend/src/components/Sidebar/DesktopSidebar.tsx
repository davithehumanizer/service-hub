import React from 'react';
import SidebarContent from './SidebarContent';

function DesktopSidebar() {
  return (
    <aside
      className="z-30 flex-shrink-0 hidden w-64 overflow-y-auto bg-white dark:bg-gray-800 lg:flex lg:flex-col justify-between"
      // Reserves the scrollbar's width up front, whether or not it's
      // currently showing. Without this, expanding a nav group can push
      // the sidebar's content past its own height for the first time,
      // popping a scrollbar into existence mid-animation — and the width
      // it eats shrinks every nav label just enough to wrap text that fit
      // fine a moment earlier.
      style={{ scrollbarGutter: 'stable' }}
    >
      <SidebarContent />
    </aside>
  );
};

export default DesktopSidebar;
