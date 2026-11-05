import React from "react";
import RepairDeclarationBanner from "../components/RepairDeclaration/RepairDeclarationBanner";

interface IMain{
  children: React.ReactNode
  /* Une page qui occupe elle-même toute la hauteur restante : ni la gouttière
     `container`, ni le bandeau, ni le défilement vertical de `main`. */
  fullBleed?: boolean
};

function Main({ children, fullBleed = false }: IMain) {
  if (fullBleed) {
    return (
      <main className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto">
      {/* Renders nothing until a journey recorded here is old enough to ask
          about, so it costs a store read on pages where there is none. */}
      <div className="container px-6 mx-auto pt-4">
        <RepairDeclarationBanner />
      </div>
      {/* `grid` (display: grid) here had no layout purpose — a single child,
          no grid-template-columns, no placement props — but CSS Grid's implicit
          track still sizes to its content's max-content width, and a flex-wrap
          descendant's max-content contribution is computed as if nothing
          wrapped. Net effect: any page with a wide flex-wrap row silently blew
          the whole content column out to that row's unwrapped width, pushing
          everything else past the viewport regardless of its own responsive
          classes. Plain block layout has no such implicit sizing step. */}
      <div className="container px-6 mx-auto">{children}</div>
    </main>
  );
};

export default Main;