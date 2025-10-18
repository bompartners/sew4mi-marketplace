# Manual Testing Checklist - Story 4.5: Customer Reviews & Ratings

**Test Environment:** Local development or staging  
**Prerequisites:** 
- Application running
- Database migration applied
- Test users created (customer, tailor, admin)
- Test orders with DELIVERED status

**Testing Instructions:**
- Mark each test as ✅ PASS, ❌ FAIL, or ⚠️ PARTIAL
- Document any failures with screenshots/details
- For FAIL results, create bug tickets

---

## Critical User Flows

### Test 1: Submit Review for Delivered Order
**User:** Customer with delivered order  
**Steps:**
1. Navigate to order details page
2. Locate "Write Review" button
3. Click button to open review form
4. Rate all 4 categories (Fit, Quality, Communication, Timeliness) using sliders
5. Add optional review text
6. (Optional) Upload photos (max 5)
7. Submit review

**Expected Results:**
- [x] Review form appears with 4 rating sliders
- [x] Can rate Fit (1-5 stars)
- [x] Can rate Quality (1-5 stars)
- [x] Can rate Communication (1-5 stars)
- [x] Can rate Timeliness (1-5 stars)
- [x] Can add optional review text
- [x] Can upload photos (max 5)
- [x] Submit button enabled when all ratings selected
- [x] Success message after submission

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 2: Review Eligibility Blocking

#### Test 2a: Order NOT Delivered
**Setup:** Order status = IN_PROGRESS  
**Expected:**
- [x] "Write Review" button disabled or hidden
- [x] Message: "You can review this order after delivery"

**Status:** [ ]  
**Notes:**

#### Test 2b: Order Delivered >90 Days Ago
**Setup:** Order delivered 91+ days ago  
**Expected:**
- [x] "Write Review" button disabled
- [x] Message: "Review period has expired (90 days after delivery)"

**Status:** [ ]  
**Notes:**

#### Test 2c: Order Disputed
**Setup:** Order status = DISPUTED  
**Expected:**
- [x] "Write Review" button disabled
- [x] Message: "Cannot review disputed orders"

**Status:** [ ]  
**Notes:**

#### Test 2d: Already Reviewed
**Setup:** Review already submitted for order  
**Expected:**
- [x] Shows existing review instead of form
- [x] "Edit Review" button available (if <48 hours since submission)

**Status:** [ ]  
**Notes:**

---

### Test 3: Automatic Moderation - Clean Review
**User:** Customer  
**Steps:**
1. Submit review with clean text: "Great tailor! Very professional work."
2. Check review status
3. Verify review appears on tailor's profile

**Expected:**
- [x] Review status = APPROVED immediately
- [x] Review appears on tailor's profile instantly
- [x] Tailor receives notification (check email/WhatsApp)

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 4: Profanity Flagging
**User:** Customer  
**Steps:**
1. Submit review with text: "This damn fool stupid bad work!"
2. Check review status
3. Verify review is NOT publicly visible
4. Check moderation queue (admin panel)

**Expected:**
- [x] Review status = FLAGGED
- [x] Review does NOT appear publicly
- [x] Review goes to moderation queue
- [x] Customer sees: "Your review is under review"
- [x] Reason contains "profane words"

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 5: Spam Flagging - Links
**User:** Customer  
**Steps:**
1. Submit review with text: "Visit http://spam.com and https://more.com for better"
2. Check review status

**Expected:**
- [x] Review status = FLAGGED
- [x] Reason: "Contains multiple links (spam)"
- [x] Review not publicly visible

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 6: Spam Flagging - All Caps
**User:** Customer  
**Steps:**
1. Submit review with text: "THIS IS ALL CAPS SPAM MESSAGE VERY BAD"
2. Check review status

**Expected:**
- [x] Review status = FLAGGED
- [x] Reason: "All caps text (spam)"
- [x] Review not publicly visible

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 7: Upload Photos - Max 5 Limit
**User:** Customer  
**Steps:**
1. Open review form
2. Try to upload 6 photos

**Expected:**
- [x] After 5th photo, upload button disabled
- [x] Message: "Maximum 5 photos per review"
- [x] Cannot submit with >5 photos

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 8: Vote on Review - Helpful
**User:** Any authenticated user (not review author)  
**Steps:**
1. Navigate to tailor profile with reviews
2. Click "Helpful" button on a review
3. Observe count and button state

**Expected:**
- [x] Helpful count increases by 1
- [x] Button shows "You found this helpful"
- [x] Cannot vote again (button disabled or changes to "Remove vote")

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 9: Change Vote
**User:** Same user from Test 8  
**Steps:**
1. After voting "Helpful", click "Unhelpful" button
2. Observe counts

