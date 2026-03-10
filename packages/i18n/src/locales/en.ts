import type { TranslationShape } from "./ja";

const en: TranslationShape = {
  common: {
    appName: "SwimHub Scanner",
    cancel: "Cancel",
    delete: "Delete",
    deleting: "Deleting...",
    back: "Back",
    or: "or",
    processing: "Processing...",
    close: "Close",
    current: "Current",
  },

  meta: {
    title:
      "SwimHub Scanner - Digitize Handwritten Swim Time Sheets with AI",
    description:
      "Simply photograph your handwritten swim time sheets and let AI automatically analyze them. Convert to digital data and streamline your record management.",
    ogLocale: "en_US",
    keywords: [
      "swimming",
      "time sheet",
      "handwritten",
      "digitize",
      "AI",
      "OCR",
      "swim",
      "time record",
    ],
  },

  scanner: {
    hero: "Digitize handwritten time sheets with AI",
    steps: {
      upload: "Upload Image",
      scanning: "AI Analysis",
      result: "Review & Export",
    },
    status: {
      guestRemaining: "Trial remaining:",
      guestUnit: "/ 3 times",
      guestHint: "Register for free daily scans",
      premiumLabel: "Premium — Unlimited scans",
      dailyRemaining: "Today remaining:",
      dailyUnit: "/ 1 time",
      dailyResetHint: "Resets daily at midnight",
      register: "Register",
      upgrade: "Upgrade to Premium",
    },
    upload: {
      title: "Step 1: Upload Image",
      guestExhausted:
        "You have used all 3 trial scans. Register a free account to get 1 free scan per day.",
      createFreeAccount: "Create Free Account",
      dailyExhausted:
        "You have used today's scan (1/day). It resets at midnight. Upgrade to Premium for unlimited scans.",
      scan: "Scan",
      printTemplate: "Print Time Sheet Template",
    },
    scanning: {
      analyzing: "Analyzing image...",
      aiReading: "AI is reading the handwritten time sheet",
    },
    result: {
      title: "Step 3: Review & Edit",
      newScan: "New Scan",
      output: "Export",
      registerMore: "Register to scan more",
    },
    errors: {
      guestTokenExhausted:
        "Free tokens exhausted. Register an account to purchase more tokens.",
      dailyLimitExceeded:
        "Usage limit reached. Register an account to purchase more tokens.",
      swimmerLimitExceeded:
        "Free plan allows up to 8 swimmers per scan",
      parseError:
        "Could not read time data from the image. Please use a clear time sheet image.",
      networkError:
        "Network error. Please check your connection.",
    },
  },

  uploader: {
    dragDrop: "Drag & drop an image or click to select",
    format: "JPEG / PNG, max 10MB",
    preview: "Preview",
    change: "Change Image",
    errors: {
      invalidFormat: "Please upload a JPEG or PNG image",
      tooLarge: "Image must be 10MB or less",
    },
  },

  result: {
    distance: "Distance",
    repCount: "Reps",
    setCount: "Sets",
    circle: "Circle",
    setHeader: "Set {{n}}",
    no: "No",
    name: "Name",
    style: "Stroke",
    average: "Avg",
    fastest: "Best",
    slowest: "Worst",
    notEntered: "Not entered",
    deleteSwimmerConfirm: "Delete this swimmer?",
    thisSwimmer: "this swimmer",
    addSwimmer: "+ Add Swimmer",
    repHeader: "Rep {{n}}",
    deleteTooltip: "Delete",
    timeRecord: "Time Record",
    timeRecordFile: "Time Record",
    menu: "Menu",
  },

  export: {
    image: "Export as Image",
    csv: "Export as CSV",
    excel: "Export as Excel",
  },

  auth: {
    login: "Log In",
    logout: "Log Out",
    createAccount: "Create Account",
    createNewAccount: "Create a new account",
    emailLogin: "Log in with Email",
    email: "Email",
    password: "Password",
    passwordPlaceholder: "6+ characters",
    googleSignIn: "Log in with Google",
    googleSignUp: "Sign up with Google",
    guestMode: "Try without logging in (3 free scans)",
    switchToSignUp: "Don't have an account? Sign up here",
    switchToSignIn: "Already have an account? Sign in here",
    termsAgree:
      "By logging in, you agree to the Terms of Service and Privacy Policy.",
    termsLink: "Terms of Service",
    privacyLink: "Privacy Policy",
    confirmationSent: "Confirmation email sent",
    confirmationSentDetail:
      "Click the link in the email to activate your account.",
    backToLogin: "Back to login",
    loginSubtitle: "Digitize handwritten time sheets with AI",
    loadingAuth: "Checking credentials...",
    deleteAccount: "Delete Account",
    deleteAccountConfirm:
      "Deleting your account will permanently remove all your data. This action cannot be undone.\n\nAre you sure?",
    deleteAccountFailed: "Failed to delete account",
    errors: {
      unknown: "An unknown error occurred.",
      invalidCredentials:
        "Invalid email or password. Please check your input and try again.",
      emailNotConfirmed:
        "Invalid email or password. Please check your input and try again.",
      tooManyRequests:
        "Too many login attempts. Please wait a while and try again.",
      alreadyRegistered:
        "Account creation failed. Please check your input and try again.",
      weakPassword:
        "Password is too weak. Please use a stronger password.",
      captcha:
        "Captcha verification required. Please complete the captcha and try again.",
      rateLimit:
        "Rate limit reached. Please wait a while and try again.",
      network:
        "A network error occurred. Please check your internet connection and try again.",
      loginFailed:
        "Login failed. Please check your input and try again.",
      loginFailedRetry: "Login failed. Please try again.",
      googleFailed: "Google authentication failed. Please try again.",
      generic:
        "An error occurred. Please try again later.",
      genericDev: "Error occurred: {{message}}{{status}}",
    },
  },

  notFound: {
    title: "404",
    message: "Page not found",
    home: "Go Home",
  },

  footer: {
    swimhubDesc: "Swim team management",
    timerDesc: "Overlay times on videos",
    scannerDesc: "Digitize time sheets with AI",
    scannerFullDesc:
      "A web app that digitizes handwritten time sheets using AI",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    support: "Support",
    contact: "Contact",
    supportInfo: "Support & Info",
    serviceList: "SwimHub Services",
  },

  terms: {
    title: "Terms of Service",
    metaTitle: "Terms of Service | SwimHub Scanner",
    lastUpdated: "Last updated: February 23, 2026",
    article1Title: "Article 1 (Application)",
    article1Body:
      "These Terms of Service (hereinafter \"the Terms\") set forth the conditions for using SwimHub Scanner (hereinafter \"the Service\"). Users shall use the Service upon agreeing to the Terms.",
    article2Title: "Article 2 (Service Description)",
    article2Body:
      "The Service enables users to photograph or upload handwritten time sheets and automatically convert them to digital data using AI technology.",
    article3Title: "Article 3 (Accounts)",
    article3Items: [
      "Users log in to the Service using a Google or Apple account.",
      "Users are responsible for properly managing their accounts.",
      "Transfer or lending of accounts to third parties is prohibited.",
    ],
    article4Title: "Article 4 (Prohibited Activities)",
    article4Body: "Users shall not engage in the following activities:",
    article4Items: [
      "Actions that violate laws or public order",
      "Actions that interfere with the operation of the Service",
      "Actions that infringe the rights of other users or third parties",
      "Unauthorized access or attempts thereof",
      "Unauthorized commercial use of the Service",
      "Other actions deemed inappropriate by the operator",
    ],
    article5Title: "Article 5 (Paid Plans)",
    article5Items: [
      "The Service offers a paid plan (hereinafter \"Premium Plan\") with additional features.",
      "Premium Plan pricing includes a monthly plan (¥500/month) and an annual plan (¥5,000/year). Prices are subject to change with prior notice.",
      "Subscriptions automatically renew under the same terms unless cancelled at least 24 hours before the end of the current period.",
      "A 7-day free trial is available for first-time subscribers. If not cancelled during the trial, billing begins automatically after the trial ends.",
      "Web payments are processed via Stripe. Mobile app payments are processed via Apple App Store / Google Play in-app purchases (through RevenueCat).",
      "Cancellation is available at any time. For web subscriptions, cancel through the Stripe customer portal. For mobile, cancel through each store's subscription management. Premium features remain available until the end of the current billing period.",
      "Refunds are subject to the policies of each payment platform (Stripe, Apple App Store, Google Play).",
    ],
    article6Title: "Article 6 (Disclaimer)",
    article6Items: [
      "The accuracy of AI conversion results is not guaranteed. Users should verify results before use.",
      "The operator assumes no liability for damages arising from the use of the Service.",
      "The Service may be changed or suspended without prior notice.",
    ],
    article7Title: "Article 7 (Intellectual Property)",
    article7Body:
      "Intellectual property rights related to the Service belong to the operator. Rights to data uploaded by users belong to the users.",
    article8Title: "Article 8 (Changes to Terms)",
    article8Body:
      "The operator may change the Terms as necessary. Modified Terms take effect upon publication within the Service.",
    article9Title: "Article 9 (Governing Law & Jurisdiction)",
    article9Body:
      "The Terms are governed by Japanese law. The Tokyo District Court shall have exclusive jurisdiction over disputes related to the Service.",
  },

  privacy: {
    title: "Privacy Policy",
    metaTitle: "Privacy Policy | SwimHub Scanner",
    lastUpdated: "Last updated: February 23, 2026",
    sec1Title: "1. Introduction",
    sec1Body:
      "SwimHub Scanner (hereinafter \"the Service\") respects user privacy and strives to protect personal information. This policy explains how personal information is handled in the Service.",
    sec2Title: "2. Information We Collect",
    sec2Body: "The Service collects the following information:",
    sec2Items: [
      "Account information: Name, email address, and profile picture provided by Google or Apple account",
      "Upload data: Image data uploaded by users for scanning",
      "Usage data: Statistical information such as service usage dates and frequency",
    ],
    sec3Title: "3. Purpose of Use",
    sec3Body:
      "Collected information is used for the following purposes:",
    sec3Items: [
      "Provision and operation of the Service",
      "User authentication and account management",
      "AI-based time sheet analysis and conversion",
      "Service improvement and new feature development",
      "Usage analysis and statistical processing",
    ],
    sec4Title: "4. Payment Information Handling",
    sec4Body:
      "When using the paid plan (Premium Plan), payment processing is delegated to the following external services. The Service does not directly store credit card numbers or other payment information.",
    sec4Items: [
      "Stripe, Inc.: Handles subscription payment processing for web-based payments. Stripe provides a PCI DSS compliant payment infrastructure.",
      "RevenueCat, Inc.: Manages mobile app subscriptions. Payments via Apple App Store / Google Play are processed through RevenueCat.",
    ],
    sec4Note:
      "The Service only manages subscription status (active/inactive, plan type, expiration date, etc.). The actual payment information is managed by the above service providers.",
    sec5Title: "5. Third-Party Disclosure",
    sec5Body:
      "Personal information is not disclosed to third parties except in the following cases:",
    sec5Items: [
      "With user consent",
      "When required by law",
      "When necessary to protect life, body, or property",
      "Provision of information necessary for subscription management to payment processors",
    ],
    sec6Title: "6. External Services",
    sec6Body: "The Service uses the following external services:",
    sec6Items: [
      "Google / Apple Authentication: Login functionality",
      "Google AI (Gemini): Image analysis and data conversion",
      "Supabase: Data storage and management",
    ],
    sec6Note:
      "Please refer to each service provider's website for their respective privacy policies.",
    sec7Title: "7. Data Storage and Deletion",
    sec7Items: [
      "Uploaded image data is promptly deleted after processing.",
      "Account information is retained until the user deletes their account.",
      "Please contact us if you wish to delete your account.",
    ],
    sec8Title: "8. Cookies",
    sec8Body:
      "The Service uses cookies to maintain authentication state. You can disable cookies in your browser settings, but some features of the Service may become unavailable.",
    sec9Title: "9. Policy Changes",
    sec9Body:
      "This policy may be changed as necessary. Users will be notified within the Service of significant changes.",
    sec10Title: "10. Contact",
    sec10Body:
      "For inquiries regarding this policy, please contact us through the Service's contact feature.",
  },

  support: {
    title: "Support",
    metaTitle: "Support | SwimHub Scanner",
    faqTitle: "Frequently Asked Questions (FAQ)",
    faqItems: [
      {
        question: "Q. Scan results are not accurate",
        answer:
          "Please use clear images. We recommend images where handwritten text is clearly legible. When photographing, make sure the time sheet fills most of the image.",
      },
      {
        question: "Q. Is there a daily usage limit?",
        answer:
          "Free plan has a daily scan limit. Upgrade to Premium for unlimited scans.",
      },
      {
        question: "Q. What time sheet formats are supported?",
        answer:
          "The app supports the template format provided within the app. Templates can be downloaded as PDF or image from the scan screen.",
      },
      {
        question: "Q. I want to delete my account",
        answer:
          "You can delete your account from the account screen using the \"Delete Account\" button. All data will be permanently deleted.",
      },
    ],
    contactTitle: "Contact Us",
    contactBody:
      "If the above doesn't resolve your issue, please feel free to contact us at the email address below.",
    contactEmail: "support@swim-hub.app",
    responseNote: "We typically respond within 2 business days.",
  },
} as const;

export default en;
