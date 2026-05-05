import React, { memo } from "react";

export const StreamRenderer = memo(function StreamRenderer({ text }: { text: string }) {
  return (
    <div className="streamRenderer">
      {text.split("\n").map((line, i) => {
        const isH = /^(PAGE NAME:|PRIMARY USER:|PAGE TYPE:|USER GOAL:|PRIMARY PURPOSE:|SYSTEM RELATIONSHIPS:|ENFORCEMENT CHECK:|INTEGRATION NOTES:|PAGE DRAFT|RECOMMENDED COMPONENTS:|DUPLICATION RISKS:)/.test(line);
        const isDH = /^#{1,3} /.test(line);
        const isKarl = /^\[Querying Karl/.test(line);
        const lineClass = [
          "streamRenderer__line",
          isKarl ? "streamRenderer__line--karl" : "",
          !isKarl && (isH || isDH) ? "streamRenderer__line--key" : ""
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={i} className={lineClass}>
            {line || " "}
          </div>
        );
      })}
      <span className="streamRenderer__cursor" aria-hidden="true" />
    </div>
  );
});