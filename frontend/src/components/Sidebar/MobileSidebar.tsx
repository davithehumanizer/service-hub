import React, { useContext, useEffect, useState } from 'react';

import SidebarContent from './SidebarContent';
import { Backdrop } from '@windmill/react-ui';

import { SidebarContext } from '../../context/SidebarContext';

// @windmill/react-ui's <Transition> never actually attaches its internal
// ref to the child it animates (children are rendered unmodified, no
// cloneElement), so every classList add/remove it does is gated on a
// ref.current that stays null forever — a no-op. It can only ever show or
// hide instantly. Driving the transition from local state instead, with a
// real DOM className change between frames, is what actually animates.
const LEAVE_DURATION_MS = 200;

function MobileSidebar() {
  const { isSidebarOpen, closeSidebar } = useContext(SidebarContext);
  const [mounted, setMounted] = useState(isSidebarOpen);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (isSidebarOpen) {
      setMounted(true);
      // Mount at the off-screen position first, then flip to "entered" on
      // the next frame so the browser has a painted starting value to
      // transition from — flipping both in the same render would skip
      // straight to the end state with nothing to animate.
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }

    setEntered(false);
    const timeout = setTimeout(() => setMounted(false), LEAVE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [isSidebarOpen]);

  if (!mounted) return null;

  return (
    <>
      <Backdrop
        onClick={closeSidebar}
        className={`transition-opacity ${entered ? 'ease-out duration-200 opacity-100' : 'ease-in duration-150 opacity-0'}`}
      />

      {/* Full-width panel (w-full below), so it reads as a drawer taking
          over the screen: a plain off-canvas slide, from the right where
          its button is. Exit is faster than entrance, per the
          moving-away-vs-arriving convention.

          The slide is an inline `transform` value, not Tailwind's
          translate-x utilities: those only set the --tw-translate-x custom
          property behind a shared .transform class, and browsers don't
          interpolate raw custom-property changes (no @property
          registration here) — the panel would snap instead of sliding. */}
      <aside
        className={`fixed inset-y-0 z-50 flex-shrink-0 w-full mt-16 overflow-y-auto bg-white dark:bg-gray-800 lg:hidden flex flex-col justify-between transition-transform ${entered ? 'ease-out duration-300' : 'ease-in duration-200'}`}
        // scrollbarGutter reserves the scrollbar's width up front so an
        // expanding nav group can't pop one into existence mid-animation
        // and shrink nav labels into wrapping — see DesktopSidebar.tsx.
        style={{ transform: entered ? 'translateX(0)' : 'translateX(100%)', scrollbarGutter: 'stable' }}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default MobileSidebar;
