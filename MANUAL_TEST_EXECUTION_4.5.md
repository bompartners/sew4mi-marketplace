# Manual Test Execution Guide - Story 4.5

**Tester:** _____________  
**Date Started:** _____________  
**Environment:** [ ] Local Development  [ ] Staging  
**Test Data Ready:** [ ] Customer account  [ ] Tailor account  [ ] Admin account  [ ] Delivered order

---

## How to Use This Guide

1. Work through tests sequentially (1-20)
2. For each test, mark: ✅ PASS, ❌ FAIL, or ⚠️ BLOCKED
3. If FAIL, document issue in "Notes" column
4. Take screenshots for any failures
5. Update totals at the end

---

## Test Execution Sheet

### Critical User Flows (13 tests)

| # | Test Name | Status | Notes | Time |
|---|-----------|--------|-------|------|
| 1 | Submit Review for Delivered Order | ⬜ | | |
| 2a | Review Eligibility - NOT Delivered | ⬜ | | |
| 2b | Review Eligibility - >90 Days Old | ⬜ | | |
| 2c | Review Eligibility - Disputed Order | ⬜ | | |
| 2d | Review Eligibility - Already Reviewed | ⬜ | | |
| 3 | Automatic Moderation - Clean Review | ⬜ | | |
| 4 | Profanity Flagging (3+ bad words) | ⬜ | | |
| 5 | Spam Flagging - Multiple Links | ⬜ | | |
| 6 | Spam Flagging - All Caps Text | ⬜ | | |
| 7 | Upload Photos - Max 5 Limit | ⬜ | | |
| 8 | Vote on Review - Helpful | ⬜ | | |
| 9 | Change Vote (Helpful → Unhelpful) | ⬜ | | |
| 10 | Tailor Responds to Review | ⬜ | | |
| 11 | Manual Moderation - Approve | ⬜ | | |
| 12 | Manual Moderation - Reject | ⬜ | | |
| 13 | Rating Calculations Update | ⬜ | | |

### Edge Cases (7 tests)

| # | Test Name | Status | Notes | Time |
|---|-----------|--------|-------|------|
| 14 | Duplicate Review Prevention | ⬜ | | |
| 15 | Edit Review After 48 Hours | ⬜ | | |
| 16 | Add Photo After 7 Days | ⬜ | | |
| 17 | Non-Owner Tries to Review | ⬜ | | |
| 18 | Add 6th Photo (Blocked) | ⬜ | | |
| 19 | Vote on Own Review (Blocked) | ⬜ | | |
| 20 | Tailor Responds Twice (Blocked) | ⬜ | | |

---

## Detailed Test Instructions

### Test 1: Submit Review for Delivered Order

**User:** Customer with delivered order

**Steps:**
1. Log in as customer
2. Navigate to Orders page
3. Find a delivered order
4. Click "Write Review" button (or similar)
5. Fill in review form:
   - Rate Fit: 4 stars
   - Rate Quality: 5 stars
   - Rate Communication: 4 stars
   - Rate Timeliness: 5 stars
   - Add text: "Great tailor! Very professional work."
   - (Optional) Upload 1-2 photos
6. Click Submit

**Expected Results:**
- ✅ Review form appears with 4 rating sliders/star inputs
- ✅ Can select ratings for all 4 categories
- ✅ Can add optional review text
- ✅ Can upload photos (up to 5)
- ✅ Review submits successfully
- ✅ Success message appears

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 2a: Review Eligibility - NOT Delivered

**User:** Customer with non-delivered order

**Steps:**
1. Log in as customer
2. Navigate to Orders page
3. Find an order with status NOT "DELIVERED" (e.g., IN_PROGRESS)
4. Look for "Write Review" button

**Expected Results:**
- ✅ "Write Review" button is disabled or hidden
- ✅ Message displayed: "You can review this order after delivery"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 2b: Review Eligibility - >90 Days Old

**User:** Customer with old delivered order

**Steps:**
1. Create/find an order delivered >90 days ago
   - You may need to manually update `actual_delivery` in database for testing
2. Log in as customer who owns that order
3. Navigate to order details
4. Look for "Write Review" button

**Expected Results:**
- ✅ "Write Review" button is disabled
- ✅ Message displayed: "Review period has expired (90 days after delivery)"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED  [ ] SKIP (if unable to create test data)

---

### Test 2c: Review Eligibility - Disputed Order

**User:** Customer with disputed order

**Steps:**
1. Create/find an order with status "DISPUTED"
2. Log in as customer who owns that order
3. Navigate to order details
4. Look for "Write Review" button

**Expected Results:**
- ✅ "Write Review" button is disabled
- ✅ Message displayed: "Cannot review disputed orders"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 2d: Review Eligibility - Already Reviewed