**Expected:**
- [x] Helpful count decreases by 1
- [x] Unhelpful count increases by 1
- [x] Button shows "You found this unhelpful"

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 10: Tailor Responds to Review
**User:** Tailor (owner of reviewed profile)  
**Steps:**
1. Navigate to review
2. Click "Respond" button
3. Enter response (10-1000 characters)
4. Submit response
5. Check customer notification

**Expected:**
- [x] Response form appears
- [x] Can enter 10-1000 characters
- [x] Response appears under review
- [x] Customer receives notification
- [x] Cannot respond twice to same review

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 11: Manual Moderation - Approve
**User:** Admin  
**Steps:**
1. Navigate to moderation queue
2. Select a FLAGGED review
3. Click "Approve" button
4. Check review visibility
5. Verify tailor profile ratings updated

**Expected:**
- [x] Review status changes to APPROVED
- [x] Review appears publicly
- [x] Tailor profile ratings update with new review

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 12: Manual Moderation - Reject
**User:** Admin  
**Steps:**
1. Navigate to moderation queue
2. Select a FLAGGED review
3. Click "Reject" button
4. Enter reason: "Inappropriate content"
5. Submit

**Expected:**
- [x] Review status changes to REJECTED
- [x] Review remains hidden
- [x] Customer sees "Review rejected: Inappropriate content"
- [x] Review does not affect tailor ratings

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 13: Rating Calculations Update
**Setup:** Tailor has 0 reviews  
**Steps:**
1. Submit approved review with ratings:
   - Fit: 4
   - Quality: 5
   - Communication: 4
   - Timeliness: 5
2. Check tailor profile

**Expected:**
- [x] rating_fit_avg = 4.00
- [x] rating_quality_avg = 5.00
- [x] rating_communication_avg = 4.00
- [x] rating_timeliness_avg = 5.00
- [x] rating (overall) = 4.50
- [x] total_reviews = 1

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

## Edge Cases

### Test 14: Duplicate Review Prevention
**Steps:**
1. Submit a review for an order
2. Try to submit a second review for the same order

**Expected:**
- [x] API returns 400 error
- [x] Message: "You have already reviewed this order"
- [x] UI shows error message

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 15: Edit Review After 48 Hours (BLOCKED)
**Setup:** Review submitted >48 hours ago  
**Steps:**
1. Navigate to review
2. Try to edit review

**Expected:**
- [x] Edit button disabled or not shown
- [x] Message: "Reviews can only be edited within 48 hours"
- [x] API returns 403 if edit attempted directly

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 16: Add Photo After 7 Days (BLOCKED)
**Setup:** Review submitted >7 days ago  
**Steps:**
1. Navigate to review
2. Try to add a photo

**Expected:**
- [x] Upload button disabled
- [x] Message: "Photos can only be added within 7 days of review"
- [x] API returns 403 if attempted

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 17: Non-Owner Tries to Review (BLOCKED)
**User:** Customer B  
**Steps:**
1. Try to review Customer A's order (via API manipulation/URL manipulation)

**Expected:**
- [x] API returns 403 Forbidden
- [x] RLS policy blocks the insert
- [x] No review created

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 18: Add 6th Photo (BLOCKED)
**Setup:** Review has 5 photos  
**Steps:**
1. Navigate to review
2. Try to add 6th photo

**Expected:**
- [x] Upload button disabled (UI)
- [x] API returns 400 if attempted
- [x] Trigger raises exception: "Cannot add more than 5 photos per review"

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 19: Vote on Own Review (BLOCKED)
**User:** Review author  
**Steps:**
1. Navigate to own review
2. Try to vote on it

**Expected:**
- [x] Vote buttons not shown OR disabled
- [x] Message: "You cannot vote on your own review"

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

### Test 20: Tailor Responds Twice (BLOCKED)
**Setup:** Tailor already responded to review  
**Steps:**
1. Try to submit another response

**Expected:**
- [x] Response form not shown OR disabled
- [x] API returns 409 Conflict
- [x] Message: "You have already responded to this review"

**Status:** [ ]  
**Notes:**  
**Tester:**  
**Date:**

---

## Test Summary

**Total Tests:** 20 (13 critical flows + 7 edge cases)  
**Passed:** ___  
**Failed:** ___  
**Partial:** ___  

**Date Started:** _______________  
**Date Completed:** _______________  
**Tested By:** _______________  

---

## Bug Reports

| Test # | Description | Severity | Status |
|--------|-------------|----------|--------|
|        |             |          |        |

---

## Sign-off

**QA Lead:** _______________  
**Date:** _______________  
**Approval:** [ ] APPROVED  [ ] REJECTED  [ ] CONDITIONAL  

**Notes:**

---

*Generated for Story 4.5: Customer Reviews and Ratings System*  
*Based on BLOCKER_RESOLUTION_GUIDE.md*

