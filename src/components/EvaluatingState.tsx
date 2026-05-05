import React, { memo } from "react";

export const EvaluatingState = memo(function EvaluatingState() {
  return (
    <div className="app-evaluating">
      <div className="app-evaluating__icon-wrap">
        <svg className="app-svg-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
      <div>
        <p className="app-evaluating__title">Evaluating against Karl standards</p>
        <p className="app-evaluating__sub">Checking SF.gov best practices and content standards…</p>
      </div>
    </div>
  );
});