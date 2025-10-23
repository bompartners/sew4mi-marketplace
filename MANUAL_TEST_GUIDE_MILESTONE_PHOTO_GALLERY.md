# Manual Testing Guide: MilestonePhotoGallery Component

**Component:** `MilestonePhotoGallery`  
**Location:** `sew4mi/apps/web/components/features/orders/MilestonePhotoGallery.tsx`  
**Story:** 3.4 - Order Progress Tracking  
**Date:** October 19, 2025

---

## Where to Find the Component

The `MilestonePhotoGallery` component is used in the **Order Tracking Page** to display milestone photos for an order.

### Navigation Path

1. **Start the development server:**
   ```bash
   cd sew4mi/apps/web
   npm run dev
   ```

2. **Navigate to an order detail page:**
   - URL pattern: `/orders/[order-id]`
   - Example: `http://localhost:3000/orders/order-123`

3. **Component Location on Page:**
   - The photo gallery appears within the **OrderTrackingPage** component
   - Look for the "Milestone Photos" or "Progress Photos" section
   - It's typically shown in a tab or section alongside the progress timeline

---

## Prerequisites for Testing

### 1. Create Test Order with Milestones

You'll need an order that has milestone photos. Use one of these approaches:

**Option A: Use existing test data**
```bash
cd C:\dev\sew4mi-marketplace
node setup-test-data.js
```

**Option B: Create order manually in UI**
1. Log in as a customer
2. Create a new order with a tailor
3. Have the tailor upload milestone photos (or use admin panel)

### 2. Required Test Data

For comprehensive testing, ensure your test order has:
- ✅ At least 3 milestones with photos
- ✅ Mix of approval statuses (PENDING, APPROVED, REJECTED)
- ✅ Milestone notes/descriptions
- ✅ Different milestone types (FABRIC_SELECTED, CUTTING_STARTED, etc.)

---

## Manual Test Checklist

### 🎯 AC #2: Photo Updates at Each Stage

#### Test 1: Basic Photo Gallery Display

**Steps:**
1. Navigate to order detail page `/orders/[order-id]`
2. Scroll to the milestone photos section

**Expected Results:**
- [ ] Photos displayed in responsive grid layout (2 cols mobile, 3 cols tablet, 4 cols desktop)
- [ ] Each photo shows:
  - [ ] Milestone icon (🧵, ✂️, 👔, etc.)
  - [ ] Milestone name
  - [ ] Verification date
  - [ ] Approval status badge (APPROVED/PENDING/REJECTED)
- [ ] Loading skeleton shown while images load
- [ ] Hover effect on photos (zoom icon appears)

#### Test 2: Photo Modal Opening

**Steps:**
1. Click on any milestone photo in the gallery
2. Wait for modal to open

**Expected Results:**
- [ ] Full-screen modal opens
- [ ] Photo displayed at larger size
- [ ] Modal header shows:
  - [ ] Milestone icon and name
  - [ ] Approval status badge
  - [ ] Verification date
- [ ] Zoom controls visible (+ and - buttons, percentage display)
- [ ] Navigation buttons visible (Previous/Next)
- [ ] Close button (X icon) visible
- [ ] If notes exist, they appear at bottom in quotes
- [ ] External link and download buttons (if enabled)

#### Test 3: Photo Modal Navigation

**Steps:**
1. Open modal on first photo
2. Click "Next" button
3. Click "Previous" button
4. Use arrow keys: Right arrow → Left arrow ←

**Expected Results:**
- [ ] Next button navigates to next photo
- [ ] Previous button navigates to previous photo
- [ ] Right arrow key navigates to next photo
- [ ] Left arrow key navigates to previous photo
- [ ] Previous disabled on first photo
- [ ] Next disabled on last photo
- [ ] Photo and milestone info update correctly
- [ ] Milestone notes update if present

#### Test 4: Zoom Functionality

**Steps:**
1. Open any photo modal
2. Click zoom in (+) button multiple times
3. Click zoom out (-) button
4. Try mouse wheel + Ctrl (if on desktop)
5. Try pinch gestures (if on mobile)

**Expected Results:**
- [ ] Zoom in button increases photo size
- [ ] Zoom out button decreases photo size
- [ ] Zoom percentage displays correctly (100%, 150%, 200%, etc.)
- [ ] Can zoom up to 300% (3x)
- [ ] Can zoom down to 50% (0.5x)
- [ ] When zoomed in, can drag/pan the photo
- [ ] Cursor changes to grab/grabbing when zoomed
- [ ] Zoom resets when changing photos

#### Test 5: Keyboard Navigation

**Steps:**
1. Open photo modal
2. Press these keys:
   - `Escape` - close modal
   - `→` (Right arrow) - next photo
   - `←` (Left arrow) - previous photo
   - `+` or `=` - zoom in
   - `-` - zoom out

**Expected Results:**
- [ ] Escape closes the modal
- [ ] Arrow keys navigate between photos
- [ ] +/- keys control zoom
- [ ] Keyboard shortcuts work smoothly
- [ ] No page scrolling while modal open

#### Test 6: Approval Status Badges

**Steps:**
1. View gallery with photos of different approval statuses
2. Check badge colors and styles

**Expected Results:**
- [ ] APPROVED: Green/primary badge
- [ ] PENDING: Yellow/secondary badge
- [ ] REJECTED: Red/destructive badge
- [ ] Badges visible in both gallery and modal
- [ ] Status updates reflect real-time changes

#### Test 7: Empty State

**Steps:**
1. Navigate to order with no milestone photos
   OR
2. Create new order without milestones

**Expected Results:**
- [ ] Empty state message displays
- [ ] Message: "No milestone photos available yet"
- [ ] No broken images or errors
- [ ] Layout remains intact

