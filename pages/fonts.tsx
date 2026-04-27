// Font preview page — renders the static font-preview.html via an iframe.
// This page is dev/design-only and is intentionally not linked in the main navbar.
// Access it manually at /fonts to compare typeface options.
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