**User:** Customer who already reviewed an order

**Steps:**
1. Submit a review for an order (use Test 1 if not done yet)
2. Navigate back to that order's details page
3. Look for review status

**Expected Results:**
- ✅ Shows existing review instead of "Write Review" button
- ✅ If review is <48 hours old, "Edit Review" button is available

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 3: Automatic Moderation - Clean Review

**User:** Customer

**Steps:**
1. Submit a review with clean text: "Great tailor! Very professional work."
2. Check review status immediately after submission
3. Navigate to tailor's profile page
4. Look for the new review

**Expected Results:**
- ✅ Review status = APPROVED immediately
- ✅ Review appears on tailor's profile instantly
- ✅ No "under review" message

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 4: Profanity Flagging

**User:** Customer

**Steps:**
1. Submit a review with 3+ profane words
   - Example text: "This damn fool stupid bad work!"
2. Check review status after submission
3. Navigate to tailor's profile page
4. Look for the review

**Expected Results:**
- ✅ Review status = FLAGGED
- ✅ Review does NOT appear on tailor's profile
- ✅ Customer sees message: "Your review is under review"
- ✅ Review appears in admin moderation queue

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 5: Spam Flagging - Links

**User:** Customer

**Steps:**
1. Submit a review with 2+ links
   - Example: "Visit http://spam.com and https://more.com for better"
2. Check review status

**Expected Results:**
- ✅ Review status = FLAGGED
- ✅ Review does NOT appear publicly
- ✅ Reason: "Contains multiple links (spam)"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 6: Spam Flagging - All Caps

**User:** Customer

**Steps:**
1. Submit a review with >70% caps
   - Example: "THIS IS ALL CAPS SPAM MESSAGE VERY BAD"
2. Check review status

**Expected Results:**
- ✅ Review status = FLAGGED
- ✅ Review does NOT appear publicly
- ✅ Reason: "All caps text (spam)"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 7: Upload Photos - Max 5 Limit

**User:** Customer

**Steps:**
1. Start submitting a review
2. Try to upload 6 photos one by one
3. Observe behavior after 5th photo

**Expected Results:**
- ✅ Can upload photos 1-5 successfully
- ✅ After 5th photo, upload button is disabled
- ✅ Message: "Maximum 5 photos per review"
- ✅ Cannot submit with >5 photos

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 8: Vote on Review - Helpful

**User:** Any authenticated user (NOT the review author)

**Steps:**
1. Log in as a different user (not review author)
2. Navigate to tailor profile with reviews
3. Click "Helpful" button on a review
4. Observe vote count and button state

**Expected Results:**
- ✅ Helpful count increases by 1
- ✅ Button changes to "You found this helpful" (or similar)
- ✅ Cannot vote again (button disabled or hidden)

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 9: Change Vote

**User:** User who already voted "Helpful"

**Steps:**
1. After voting "Helpful" (Test 8), click "Unhelpful" button
2. Observe vote counts

**Expected Results:**
- ✅ Helpful count decreases by 1
- ✅ Unhelpful count increases by 1
- ✅ Button shows "You found this unhelpful"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 10: Tailor Responds to Review

**User:** Tailor (owner of reviewed profile)

**Steps:**
1. Log in as tailor who received a review
2. Navigate to reviews on profile or dashboard
3. Find a review and click "Respond" button
4. Enter response text (10-1000 characters)
5. Submit response

**Expected Results:**
- ✅ Response form appears
- ✅ Can enter 10-1000 characters
- ✅ Response appears under review after submission
- ✅ Cannot respond twice to same review (button disappears)

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 11: Manual Moderation - Approve

**User:** Admin

**Steps:**
1. Log in as admin
2. Navigate to moderation queue/admin panel
3. Find a FLAGGED review (from Test 4, 5, or 6)
4. Select review and click "Approve"
5. Check tailor's profile page

**Expected Results:**
- ✅ Review status changes to APPROVED
- ✅ Review now appears publicly on tailor's profile
- ✅ Tailor's rating updates to include this review

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 12: Manual Moderation - Reject

**User:** Admin

**Steps:**
1. Log in as admin
2. Navigate to moderation queue
3. Find a FLAGGED review
4. Select review and click "Reject"
5. Add reason: "Inappropriate content"
6. Check review status

**Expected Results:**
- ✅ Review status changes to REJECTED
- ✅ Review remains hidden from public
- ✅ Customer sees "Review rejected: Inappropriate content"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 13: Rating Calculations Update

**User:** Customer

**Prerequisites:** Find a tailor with 0 reviews (or create new test tailor)