#### Test 8: Loading States

**Steps:**
1. Navigate to order page
2. Observe photo loading behavior
3. Throttle network in DevTools to 3G

**Expected Results:**
- [ ] Skeleton loaders shown initially
- [ ] Photos fade in as they load
- [ ] Smooth transition from loading to loaded
- [ ] Progressive loading on slow connections
- [ ] No layout shift when images load

#### Test 9: Error Handling

**Steps:**
1. Use DevTools to block image requests
2. OR use invalid image URLs in test data

**Expected Results:**
- [ ] Broken images handled gracefully
- [ ] Error state shows instead of broken image
- [ ] Console shows error message (check console)
- [ ] Gallery remains functional for other photos
- [ ] Option to retry loading

#### Test 10: Mobile Responsiveness

**Steps:**
1. Open DevTools responsive mode
2. Test on mobile viewport (375px width)
3. Test on tablet viewport (768px width)
4. Test on desktop viewport (1440px width)

**Expected Results:**
- [ ] **Mobile (375px):**
  - [ ] 2 column grid
  - [ ] Touch-friendly tap targets
  - [ ] Modal fills screen appropriately
  - [ ] Swipe gestures work (if implemented)
- [ ] **Tablet (768px):**
  - [ ] 3 column grid
  - [ ] Good spacing and layout
- [ ] **Desktop (1440px):**
  - [ ] 4 column grid
  - [ ] Hover effects work
  - [ ] Mouse interactions smooth

#### Test 11: Accessibility

**Steps:**
1. Use keyboard only (no mouse)
2. Test with screen reader (if available)
3. Check color contrast

**Expected Results:**
- [ ] All photos have descriptive alt text
- [ ] Can tab through gallery items
- [ ] Modal is keyboard accessible
- [ ] Focus trapped in modal when open
- [ ] ARIA labels present where needed
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader announces milestone info

#### Test 12: Performance (Ghana 3G)

**Steps:**
1. Throttle network to Slow 3G in DevTools
2. Navigate to order with many photos (5+)

**Expected Results:**
- [ ] Gallery remains responsive
- [ ] Photos load progressively
- [ ] No blocking of UI while loading
- [ ] Lazy loading for off-screen images
- [ ] Reasonable load times (<5s for visible photos)

---

## Integration Testing

### Test with OrderTrackingPage

**Steps:**
1. View complete order tracking page
2. Switch between tabs (if tabbed interface)
3. Scroll through page

**Expected Results:**
- [ ] Photo gallery integrates seamlessly
- [ ] Works alongside OrderProgressTimeline
- [ ] No layout conflicts
- [ ] Real-time updates work for new photos
- [ ] Performance remains good

### Test with Real-Time Updates

**Steps:**
1. Keep order page open
2. Have tailor upload new milestone photo (separate session)
3. Watch for real-time update

**Expected Results:**
- [ ] New photo appears automatically
- [ ] Gallery updates without refresh
- [ ] Notification shown for new milestone
- [ ] No flickering or re-rendering issues

---

## Common Issues to Watch For

### 🐛 Known Potential Issues

1. **Images not loading:**
   - Check Supabase Storage connection
   - Verify image URLs are accessible
   - Check CORS settings

2. **Modal not opening:**
   - Check for JavaScript errors in console
   - Verify Dialog component is working
   - Check z-index conflicts

3. **Zoom not working:**
   - Verify mouse event handlers
   - Check transform CSS is applied
   - Test in different browsers

4. **Navigation buttons disabled:**
   - Check hasPrevious/hasNext logic
   - Verify milestone array is populated
   - Check for off-by-one errors

---

## Browser Testing Matrix

Test on these browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest) - if on Mac
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Testing with Different User Roles

### As Customer
- [ ] Can view all milestone photos
- [ ] Can approve/reject milestones
- [ ] Sees approval buttons

### As Tailor
- [ ] Can view uploaded photos
- [ ] Can upload new milestone photos
- [ ] Sees upload interface

### As Admin
- [ ] Has full access to all features
- [ ] Can override approval statuses

---

## Additional Test Scenarios

### Edge Cases

1. **Single Photo:**
   - [ ] Navigation disabled
   - [ ] Modal still works
   - [ ] No errors

2. **Many Photos (10+):**
   - [ ] Scrolling works smoothly
   - [ ] Performance acceptable
   - [ ] All photos load

3. **Very Large Images:**
   - [ ] Images resize properly
   - [ ] No memory issues
   - [ ] Zoom still works

4. **Mixed Approval Status:**
   - [ ] All badges show correctly
   - [ ] Filtering by status works (if implemented)

---

## Quick Test Script

For a fast smoke test, run through this sequence:

```
1. Go to /orders/[test-order-id]
2. Verify photos display in grid ✓
3. Click first photo to open modal ✓
4. Click Next button 2 times ✓
5. Press Escape to close ✓
6. Test on mobile view ✓
7. Check console for errors ✓
```

If all above pass → Component working correctly! ✅

---

## Reporting Issues

If you find issues during manual testing:

1. **Screenshot the issue**
2. **Note these details:**
   - Browser and version
   - Viewport size
   - Order ID being tested
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)

3. **Log in debug log:**
   - File: `.ai/debug-log.md`
   - Include all details above

---

## Success Criteria

Gallery is working correctly when:
- ✅ All photos display in responsive grid
- ✅ Modal opens/closes smoothly
- ✅ Navigation works in all directions
- ✅ Zoom in/out functions properly
- ✅ Keyboard shortcuts work
- ✅ Mobile experience is good
- ✅ No console errors
- ✅ Performance acceptable on 3G

---

**Last Updated:** October 19, 2025  
**Component Version:** Story 3.4  
**Test Status:** All automated tests passing (21/21) ✅

