# PDF Inline Preview - COMPLETE

## Feature Implemented

Added inline PDF preview functionality to the chat, allowing users to view PDFs directly in the chat interface without downloading them.

## What Was Added

### Before
```
┌─────────────────────────────────┐
│ 📄  document.pdf                │
│     Click to download       ⬇️  │
└─────────────────────────────────┘
```
- Simple download button
- No preview capability
- Opens file externally

### After
```
┌─────────────────────────────────┐
│ 📄  document.pdf                │
│     Click to preview        ⬇️  │
└─────────────────────────────────┘
        ↓ (Click to expand)
┌─────────────────────────────────┐
│ [PDF Preview - 500px height]    │
│ [Full document rendered inline] │
│ [Scrollable content]            │
├─────────────────────────────────┤
│  [Open Full Screen] [Download]  │
└─────────────────────────────────┘
```

## Features

### 1. Click to Preview
- **PDFs:** Click to toggle inline preview
- **Other docs:** Click to download (DOC, DOCX, TXT)

### 2. Inline PDF Viewer
- **500px height** iframe with full PDF content
- **Scrollable** to view all pages
- **PDF toolbar** enabled for zoom/navigation
- **No navigation panes** (cleaner view)

### 3. Loading State
Shows spinner with "Loading PDF..." message while PDF loads

### 4. Error Handling
If PDF fails to load:
- Shows error message
- Provides "Open in new tab" button as fallback

### 5. Action Buttons
- **Open Full Screen:** Opens PDF in new tab
- **Download:** Downloads PDF file

### 6. Collapsible
- Click header again to collapse the preview
- Icon changes from ⬇️ (Download) to ✕ (Close)

## Technical Implementation

### File Type Detection
```typescript
const getFileExtension = (url: string) => {
  return url.split('.').pop()?.toLowerCase() || '';
};

const isPDF = fileExtension === 'pdf';
```

### PDF Iframe Parameters
```typescript
src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
```

**Parameters:**
- `toolbar=1` - Shows PDF toolbar (zoom, navigation)
- `navpanes=0` - Hides navigation sidebar
- `scrollbar=1` - Shows scrollbar

### Component Structure
```typescript
<div className="flex flex-col gap-2 max-w-lg">
  {/* Document Header - Always visible */}
  <div onClick={isPDF ? togglePreview : handleDownload}>
    <FileText icon />
    <filename />
    <action icon />
  </div>

  {/* PDF Preview - Conditionally rendered */}
  {isPDF && showPreview && (
    <div>
      {/* Loading spinner */}
      {isLoading && <LoadingSpinner />}
      
      {/* Error message */}
      {error && <ErrorMessage />}
      
      {/* PDF iframe */}
      {!error && <iframe src={fileUrl} />}
      
      {/* Action buttons */}
      <ActionButtons />
    </div>
  )}
</div>
```

### State Management
```typescript
const [showPreview, setShowPreview] = useState(false);  // Preview visibility
const [isLoading, setIsLoading] = useState(false);      // Loading state
const [error, setError] = useState(false);              // Error state
```

## User Experience

### For PDF Files

**Step 1: Initial State**
- User sees PDF filename
- "Click to preview" prompt
- Download icon (⬇️)

**Step 2: Click to Preview**
- Loading spinner appears
- PDF loads in iframe
- 500px height preview shows
- Icon changes to close (✕)

**Step 3: Interact with PDF**
- Scroll through pages
- Use PDF toolbar (zoom, navigate)
- Click "Open Full Screen" for full view
- Click "Download" to save file

**Step 4: Collapse**
- Click header again
- Preview collapses
- Returns to initial state

### For Non-PDF Documents

**DOC, DOCX, TXT files:**
- Click to download directly
- No preview available
- Opens/downloads based on browser

## Styling

### Colors & Borders
- **Background:** `bg-gray-50` (header), `bg-white` (preview)
- **Border:** Standard border on preview container
- **Hover:** `hover:bg-gray-100` on header

### Sizing
- **Max Width:** `max-w-lg` (32rem / 512px)
- **Preview Height:** `h-[500px]` (fixed)
- **File Icon:** `h-8 w-8` (32px)
- **Action Icons:** `h-4 w-4` (16px) or `h-3 w-3` (12px)

### Responsive
- Full width up to `max-w-lg`
- Scales down on smaller screens
- Preview maintains aspect ratio

## Browser Compatibility

### PDF Support
- ✅ **Chrome/Edge:** Built-in PDF viewer
- ✅ **Firefox:** Built-in PDF viewer
- ✅ **Safari:** Built-in PDF viewer
- ⚠️ **Mobile:** May open in native PDF app

### Fallbacks
1. **iframe fails:** Error message + "Open in new tab" button
2. **PDF too large:** May take time to load (spinner shown)
3. **CORS issues:** Fallback to external open

## Security Considerations

### iframe Security
```typescript
<iframe
  src={fileUrl}
  title={fileName}
  className="w-full h-[500px] border-0"
  // Inherits page security context
/>
```

**Safe because:**
- Files served from same origin (Supabase storage)
- No `sandbox` attribute needed (same origin)
- Title attribute for accessibility

### XSS Prevention
- Filename decoded with try/catch
- No innerHTML used
- URL directly from trusted source

## Performance

### Loading Strategy
- **On-demand loading:** PDF only loads when preview is opened
- **iframe lazy load:** Browser handles caching
- **State management:** Minimal re-renders

### File Size Handling
- **Small PDFs (<1MB):** Load quickly
- **Medium PDFs (1-5MB):** Loading spinner shows
- **Large PDFs (>5MB):** May be slow, consider download

## Accessibility

### Screen Readers
- `title` attribute on iframe
- Descriptive button text
- Clear loading/error states

### Keyboard Navigation
- Click handler works with Enter/Space
- Buttons are keyboard accessible
- iframe content navigable

## Testing Scenarios

### Test 1: PDF Preview
1. Upload a PDF file
2. Click on the PDF message
3. **Expected:** PDF preview opens inline

### Test 2: Multiple Pages
1. Upload multi-page PDF
2. Open preview
3. Scroll through document
4. **Expected:** All pages visible and scrollable

### Test 3: Large PDF
1. Upload large PDF (>5MB)
2. Click to preview
3. **Expected:** Loading spinner, then preview

### Test 4: Error Handling
1. Upload PDF with invalid/broken URL (for testing)
2. Click to preview
3. **Expected:** Error message + fallback button

### Test 5: Download
1. Open PDF preview
2. Click "Download" button
3. **Expected:** File downloads

### Test 6: Full Screen
1. Open PDF preview
2. Click "Open Full Screen"
3. **Expected:** PDF opens in new tab

### Test 7: Collapse
1. Open PDF preview
2. Click header again
3. **Expected:** Preview collapses

### Test 8: Non-PDF Documents
1. Upload DOC/DOCX file
2. Click on document
3. **Expected:** File downloads (no preview)

## Status
✅ **COMPLETE** - Inline PDF preview fully implemented

## Date
October 18, 2025

## Story
3.4 - Real-time Order Messaging

## Files Updated
1. ✅ `sew4mi/apps/web/components/features/orders/MessageList.tsx`
   - Enhanced `DocumentMessage` component
   - Added PDF preview with iframe
   - Added loading and error states
   - Added action buttons
   - Added collapse functionality
   - Added X icon import

## Notes
- PDF preview uses native browser PDF viewer
- Non-PDF documents still use download-only approach
- Preview is collapsible to save space
- Error handling provides fallback options
- Mobile devices may handle PDFs differently (native apps)