**Steps:**
1. Submit an APPROVED review with ratings:
   - Fit: 4 stars
   - Quality: 5 stars
   - Communication: 4 stars
   - Timeliness: 5 stars
2. Navigate to tailor's profile page
3. Check displayed ratings

**Expected Results:**
- ✅ rating_fit_avg = 4.00
- ✅ rating_quality_avg = 5.00
- ✅ rating_communication_avg = 4.00
- ✅ rating_timeliness_avg = 5.00
- ✅ rating (overall) = 4.50
- ✅ total_reviews = 1

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 14: Duplicate Review Prevention

**User:** Customer who already reviewed an order

**Steps:**
1. Try to submit a second review for the same order
   - You may need to use browser dev tools or API client
2. Observe error response

**Expected Results:**
- ✅ API returns 400 error
- ✅ Message: "You have already reviewed this order"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 15: Edit Review After 48 Hours

**User:** Customer

**Prerequisites:** Review submitted >48 hours ago
- If testing immediately, manually update `created_at` in database

**Steps:**
1. Find a review that is >48 hours old
2. Try to edit the review

**Expected Results:**
- ✅ Edit button is disabled or not shown
- ✅ Message: "Reviews can only be edited within 48 hours"
- ✅ If API is called, returns 403 Forbidden

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED  [ ] SKIP

---

### Test 16: Add Photo After 7 Days

**User:** Customer

**Prerequisites:** Review submitted >7 days ago
- If testing immediately, manually update `created_at` in database

**Steps:**
1. Find a review that is >7 days old
2. Try to add a photo to it

**Expected Results:**
- ✅ Upload button is disabled
- ✅ Message: "Photos can only be added within 7 days of review"
- ✅ If API is called, returns 403 Forbidden

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED  [ ] SKIP

---

### Test 17: Non-Owner Tries to Review

**User:** Customer B

**Prerequisites:** Need order owned by Customer A

**Steps:**
1. Log in as Customer B
2. Using browser dev tools or API client, try to submit review for Customer A's order
3. Observe error

**Expected Results:**
- ✅ API returns 403 Forbidden
- ✅ RLS policy blocks the insert

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 18: Add 6th Photo

**User:** Customer

**Prerequisites:** Review with 5 photos already

**Steps:**
1. Find or create a review with 5 photos
2. Try to add a 6th photo

**Expected Results:**
- ✅ Upload button is disabled (UI prevents it)
- ✅ If API is called, returns 400 Bad Request
- ✅ Database trigger prevents insertion

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 19: Vote on Own Review

**User:** Review author

**Steps:**
1. Log in as user who wrote a review
2. Navigate to that review
3. Look for vote buttons

**Expected Results:**
- ✅ Vote buttons are not shown OR disabled
- ✅ Message: "You cannot vote on your own review"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

### Test 20: Tailor Responds Twice

**User:** Tailor who already responded

**Prerequisites:** Review with existing tailor response

**Steps:**
1. Log in as tailor
2. Find a review you already responded to
3. Try to submit another response

**Expected Results:**
- ✅ Response form is not shown OR disabled
- ✅ If API is called, returns 409 Conflict
- ✅ Message: "You have already responded to this review"

**Actual Results:**
```
[Document what actually happened]
```

**Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

---

## Test Summary

**Total Tests:** 20  
**Tests Passed:** _____ / 20  
**Tests Failed:** _____ / 20  
**Tests Blocked:** _____ / 20  
**Tests Skipped:** _____ / 20

**Time Taken:** _____ hours _____ minutes

---

## Issues Found

| Issue # | Test # | Severity | Description | Screenshot |
|---------|--------|----------|-------------|------------|
| 1 | | [ ] Critical  [ ] High  [ ] Medium  [ ] Low | | |
| 2 | | [ ] Critical  [ ] High  [ ] Medium  [ ] Low | | |
| 3 | | [ ] Critical  [ ] High  [ ] Medium  [ ] Low | | |

---

## Final Recommendation

**Can Story 4.5 move to "Done"?**

[ ] YES - All tests passed or minor issues only  
[ ] NO - Critical issues found that must be fixed

**Notes:**
```
[Your recommendation and any additional observations]
```

---

## Sign-Off

**Tester Name:** _____________  
**Date Completed:** _____________  
**Signature:** _____________

---

## Next Steps After Testing

If **ALL PASS or minor issues**:
1. Update `docs/qa/gates/4.5-customer-reviews-system.yml`
2. Update story status to "Done" in `docs/stories/4.5.story.md`
3. Notify team that Story 4.5 is production-ready

If **CRITICAL ISSUES FOUND**:
1. File bugs with details and screenshots
2. Keep story in "Ready for Review" status
3. Assign bugs to development team
4. Re-test after fixes

