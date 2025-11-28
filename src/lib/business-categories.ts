export interface BusinessCategory {
  id: string;
  name: string;
  icon: string;
  suggestions: string[];
  autoReplyTemplates: string[];
}

export const BUSINESS_CATEGORIES: Record<string, BusinessCategory> = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant/Cafe',
    icon: '🍴',
    suggestions: [
      'The food was absolutely delicious! Fresh ingredients and amazing flavors.',
      'Great ambiance and excellent service. Will definitely come back!',
      'Best dining experience in town! Highly recommend this place.',
      'Loved the menu variety and quality. Perfect for food lovers!',
      'Amazing taste and presentation. The chef is truly talented!'
    ],
    autoReplyTemplates: [
      'Thank you so much for your wonderful review! We\'re thrilled you enjoyed your meal.',
      'We appreciate your kind words! Looking forward to serving you again soon.',
      'Thank you for the 5-star review! Your support means the world to our team.'
    ]
  },
  salon: {
    id: 'salon',
    name: 'Salon/Spa',
    icon: '💇',
    suggestions: [
      'Amazing haircut and styling! The stylist really understood what I wanted.',
      'Best salon experience ever! Professional and friendly staff.',
      'Love my new look! Highly skilled and attentive service.',
      'Great atmosphere and excellent results. Will be back for sure!',
      'Perfect service from start to finish. Highly recommend!'
    ],
    autoReplyTemplates: [
      'Thank you for your lovely review! We\'re so glad you love your new look!',
      'We appreciate your kind words! Can\'t wait to see you again.',
      'Thank you for choosing us! Your satisfaction is our priority.'
    ]
  },
  autoRepair: {
    id: 'autoRepair',
    name: 'Auto Repair/Garage',
    icon: '🚗',
    suggestions: [
      'Fixed my car perfectly! Fast and reliable service.',
      'Honest pricing and quality work. Finally found a trustworthy mechanic!',
      'Great service and fair rates. My car runs like new!',
      'Professional and efficient. Highly recommend for all car repairs!',
      'Excellent work and transparent pricing. Will definitely return!'
    ],
    autoReplyTemplates: [
      'Thank you for trusting us with your vehicle! Drive safe!',
      'We appreciate your review! Happy to help keep your car running smoothly.',
      'Thanks for the 5 stars! We\'re here whenever you need us.'
    ]
  },
  retail: {
    id: 'retail',
    name: 'Retail Store',
    icon: '🛍️',
    suggestions: [
      'Great products and amazing staff! Found exactly what I was looking for.',
      'Excellent customer service and quality products. Will shop here again!',
      'Wide variety and fair prices. Highly recommend this store!',
      'Friendly staff and great shopping experience overall.',
      'Quality products and helpful recommendations. Very satisfied!'
    ],
    autoReplyTemplates: [
      'Thank you for shopping with us! We appreciate your business.',
      'We\'re thrilled you found what you needed! Come back soon!',
      'Thank you for the wonderful review! Happy shopping!'
    ]
  },
  medical: {
    id: 'medical',
    name: 'Medical/Healthcare',
    icon: '⚕️',
    suggestions: [
      'Excellent care and professional staff. Highly recommend!',
      'Great doctor with a caring approach. Very satisfied with the treatment.',
      'Clean facility and knowledgeable staff. Best healthcare experience!',
      'Professional service and thorough consultation. Thank you!',
      'Compassionate care and expert medical advice. Highly recommend!'
    ],
    autoReplyTemplates: [
      'Thank you for your review! Your health and satisfaction are our top priorities.',
      'We appreciate your trust in our care. Thank you for choosing us!',
      'Thank you for the kind words! We\'re here for all your healthcare needs.'
    ]
  },
  fitness: {
    id: 'fitness',
    name: 'Gym/Fitness Center',
    icon: '🏋️',
    suggestions: [
      'Amazing trainers and great equipment! Best gym in the area.',
      'Clean facility and motivating atmosphere. Love working out here!',
      'Excellent personal training and supportive community!',
      'Great value and professional staff. Highly recommend!',
      'Fantastic gym with all the equipment you need. Very satisfied!'
    ],
    autoReplyTemplates: [
      'Thank you for the review! Keep up the great work on your fitness journey!',
      'We\'re glad you\'re enjoying your workouts! See you at the gym!',
      'Thanks for being part of our fitness family! Keep crushing those goals!'
    ]
  },
  hotel: {
    id: 'hotel',
    name: 'Hotel/Accommodation',
    icon: '🏨',
    suggestions: [
      'Wonderful stay! Clean rooms and excellent service.',
      'Best hotel experience! Staff was incredibly helpful and friendly.',
      'Beautiful property and comfortable rooms. Highly recommend!',
      'Great location and amazing amenities. Will definitely stay again!',
      'Perfect hospitality and attention to detail. Five stars!'
    ],
    autoReplyTemplates: [
      'Thank you for staying with us! We hope to welcome you back soon!',
      'We\'re thrilled you enjoyed your stay! Thanks for the wonderful review!',
      'Thank you for choosing us! We look forward to your next visit!'
    ]
  },
  education: {
    id: 'education',
    name: 'School/Training Center',
    icon: '🎓',
    suggestions: [
      'Excellent teaching and supportive environment. Highly recommend!',
      'Great learning experience with knowledgeable instructors!',
      'Quality education and caring staff. Very satisfied!',
      'Professional training with practical knowledge. Worth every penny!',
      'Best educational experience! Learned so much here.'
    ],
    autoReplyTemplates: [
      'Thank you for your review! We\'re committed to your learning success!',
      'We appreciate your feedback! Keep up the great learning!',
      'Thank you for choosing us! We\'re here to support your educational journey!'
    ]
  },
  realEstate: {
    id: 'realEstate',
    name: 'Real Estate',
    icon: '🏡',
    suggestions: [
      'Excellent service! Made the home buying process smooth and easy.',
      'Professional and knowledgeable agent. Highly recommend!',
      'Great experience finding my dream home. Thank you!',
      'Trustworthy and responsive. Best real estate agent!',
      'Outstanding service and expert guidance throughout!'
    ],
    autoReplyTemplates: [
      'Thank you for trusting us with your real estate needs! Congratulations on your new home!',
      'We\'re thrilled we could help! Thank you for the wonderful review!',
      'Thank you for your business! We\'re here for all your future real estate needs!'
    ]
  },
  general: {
    id: 'general',
    name: 'General Business',
    icon: '💼',
    suggestions: [
      'Excellent service and professional staff! Highly recommend.',
      'Great experience overall. Will definitely come back!',
      'Quality service and fair pricing. Very satisfied!',
      'Professional and reliable. Best in the business!',
      'Outstanding service! Exceeded my expectations.'
    ],
    autoReplyTemplates: [
      'Thank you for your review! We appreciate your business!',
      'We\'re glad you had a great experience! Thank you!',
      'Thank you for the 5-star review! We look forward to serving you again!'
    ]
  }
};

export const getCategoryById = (id: string): BusinessCategory | undefined => {
  return BUSINESS_CATEGORIES[id];
};

export const getAllCategories = (): BusinessCategory[] => {
  return Object.values(BUSINESS_CATEGORIES);
};
