/**
 * Review Notification Service (Story 4.5)
 * Handles notifications for review-related events
 */

import { Review, ReviewResponse } from '@sew4mi/shared/types/review';

interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendWhatsApp(to: string, message: string): Promise<void>;
}

/**
 * Send review request notification (24 hours after delivery)
 */
export async function sendReviewRequestNotification(
  customerEmail: string,
  customerPhone: string,
  orderData: {
    orderNumber: string;
    tailorName: string;
    garmentType: string;
    orderId: string;
  },
  notificationService: NotificationService
): Promise<void> {
  // Email notification
  const emailSubject = `How was your experience with ${orderData.tailorName}?`;
  const emailBody = `
    Hi,
    
    Your order #${orderData.orderNumber} was delivered!
    
    We'd love to hear about your experience. Share your feedback to help other 
    customers make informed decisions.
    
    Rate your experience in four areas:
    - Fit & Measurements
    - Quality & Craftsmanship
    - Communication
    - Timeliness
    
    Click here to leave a review: [Review Link]
    
    Thank you for choosing Sew4Mi!
  `;

  await notificationService.sendEmail(customerEmail, emailSubject, emailBody);

  // WhatsApp notification
  const whatsappMessage = `
🧵 Sew4Mi: Your ${orderData.garmentType} from ${orderData.tailorName} was delivered!

How was your experience? Tap to review: [Short Link]

Your feedback helps the community! 🌟
  `.trim();

  await notificationService.sendWhatsApp(customerPhone, whatsappMessage);
}

/**
 * Notify tailor of new review
 */
export async function notifyTailorOfNewReview(
  tailorEmail: string,
  tailorPhone: string,
  review: Review,
  customerName: string,
  garmentType: string,
  notificationService: NotificationService
): Promise<void> {
  // WhatsApp notification
  const whatsappMessage = `
⭐ New review for your work!

${customerName} rated your ${garmentType}: ${review.overallRating}/5

View details: [Link]
  `.trim();

  await notificationService.sendWhatsApp(tailorPhone, whatsappMessage);

  // Email notification
  const emailSubject = `New review for your work - ${review.overallRating}/5 stars`;
  const emailBody = `
    Hello,
    
    You received a new review!
    
    Customer: ${customerName}
    Garment: ${garmentType}
    Overall Rating: ${review.overallRating}/5
    
    Rating Breakdown:
    - Fit: ${review.ratingFit}/5
    - Quality: ${review.qualityRating}/5
    - Communication: ${review.communicationRating}/5
    - Timeliness: ${review.timelinessRating}/5
    
    ${review.reviewText ? `Review: "${review.reviewText}"` : ''}
    
    You can respond to this review to thank the customer or address any concerns.
    
    [View and Respond]
    
    Best regards,
    Sew4Mi Team
  `;

  await notificationService.sendEmail(tailorEmail, emailSubject, emailBody);
}

/**
 * Notify customer when tailor responds
 */
export async function notifyCustomerOfTailorResponse(
  customerEmail: string,
  customerPhone: string,
  tailorName: string,
  response: ReviewResponse,
  notificationService: NotificationService
): Promise<void> {
  // WhatsApp notification
  const whatsappMessage = `
${tailorName} responded to your review!

View: [Link]
  `.trim();

  await notificationService.sendWhatsApp(customerPhone, whatsappMessage);

  // Email notification
  const emailSubject = `${tailorName} responded to your review`;
  const emailBody = `
    Hello,
    
    ${tailorName} has responded to your review!
    
    Response: "${response.responseText}"
    
    [View Conversation]
    
    Thank you for your feedback!
    
    Best regards,
    Sew4Mi Team
  `;

  await notificationService.sendEmail(customerEmail, emailSubject, emailBody);
}

/**
 * Send admin alert for flagged content
 */
export async function sendModerationAlert(
  review: Review,
  reason: string,
  notificationService: NotificationService
): Promise<void> {
  const emailSubject = 'Review Flagged for Moderation';
  const emailBody = `
    A review has been flagged for moderation.
    
    Review ID: ${review.id}
    Reason: ${reason}
    Reviewer: ${review.customerId}
    Tailor: ${review.tailorId}
    
    Action Required: Approve/Reject
    
    [Moderation Dashboard Link]
    
    Review Content:
    "${review.reviewText}"
    
    Ratings:
    - Fit: ${review.ratingFit}/5
    - Quality: ${review.qualityRating}/5
    - Communication: ${review.communicationRating}/5
    - Timeliness: ${review.timelinessRating}/5
  `;

  await notificationService.sendEmail('admin@sew4mi.com', emailSubject, emailBody);
}

