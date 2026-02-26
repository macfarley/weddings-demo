import React from "react";
import "../styles/pages/fonts.css";

const FontPreview = () => {
  return (
    <div className="fonts-preview-container">
      <iframe
        src="/font-preview.html"
        title="Font Preview"
        className="fonts-preview-iframe"
      />
    </div>
  );
};

export default FontPreview;
